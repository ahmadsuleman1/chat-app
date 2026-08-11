import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Message from "../models/Message.js";

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

    // ===== PRIVATE MESSAGE (also supported over sockets directly) =====
    socket.on("send_message", async ({ conversationId, groupId, text }) => {
      try {
        if (!text || !text.trim()) return;

        const message = await Message.create({
          conversation: conversationId || null,
          group: groupId || null,
          sender: userId,
          text: text.trim(),
          status: "sent",
        });

        const populated = await message.populate(
          "sender",
          "name username avatar"
        );

        socket.emit("message_sent", populated);

        if (conversationId) {
          // Direct message: find the other participant via Conversation model
          const Conversation = (await import("../models/Conversation.js"))
            .default;
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
    });

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

    // ===== JOIN GROUP ROOMS (for group typing/broadcast convenience) =====
    socket.on("join_group", (groupId) => {
      socket.join(`group:${groupId}`);
    });

    socket.on("leave_group", (groupId) => {
      socket.leave(`group:${groupId}`);
    });

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
