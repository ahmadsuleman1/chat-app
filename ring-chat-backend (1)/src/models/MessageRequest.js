import mongoose from "mongoose";

const messageRequestSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// Prevent duplicate pending requests between the same pair
messageRequestSchema.index(
  { sender: 1, receiver: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

const MessageRequest = mongoose.model("MessageRequest", messageRequestSchema);

export default MessageRequest;
