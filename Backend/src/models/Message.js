import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      default: null,
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: function () {
        return this.type === "text";
      },
      trim: true,
      default: "",
    },
    type: {
      type: String,
      enum: ["text", "image", "location"],
      default: "text",
    },
    attachment: {
      type: String,
      default: null,
    },
    location: {
      lat: { type: Number },
      lng: { type: Number },
      label: { type: String, default: "" },
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    },
    // For group messages, track who has read the message
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // The message this one is replying to (same conversation/group)
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    // "Delete for everyone" - message stays in the DB but content is wiped
    isDeleted: {
      type: Boolean,
      default: false,
    },
    // "Delete for me" - hides the message only for these users
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

messageSchema.pre("validate", function (next) {
  if (!this.conversation && !this.group) {
    return next(
      new Error("Message must belong to either a conversation or a group")
    );
  }
  next();
});

messageSchema.index({ conversation: 1, createdAt: 1 });
messageSchema.index({ group: 1, createdAt: 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
