import express from "express";
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
router.post("/:id/messages", sendGroupMessage);

export default router;
