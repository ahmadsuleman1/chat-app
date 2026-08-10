import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";

const formatConversation = async (conversation, currentUserId) => {
  const otherUser = conversation.participants.find(
    (p) => p._id.toString() !== currentUserId
  );

  const unreadCount = await Message.countDocuments({
    conversation: conversation._id,
    sender: { $ne: currentUserId },
    status: { $ne: "read" },
  });

  return {
    id: conversation._id,
    user: otherUser
      ? {
          id: otherUser._id,
          name: otherUser.name,
          username: otherUser.username,
          avatarUrl: otherUser.avatar,
          status: otherUser.status,
          lastSeen: otherUser.lastSeen,
        }
      : null,
    lastMessage: conversation.lastMessage || null,
    unreadCount,
    updatedAt: conversation.updatedAt,
  };
};

// =========================
// GET ALL CONVERSATIONS
// =========================
export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.userId,
    })
      .populate("participants", "name username avatar status lastSeen")
      .populate({
        path: "lastMessage",
        select: "text sender status createdAt",
      })
      .sort({ updatedAt: -1 });

    const formatted = await Promise.all(
      conversations.map((c) => formatConversation(c, req.userId))
    );

    return res.status(200).json({
      success: true,
      conversations: formatted,
    });
  } catch (error) {
    console.error("Get conversations error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching conversations",
    });
  }
};

// =========================
// CREATE / OPEN CONVERSATION
// =========================
export const createConversation = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    if (userId === req.userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot start a conversation with yourself",
      });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [req.userId, userId], $size: 2 },
    }).populate("participants", "name username avatar status lastSeen");

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.userId, userId],
      });
      conversation = await conversation.populate(
        "participants",
        "name username avatar status lastSeen"
      );
    }

    const formatted = await formatConversation(conversation, req.userId);

    return res.status(201).json({
      success: true,
      conversation: formatted,
    });
  } catch (error) {
    console.error("Create conversation error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while creating conversation",
    });
  }
};
