import express from "express";
import multer from "multer";

import {
  getMessages,
  sendMessage,
  deleteMessage,
} from "../controllers/messageController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("audio/") ||
      file.mimetype.startsWith("video/") ||
      file.mimetype === "application/octet-stream"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only image, audio, or video files are allowed"));
    }
  },
});

router.use(protect);

router.get("/:conversationId", getMessages);
router.post(
  "/:conversationId",
  upload.single("file"),
  sendMessage
);
router.delete("/single/:messageId", deleteMessage);

export default router;