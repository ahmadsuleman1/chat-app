import express from "express";
import multer from "multer";
import {
  searchUsers,
  getUserById,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  updateProfile,
  uploadAvatar,
  changePassword,
  changeEmail,
  updatePrivacy,
} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";




router.use(protect);

router.get("/search", searchUsers);
router.get("/:userId", getUserById);
router.post("/:userId/follow", followUser);
router.delete("/:userId/follow", unfollowUser);
router.get("/:userId/followers", getFollowers);
router.get("/:userId/following", getFollowing);
router.patch("/me", updateProfile);
router.post("/me/avatar", upload.single("avatar"), uploadAvatar);
router.patch("/me/password", changePassword);
router.patch("/me/email", changeEmail);
router.patch("/me/privacy", updatePrivacy);

export default router;
