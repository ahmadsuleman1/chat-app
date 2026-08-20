import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Message from "../models/Message.js";
import CallLog from "../models/CallLog.js";

let io;

// userId -> socketId, kept in memory to route real-time events
const userSocketMap = {};

export const getReceiverSocketId = (userId) => userSocketMap[userId];

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "*",
      credentials: true,
    },
  });

  // Authenticate every socket connection using the same JWT issued at login
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("Authentication error: token missing"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (!user) {
        return next(new Error("Authentication error: user not found"));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error("Authentication error: invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.userId;
    userSocketMap[userId] = socket.id;

    console.log(`User connected: ${userId} (${socket.id})`);

    // Mark user online and broadcast presence
    await User.findByIdAndUpdate(userId, { status: "online" });
    io.emit("presence", { userId, status: "online", lastSeen: null });

    // ===== MESSAGE HANDLING (Text, Voice, and Reply Messages) =====
    socket.on(
      "send_message",
      async ({
        conversationId,
        groupId,
        text,
        type = "text",
        VoiceUrl,
        Voiceduration,
        attachment,
        replyTo,
      }) => {
        try {
          const isVoice = type === "voice" || type === "Voice";
          if (!isVoice && (!text || !text.trim())) return;
          if (isVoice && !VoiceUrl && !attachment) return;

          const voiceUrlVal = VoiceUrl || attachment || null;

          let replyToId = null;
          if (replyTo) {
            const replyMessage = await Message.findById(replyTo);
            if (
              replyMessage &&
              !replyMessage.isDeleted &&
              ((conversationId && replyMessage.conversation?.toString() === conversationId) ||
                (groupId && replyMessage.group?.toString() === groupId))
            ) {
              replyToId = replyMessage._id;
            }
          }

          const message = await Message.create({
            conversation: conversationId || null,
            group: groupId || null,
            sender: userId,
            text: isVoice ? text || "Voice note" : text.trim(),
            type: isVoice ? "voice" : "text",
            attachment: voiceUrlVal,
            VoiceUrl: isVoice ? voiceUrlVal : null,
            Voiceduration: isVoice ? Number(Voiceduration || 0) : null,
            replyTo: replyToId,
            status: "sent",
          });

          const populated = await message.populate([
            { path: "sender", select: "name username avatar" },
            {
              path: "replyTo",
              select: "text type attachment isDeleted sender",
              populate: { path: "sender", select: "name username" },
            },
          ]);

          socket.emit("message_sent", populated);

          if (conversationId) {
            const Conversation = (await import("../models/Conversation.js")).default;
            const conversation = await Conversation.findById(conversationId);
            if (conversation) {
              conversation.lastMessage = message._id;
              conversation.deletedFor = []; // a new message un-hides the chat for everyone
              await conversation.save();

              const receiverId = conversation.participants.find(
                (p) => p.toString() !== userId
              );
              if (receiverId) {
                const receiverSocketId = getReceiverSocketId(
                  receiverId.toString()
                );
                if (receiverSocketId) {
                  io.to(receiverSocketId).emit("receive_message", populated);
                  message.status = "delivered";
                  await message.save();
                  io.to(socket.id).emit("message_delivered", {
                    messageId: message._id,
                  });
                }
              }
            }
          } else if (groupId) {
            const Group = (await import("../models/Group.js")).default;
            const group = await Group.findById(groupId);
            if (group) {
              group.lastMessage = message._id;
              await group.save();

              group.members
                .filter((m) => m.toString() !== userId)
                .forEach((memberId) => {
                  const socketId = getReceiverSocketId(memberId.toString());
                  if (socketId) {
                    io.to(socketId).emit("receive_message", populated);
                  }
                });
            }
          }
        } catch (error) {
          console.error("Socket send_message error:", error);
          socket.emit("error", { message: "Failed to send message" });
        }
      }
    );

    // ===== VOICE RECORDING INDICATORS =====
    socket.on(
      "recording_voice",
      ({ conversationId, groupId, receiverId }) => {
        if (receiverId) {
          const receiverSocketId = getReceiverSocketId(receiverId);
          if (receiverSocketId) {
            io.to(receiverSocketId).emit("recording_voice", {
              conversationId,
              userId,
            });
          }
        } else if (groupId) {
          socket.to(`group:${groupId}`).emit("recording_voice", {
            groupId,
            userId,
          });
        }
      }
    );

    socket.on(
      "stop_recording_voice",
      ({ conversationId, groupId, receiverId }) => {
        if (receiverId) {
          const receiverSocketId = getReceiverSocketId(receiverId);
          if (receiverSocketId) {
            io.to(receiverSocketId).emit("stop_recording_voice", {
              conversationId,
              userId,
            });
          }
        } else if (groupId) {
          socket.to(`group:${groupId}`).emit("stop_recording_voice", {
            groupId,
            userId,
          });
        }
      }
    );

    // ===== TYPING INDICATOR =====
    socket.on("typing", ({ conversationId, groupId, receiverId }) => {
      if (receiverId) {
        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("typing", {
            conversationId,
            userId,
          });
        }
      } else if (groupId) {
        socket.to(`group:${groupId}`).emit("typing", { groupId, userId });
      }
    });

    socket.on("stop_typing", ({ conversationId, groupId, receiverId }) => {
      if (receiverId) {
        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("stop_typing", {
            conversationId,
            userId,
          });
        }
      } else if (groupId) {
        socket.to(`group:${groupId}`).emit("stop_typing", { groupId, userId });
      }
    });

    // ===== JOIN / LEAVE GROUP ROOMS =====
    socket.on("join_group", (groupId) => {
      socket.join(`group:${groupId}`);
    });

    socket.on("leave_group", (groupId) => {
      socket.leave(`group:${groupId}`);
    });

    // ===== WEBRTC VOICE CALL SIGNALING =====

    /**
     * Initiate Voice Call
     * Payload: { targetUserId, groupId, offer, callType: 'voice', roomId, conversationId }
     */
    const handleCallInitiate = async (data) => {
      const {
        targetUserId,
        groupId,
        offer,
        callType = "voice",
        roomId,
        conversationId,
      } = data;

      const callerUser = await User.findById(userId).select(
        "name username avatar status"
      );

      const payload = {
        caller: {
          _id: userId,
          name: callerUser?.name || "Unknown",
          username: callerUser?.username || "unknown",
          avatar: callerUser?.avatar || null,
        },
        offer,
        callType,
        roomId: roomId || `call_${userId}_${Date.now()}`,
        conversationId,
        groupId,
      };

      if (targetUserId) {
        const receiverSocketId = getReceiverSocketId(targetUserId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("call:incoming", payload);
          io.to(receiverSocketId).emit("call_received", payload); // Alias
        } else {
          // Receiver offline or unavailable -> record missed call
          socket.emit("call:unavailable", {
            targetUserId,
            reason: "User is offline",
          });
          await CallLog.create({
            caller: userId,
            receiver: targetUserId,
            type: callType,
            status: "missed",
          });
        }
      } else if (groupId) {
        socket.to(`group:${groupId}`).emit("call:incoming", payload);
        socket.to(`group:${groupId}`).emit("call_received", payload);
      }
    };

    socket.on("call:initiate", handleCallInitiate);
    socket.on("call_user", handleCallInitiate); // Alias

    /**
     * Accept Voice Call
     * Payload: { callerId, answer, roomId }
     */
    const handleCallAccept = (data) => {
      const { callerId, answer, roomId } = data;
      const callerSocketId = getReceiverSocketId(callerId);

      const payload = {
        answer,
        roomId,
        acceptedBy: userId,
      };

      if (callerSocketId) {
        io.to(callerSocketId).emit("call:accepted", payload);
        io.to(callerSocketId).emit("call_accepted", payload); // Alias
      }
    };

    socket.on("call:accept", handleCallAccept);
    socket.on("answer_call", handleCallAccept); // Alias

    /**
     * Reject Voice Call
     * Payload: { callerId, reason, roomId }
     */
    const handleCallReject = async (data) => {
      const { callerId, reason = "declined", roomId } = data;
      const callerSocketId = getReceiverSocketId(callerId);

      const payload = {
        reason,
        roomId,
        rejectedBy: userId,
      };

      if (callerSocketId) {
        io.to(callerSocketId).emit("call:rejected", payload);
        io.to(callerSocketId).emit("call_rejected", payload);
      }

      await CallLog.create({
        caller: callerId,
        receiver: userId,
        type: "voice",
        status: reason === "busy" ? "busy" : "rejected",
      });
    };

    socket.on("call:reject", handleCallReject);
    socket.on("reject_call", handleCallReject); // Alias

    /**
     * Relaying ICE Candidate
     * Payload: { targetUserId, candidate, roomId }
     */
    const handleIceCandidate = (data) => {
      const { targetUserId, candidate, roomId } = data;
      const targetSocketId = getReceiverSocketId(targetUserId);

      if (targetSocketId) {
        io.to(targetSocketId).emit("call:ice_candidate", {
          candidate,
          senderId: userId,
          roomId,
        });
        io.to(targetSocketId).emit("ice_candidate", {
          candidate,
          senderId: userId,
          roomId,
        });
      }
    };

    socket.on("call:ice_candidate", handleIceCandidate);
    socket.on("ice_candidate", handleIceCandidate); // Alias

    /**
     * Toggle Mute in Call
     * Payload: { targetUserId, isMuted, roomId }
     */
    socket.on("call:toggle_mute", ({ targetUserId, isMuted, roomId }) => {
      const targetSocketId = getReceiverSocketId(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("call:mute_changed", {
          userId,
          isMuted,
          roomId,
        });
      }
    });

    /**
     * End Voice Call
     * Payload: { targetUserId, groupId, roomId, duration, startedAt }
     */
    const handleCallEnd = async (data) => {
      const { targetUserId, groupId, roomId, duration = 0, startedAt } = data;

      const payload = {
        endedBy: userId,
        roomId,
        duration,
      };

      if (targetUserId) {
        const targetSocketId = getReceiverSocketId(targetUserId);
        if (targetSocketId) {
          io.to(targetSocketId).emit("call:ended", payload);
          io.to(targetSocketId).emit("call_ended", payload);
        }

        // Save CallLog entry
        if (duration > 0 || startedAt) {
          await CallLog.create({
            caller: userId,
            receiver: targetUserId,
            type: "voice",
            status: "completed",
            duration: Number(duration || 0),
            startedAt: startedAt ? new Date(startedAt) : new Date(),
            endedAt: new Date(),
          });
        }
      } else if (groupId) {
        socket.to(`group:${groupId}`).emit("call:ended", payload);
        socket.to(`group:${groupId}`).emit("call_ended", payload);
      }
    };

    socket.on("call:end", handleCallEnd);
    socket.on("end_call", handleCallEnd); // Alias

    // ===== MESSAGE STATUS UPDATES =====
    socket.on("message_read", async ({ messageId }) => {
      try {
        const message = await Message.findByIdAndUpdate(
          messageId,
          { status: "read" },
          { new: true }
        );
        if (message) {
          const senderSocketId = getReceiverSocketId(
            message.sender.toString()
          );
          if (senderSocketId) {
            io.to(senderSocketId).emit("message_read", { messageId });
          }
        }
      } catch (error) {
        console.error("Socket message_read error:", error);
      }
    });

    // ===== DISCONNECT =====
    socket.on("disconnect", async () => {
      console.log(`User disconnected: ${userId} (${socket.id})`);
      delete userSocketMap[userId];

      const lastSeen = new Date();
      await User.findByIdAndUpdate(userId, {
        status: "offline",
        lastSeen,
      });

      io.emit("presence", { userId, status: "offline", lastSeen });
    });
  });

  return io;
};

export const getIO = () => io;
