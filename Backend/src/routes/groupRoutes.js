import express from "express";
import multer from "multer";
import {
  createGroup,
  getGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  addMember,
  removeMember,
  leaveGroup,
  promoteAdmin,
  demoteAdmin,
  getGroupMessages,
  sendGroupMessage,
} from "../controllers/groupController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

router.use(protect);

router.post("/", createGroup);
router.get("/", getGroups);
router.get("/:id", getGroupById);
router.patch("/:id", updateGroup);
router.delete("/:id", deleteGroup);

router.post("/:id/members", addMember);
router.delete("/:id/members/:userId", removeMember);
router.post("/:id/leave", leaveGroup);

router.patch("/:id/admins/:userId", promoteAdmin);
router.delete("/:id/admins/:userId", demoteAdmin);

router.get("/:id/messages", getGroupMessages);
router.post("/:id/messages", upload.single("media"), sendGroupMessage);

export default router;
