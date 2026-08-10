import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/User.js";
import cloudinary from "../config/cloudinary.js";
import { sendVerificationEmail } from "../utils/sendEmail.js";

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  username: user.username,
  email: user.email,
  phoneNumber: user.phoneNumber,
  dateOfBirth: user.dateOfBirth,
  bio: user.bio,
  avatar: user.avatar,
  status: user.status,
  lastSeen: user.lastSeen,
  followers: user.followers,
  following: user.following,
  emailVerified: user.emailVerified,
  allowGroupInvites: user.allowGroupInvites,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// Lightweight version for search results - no email/phone/DOB etc.
const searchResultUser = (user) => ({
  id: user._id,
  name: user.name,
  username: user.username,
  avatar: user.avatar,
  bio: user.bio,
  status: user.status,
});

// =========================
// SEARCH USERS BY USERNAME
// =========================
export const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const users = await User.find({
      username: { $regex: q.trim(), $options: "i" },
      _id: { $ne: req.userId },
    })
      .limit(20)
      .select("name username avatar bio status");

    return res.status(200).json({
      success: true,
      users: users.map(searchResultUser),
    });
  } catch (error) {
    console.error("Search users error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while searching users",
    });
  }
};

// =========================
// FOLLOW USER
// =========================
export const followUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId === req.userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot follow yourself",
      });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const currentUser = await User.findById(req.userId);

    const alreadyFollowing = currentUser.following.some(
      (id) => id.toString() === userId
    );

    if (alreadyFollowing) {
      return res.status(409).json({
        success: false,
        message: "You are already following this user",
      });
    }

    currentUser.following.push(userId);
    targetUser.followers.push(req.userId);

    await currentUser.save();
    await targetUser.save();

    return res.status(200).json({
      success: true,
      message: "User followed successfully",
    });
  } catch (error) {
    console.error("Follow user error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while following user",
    });
  }
};

// =========================
// UNFOLLOW USER
// =========================
export const unfollowUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const currentUser = await User.findById(req.userId);

    currentUser.following = currentUser.following.filter(
      (id) => id.toString() !== userId
    );
    targetUser.followers = targetUser.followers.filter(
      (id) => id.toString() !== req.userId
    );

    await currentUser.save();
    await targetUser.save();

    return res.status(200).json({
      success: true,
      message: "User unfollowed successfully",
    });
  } catch (error) {
    console.error("Unfollow user error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while unfollowing user",
    });
  }
};

// =========================
// GET FOLLOWERS
// =========================
export const getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).populate(
      "followers",
      "name username avatar bio status"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      followers: user.followers.map(searchResultUser),
    });
  } catch (error) {
    console.error("Get followers error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching followers",
    });
  }
};

// =========================
// GET FOLLOWING
// =========================
export const getFollowing = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).populate(
      "following",
      "name username avatar bio status"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      following: user.following.map(searchResultUser),
    });
  } catch (error) {
    console.error("Get following error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching following",
    });
  }
};

// =========================
// UPDATE PROFILE (PATCH /api/users/me)
// =========================
export const updateProfile = async (req, res) => {
  try {
    const { name, username, bio } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Name cannot be empty",
        });
      }
      user.name = name.trim();
    }

    if (username !== undefined) {
      const newUsername = username.trim().toLowerCase();

      if (!newUsername) {
        return res.status(400).json({
          success: false,
          message: "Username cannot be empty",
        });
      }

      const existingUser = await User.findOne({
        username: newUsername,
        _id: { $ne: req.userId },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Username is already taken",
        });
      }

      user.username = newUsername;
    }

    if (bio !== undefined) {
      user.bio = bio.trim();
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating profile",
    });
  }
};

// =========================
// CHANGE PASSWORD (PATCH /api/users/me/password)
// =========================
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters long",
      });
    }

    const user = await User.findById(req.userId).select("+password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating password",
    });
  }
};

// =========================
// CHANGE EMAIL (PATCH /api/users/me/email)
// Requires current password. New email must be re-verified before it's
// trusted, same as a fresh signup.
// =========================
export const changeEmail = async (req, res) => {
  try {
    const { newEmail, currentPassword } = req.body;

    if (!newEmail || !currentPassword) {
      return res.status(400).json({
        success: false,
        message: "New email and current password are required",
      });
    }

    const normalizedEmail = newEmail.trim().toLowerCase();

    const user = await User.findById(req.userId).select("+password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    if (normalizedEmail === user.email) {
      return res.status(400).json({
        success: false,
        message: "That is already your current email",
      });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "That email is already in use",
      });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    user.email = normalizedEmail;
    user.emailVerified = false;
    user.emailVerificationToken = hashToken(verificationToken);
    user.emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;
    try {
      await sendVerificationEmail(user.email, user.name, verificationUrl);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError.message);
    }

    return res.status(200).json({
      success: true,
      message: "Email updated. Please verify your new email address.",
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Change email error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating email",
    });
  }
};

// =========================
// UPDATE PRIVACY SETTINGS (PATCH /api/users/me/privacy)
// =========================
export const updatePrivacy = async (req, res) => {
  try {
    const { allowGroupInvites } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (allowGroupInvites !== undefined) {
      user.allowGroupInvites = Boolean(allowGroupInvites);
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Privacy settings updated",
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Update privacy error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating privacy settings",
    });
  }
};
export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided",
      });
    }

    const uploadFromBuffer = () =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "ring-chat/avatars", resource_type: "image" },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });

    const result = await uploadFromBuffer();

    const user = await User.findByIdAndUpdate(
      req.userId,
      { avatar: result.secure_url },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Avatar uploaded successfully",
      avatar: user.avatar,
    });
  } catch (error) {
    console.error("Upload avatar error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while uploading avatar",
    });
  }
};
