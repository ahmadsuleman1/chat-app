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

    const query = { conversation: conversationId };
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
// SEND MESSAGE
// =========================
export const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { text, type, location } = req.body;

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
      status: "sent",
    });

    conversation.lastMessage = message._id;
    conversation.deletedFor = []; // a new message un-hides the chat for everyone
    await conversation.save();

    const populatedMessage = await message.populate(
      "sender",
      "name username avatar"
    );

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
