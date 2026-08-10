import express from "express";
import multer from "multer";
import {
  searchUsers,
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

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

router.use(protect);

router.get("/search", searchUsers);
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
