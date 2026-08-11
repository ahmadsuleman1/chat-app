import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import cloudinary from "../config/cloudinary.js";
import { getReceiverSocketId } from "../socket/socket.js";

/**
 * Upload a buffer to Cloudinary and return the secure URL.
 */
const uploadToCloudinary = (buffer, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });

// =========================
// GET MESSAGES FOR A CONVERSATION (paginated, newest page first)
// =========================
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { before, limit } = req.query;
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 30, 1), 100);

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === req.userId
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "You are not a participant of this conversation",
      });
    }

    const query = {
      conversation: conversationId,
      deletedFor: { $ne: req.userId },
    };
    if (before) {
      const beforeDate = new Date(before);
      if (!isNaN(beforeDate.getTime())) {
        query.createdAt = { $lt: beforeDate };
      }
    }

    // Fetch newest-first so "before" pagination is cheap, grab one extra to
    // know if there's another page, then flip back to chronological order.
    const page = await Message.find(query)
      .populate("sender", "name username avatar")
      .populate({
        path: "replyTo",
        select: "text type attachment isDeleted sender",
        populate: { path: "sender", select: "name username" },
      })
      .sort({ createdAt: -1 })
      .limit(pageSize + 1);

    const hasMore = page.length > pageSize;
    const pageMessages = (hasMore ? page.slice(0, pageSize) : page).reverse();

    return res.status(200).json({
      success: true,
      messages: pageMessages,
      hasMore,
    });
  } catch (error) {
    console.error("Get messages error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching messages",
    });
  }
};

// =========================
// DELETE MESSAGE (works for both DM and group messages)
// mode=me        -> hides the message only for the requesting user
// mode=everyone  -> sender-only, wipes content for everyone (soft delete)
// =========================
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const mode = req.query.mode === "everyone" ? "everyone" : "me";

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    let isAuthorized = false;
    let groupMemberIds = [];

    if (message.conversation) {
      const conversation = await Conversation.findById(message.conversation);
      isAuthorized =
        !!conversation &&
        conversation.participants.some((p) => p.toString() === req.userId);
    } else if (message.group) {
      const Group = (await import("../models/Group.js")).default;
      const group = await Group.findById(message.group);
      isAuthorized = !!group && group.members.some((m) => m.toString() === req.userId);
      groupMemberIds = group ? group.members.map((m) => m.toString()) : [];
    }

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: "You can't delete this message",
      });
    }

    const isSender = message.sender.toString() === req.userId;

    if (mode === "everyone") {
      if (!isSender) {
        return res.status(403).json({
          success: false,
          message: "Only the sender can delete a message for everyone",
        });
      }

      message.isDeleted = true;
      message.text = "";
      message.attachment = null;
      message.location = undefined;
      await message.save();

      const io = req.app.get("io");
      if (io) {
        if (message.conversation) {
          const conversation = await Conversation.findById(message.conversation);
          const receiverId = conversation?.participants.find(
            (p) => p.toString() !== req.userId
          );
          const receiverSocketId =
            receiverId && getReceiverSocketId(receiverId.toString());
          if (receiverSocketId) {
            io.to(receiverSocketId).emit("message_deleted", {
              messageId,
              mode: "everyone",
              conversationId: message.conversation.toString(),
            });
          }
        } else if (message.group) {
          groupMemberIds
            .filter((id) => id !== req.userId)
            .forEach((id) => {
              const socketId = getReceiverSocketId(id);
              if (socketId) {
                io.to(socketId).emit("message_deleted", {
                  messageId,
                  mode: "everyone",
                  groupId: message.group.toString(),
                });
              }
            });
        }
      }
    } else {
      // delete for me only - just hide it from this user's view
      if (!message.deletedFor.some((id) => id.toString() === req.userId)) {
        message.deletedFor.push(req.userId);
        await message.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: "Message deleted",
      mode,
      messageId,
    });
  } catch (error) {
    console.error("Delete message error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while deleting message",
    });
  }
};

// =========================
// SEND MESSAGE
// =========================
export const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { text, type, location, replyTo } = req.body;

    const isLocation = type === "location";
    const isImage = type === "image";

    // ---- validation ----
    if (isLocation) {
      const loc = typeof location === "string" ? JSON.parse(location) : location;
      if (!loc || typeof loc.lat !== "number" || typeof loc.lng !== "number") {
        return res.status(400).json({
          success: false,
          message: "A valid location (lat, lng) is required",
        });
      }
    } else if (isImage) {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Image file is required for image messages",
        });
      }
    } else if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message text is required",
      });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === req.userId
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "You are not a participant of this conversation",
      });
    }

    // ---- upload image if present ----
    let attachmentUrl = null;
    if (isImage && req.file) {
      const result = await uploadToCloudinary(
        req.file.buffer,
        "ring-chat/messages"
      );
      attachmentUrl = result.secure_url;
    }

    // ---- resolve reply target (must belong to the same conversation) ----
    let replyToId = null;
    if (replyTo) {
      const replyMessage = await Message.findById(replyTo);
      if (
        replyMessage &&
        replyMessage.conversation?.toString() === conversationId &&
        !replyMessage.isDeleted
      ) {
        replyToId = replyMessage._id;
      }
    }

    // ---- build the message doc ----
    const parsedLocation =
      isLocation && location
        ? typeof location === "string"
          ? JSON.parse(location)
          : location
        : undefined;

    const message = await Message.create({
      conversation: conversationId,
      sender: req.userId,
      type: isLocation ? "location" : isImage ? "image" : "text",
      text: isLocation || isImage ? (text || "") : text.trim(),
      attachment: attachmentUrl,
      location: isLocation
        ? { lat: parsedLocation.lat, lng: parsedLocation.lng, label: parsedLocation.label || "" }
        : undefined,
      replyTo: replyToId,
      status: "sent",
    });

    conversation.lastMessage = message._id;
    conversation.deletedFor = []; // a new message un-hides the chat for everyone
    await conversation.save();

    const populatedMessage = await message.populate([
      { path: "sender", select: "name username avatar" },
      {
        path: "replyTo",
        select: "text type attachment isDeleted sender",
        populate: { path: "sender", select: "name username" },
      },
    ]);

    // Real-time delivery via Socket.IO
    const io = req.app.get("io");
    const receiverId = conversation.participants.find(
      (p) => p.toString() !== req.userId
    );

    if (io && receiverId) {
      const receiverSocketId = getReceiverSocketId(receiverId.toString());
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receive_message", populatedMessage);
        message.status = "delivered";
        await message.save();
      }
    }

    return res.status(201).json({
      success: true,
      message: populatedMessage,
    });
  } catch (error) {
    console.error("Send message error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while sending message",
    });
  }
};
