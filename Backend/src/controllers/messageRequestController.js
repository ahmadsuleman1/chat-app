import MessageRequest from "../models/MessageRequest.js";
import Conversation from "../models/Conversation.js";
import User from "../models/User.js";

// =========================
// SEND MESSAGE REQUEST
// =========================
export const sendRequest = async (req, res) => {
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
        message: "You cannot send a message request to yourself",
      });
    }

    const receiver = await User.findById(userId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // If a conversation already exists between them, no request is needed
    const existingConversation = await Conversation.findOne({
      participants: { $all: [req.userId, userId], $size: 2 },
    });

    if (existingConversation) {
      return res.status(409).json({
        success: false,
        message: "A conversation already exists with this user",
      });
    }

    const existingPending = await MessageRequest.findOne({
      sender: req.userId,
      receiver: userId,
      status: "pending",
    });

    if (existingPending) {
      return res.status(409).json({
        success: false,
        message: "A pending request already exists for this user",
      });
    }

    const request = await MessageRequest.create({
      sender: req.userId,
      receiver: userId,
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Message request sent",
      request,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A pending request already exists for this user",
      });
    }
    console.error("Send message request error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while sending message request",
    });
  }
};

// =========================
// GET MESSAGE REQUESTS (incoming, for logged-in user)
// =========================
export const getRequests = async (req, res) => {
  try {
    const requests = await MessageRequest.find({
      receiver: req.userId,
      status: "pending",
    })
      .populate("sender", "name username avatar bio")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error("Get message requests error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching message requests",
    });
  }
};

// =========================
// ACCEPT MESSAGE REQUEST
// =========================
export const acceptRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await MessageRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Message request not found",
      });
    }

    if (request.receiver.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: "Only the receiver can accept this request",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Request has already been ${request.status}`,
      });
    }

    request.status = "accepted";
    await request.save();

    let conversation = await Conversation.findOne({
      participants: {
        $all: [request.sender, request.receiver],
        $size: 2,
      },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [request.sender, request.receiver],
      });
    }

    return res.status(200).json({
      success: true,
      message: "Message request accepted",
      conversation,
    });
  } catch (error) {
    console.error("Accept message request error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while accepting message request",
    });
  }
};

// =========================
// REJECT MESSAGE REQUEST
// =========================
export const rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await MessageRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Message request not found",
      });
    }

    if (request.receiver.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: "Only the receiver can reject this request",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Request has already been ${request.status}`,
      });
    }

    request.status = "rejected";
    await request.save();

    return res.status(200).json({
      success: true,
      message: "Message request rejected",
    });
  } catch (error) {
    console.error("Reject message request error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while rejecting message request",
    });
  }
};
