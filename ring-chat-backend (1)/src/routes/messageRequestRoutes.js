import express from "express";
import {
  sendRequest,
  getRequests,
  acceptRequest,
  rejectRequest,
} from "../controllers/messageRequestController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/", sendRequest);
router.get("/", getRequests);
router.post("/:id/accept", acceptRequest);
router.post("/:id/reject", rejectRequest);

export default router;
