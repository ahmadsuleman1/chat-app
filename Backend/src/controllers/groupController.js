import Group from "../models/Group.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import cloudinary from "../config/cloudinary.js";
import { getReceiverSocketId, getIO } from "../socket/socket.js";

const uploadToCloudinary = (buffer, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });

const isAdmin = (group, userId) =>
  group.admins.some((a) => a.toString() === userId.toString());

const isMember = (group, userId) =>
  group.members.some((m) => m.toString() === userId.toString());

// Normalizes a populated group document into the shape the frontend expects.
const formatGroup = (group, currentUserId) => {
  const members = (group.members || []).map((m) => ({
    id: m._id,
    name: m.name,
    username: m.username,
    avatarUrl: m.avatar,
    status: m.status,
    isAdmin: group.admins.some((a) => a.toString() === m._id.toString()),
  }));

  const lastMessage = group.lastMessage
    ? {
        text: group.lastMessage.text,
        type: group.lastMessage.type,
        senderId: group.lastMessage.sender,
        createdAt: group.lastMessage.createdAt,
      }
    : null;

  return {
    id: group._id,
    name: group.name,
    description: group.description,
    avatarUrl: group.avatarUrl,
    createdBy: group.createdBy,
    isAdmin: isAdmin(group, currentUserId),
    isCreator: group.createdBy.toString() === currentUserId.toString(),
    memberCount: members.length,
    members,
    lastMessage,
    updatedAt: group.updatedAt,
  };
};

const populateGroup = (query) =>
  query
    .populate("members admins createdBy", "name username avatar status")
    .populate({ path: "lastMessage", select: "text type sender createdAt" });

// Removes a member (and their admin rights) from a group in-memory, then
// re-balances admins/ownership so the group never ends up admin-less while
// members remain. Caller is responsible for saving / deleting the group.
const departMember = (group, userId) => {
  group.members = group.members.filter((m) => m.toString() !== userId.toString());
  group.admins = group.admins.filter((a) => a.toString() !== userId.toString());

  if (group.members.length === 0) {
    return { shouldDelete: true };
  }

  if (group.admins.length === 0) {
    group.admins.push(group.members[0]);
  }

  if (group.createdBy.toString() === userId.toString()) {
    group.createdBy = group.admins[0];
  }

  return { shouldDelete: false };
};

// =========================
// CREATE GROUP
// =========================
export const createGroup = async (req, res) => {
  try {
    const { name, description, members } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Group name is required",
      });
    }

    const requestedIds = Array.from(
      new Set((Array.isArray(members) ? members : []).map(String))
    ).filter((id) => id !== req.userId);

    let skipped = [];
    let allowedIds = requestedIds;

    if (requestedIds.length > 0) {
      const candidates = await User.find({ _id: { $in: requestedIds } }).select(
        "name username allowGroupInvites"
      );

      allowedIds = candidates
        .filter((u) => u.allowGroupInvites !== false)
        .map((u) => u._id.toString());

      skipped = candidates
        .filter((u) => u.allowGroupInvites === false)
        .map((u) => ({ id: u._id, name: u.name, username: u.username }));
    }

    const uniqueMembers = Array.from(new Set([req.userId, ...allowedIds]));

    const group = await Group.create({
      name: name.trim(),
      description: description ? description.trim() : "",
      createdBy: req.userId,
      members: uniqueMembers,
      admins: [req.userId],
    });

    const populated = await populateGroup(Group.findById(group._id));

    return res.status(201).json({
      success: true,
      group: formatGroup(populated, req.userId),
      skippedMembers: skipped,
    });
  } catch (error) {
    console.error("Create group error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while creating group",
    });
  }
};

// =========================
// GET ALL GROUPS FOR CURRENT USER
// =========================
export const getGroups = async (req, res) => {
  try {
    const groups = await populateGroup(
      Group.find({ members: req.userId }).sort({ updatedAt: -1 })
    );

    return res.status(200).json({
      success: true,
      groups: groups.map((g) => formatGroup(g, req.userId)),
    });
  } catch (error) {
    console.error("Get groups error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching groups",
    });
  }
};

// =========================
// GET GROUP BY ID
// =========================
export const getGroupById = async (req, res) => {
  try {
    const { id } = req.params;

    const group = await populateGroup(Group.findById(id));

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    if (!isMember(group, req.userId)) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this group",
      });
    }

    return res.status(200).json({
      success: true,
      group: formatGroup(group, req.userId),
    });
  } catch (error) {
    console.error("Get group error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching group",
    });
  }
};

// =========================
// UPDATE GROUP (name, description, avatarUrl)
// =========================
export const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, avatarUrl } = req.body;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    if (!isAdmin(group, req.userId)) {
      return res.status(403).json({
        success: false,
        message: "Only group admins can update group settings",
      });
    }

    if (name !== undefined) group.name = name.trim();
    if (description !== undefined) group.description = description.trim();
    if (avatarUrl !== undefined) group.avatarUrl = avatarUrl;

    await group.save();

    const populated = await populateGroup(Group.findById(group._id));

    return res.status(200).json({
      success: true,
      message: "Group updated successfully",
      group: formatGroup(populated, req.userId),
    });
  } catch (error) {
    console.error("Update group error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating group",
    });
  }
};

// =========================
// DELETE GROUP (creator only)
// =========================
export const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    if (group.createdBy.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: "Only the group creator can delete this group",
      });
    }

    await Message.deleteMany({ group: id });
    await group.deleteOne();

    const io = getIO();
    if (io) {
      group.members.forEach((memberId) => {
        const socketId = getReceiverSocketId(memberId.toString());
        if (socketId) io.to(socketId).emit("group_deleted", { groupId: id });
      });
    }

    return res.status(200).json({
      success: true,
      message: "Group deleted successfully",
    });
  } catch (error) {
    console.error("Delete group error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while deleting group",
    });
  }
};

// =========================
// ADD MEMBER (admin only, respects target's group-invite privacy setting)
// =========================
export const addMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    if (!isAdmin(group, req.userId)) {
      return res.status(403).json({
        success: false,
        message: "Only group admins can add members",
      });
    }

    if (isMember(group, userId)) {
      return res.status(409).json({
        success: false,
        message: "User is already a member of this group",
      });
    }

    const targetUser = await User.findById(userId).select("allowGroupInvites");
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (targetUser.allowGroupInvites === false) {
      return res.status(403).json({
        success: false,
        message: "This user doesn't allow being added to groups directly",
      });
    }

    group.members.push(userId);
    await group.save();

    const populated = await populateGroup(Group.findById(group._id));

    return res.status(200).json({
      success: true,
      message: "Member added successfully",
      group: formatGroup(populated, req.userId),
    });
  } catch (error) {
    console.error("Add member error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while adding member",
    });
  }
};

// =========================
// REMOVE MEMBER (admin kicking someone else - not self)
// =========================
export const removeMember = async (req, res) => {
  try {
    const { id, userId } = req.params;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    if (userId === req.userId) {
      return res.status(400).json({
        success: false,
        message: "Use the leave-group action to remove yourself",
      });
    }

    if (!isAdmin(group, req.userId)) {
      return res.status(403).json({
        success: false,
        message: "Only group admins can remove other members",
      });
    }

    if (!isMember(group, userId)) {
      return res.status(404).json({
        success: false,
        message: "That user is not a member of this group",
      });
    }

    const { shouldDelete } = departMember(group, userId);

    if (shouldDelete) {
      await Message.deleteMany({ group: id });
      await group.deleteOne();
      return res.status(200).json({
        success: true,
        message: "Member removed and group deleted (no members left)",
        deleted: true,
      });
    }

    await group.save();
    const populated = await populateGroup(Group.findById(group._id));

    const io = getIO();
    const removedSocketId = getReceiverSocketId(userId);
    if (io && removedSocketId) {
      io.to(removedSocketId).emit("removed_from_group", { groupId: id });
    }

    return res.status(200).json({
      success: true,
      message: "Member removed successfully",
      group: formatGroup(populated, req.userId),
    });
  } catch (error) {
    console.error("Remove member error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while removing member",
    });
  }
};

// =========================
// LEAVE GROUP (self)
// =========================
export const leaveGroup = async (req, res) => {
  try {
    const { id } = req.params;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    if (!isMember(group, req.userId)) {
      return res.status(400).json({
        success: false,
        message: "You are not a member of this group",
      });
    }

    const { shouldDelete } = departMember(group, req.userId);

    if (shouldDelete) {
      await Message.deleteMany({ group: id });
      await group.deleteOne();
      return res.status(200).json({
        success: true,
        message: "You left the group. It has been deleted (no members left).",
        deleted: true,
      });
    }

    await group.save();

    const io = getIO();
    if (io) {
      group.members.forEach((memberId) => {
        const socketId = getReceiverSocketId(memberId.toString());
        if (socketId) {
          io.to(socketId).emit("member_left_group", {
            groupId: id,
            userId: req.userId,
          });
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: "You have left the group",
    });
  } catch (error) {
    console.error("Leave group error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while leaving the group",
    });
  }
};

// =========================
// PROMOTE MEMBER TO ADMIN (admin only)
// =========================
export const promoteAdmin = async (req, res) => {
  try {
    const { id, userId } = req.params;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found" });
    }

    if (!isAdmin(group, req.userId)) {
      return res.status(403).json({
        success: false,
        message: "Only group admins can promote members",
      });
    }

    if (!isMember(group, userId)) {
      return res.status(404).json({
        success: false,
        message: "That user is not a member of this group",
      });
    }

    if (!isAdmin(group, userId)) {
      group.admins.push(userId);
      await group.save();
    }

    const populated = await populateGroup(Group.findById(group._id));

    return res.status(200).json({
      success: true,
      message: "Member promoted to admin",
      group: formatGroup(populated, req.userId),
    });
  } catch (error) {
    console.error("Promote admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while promoting member",
    });
  }
};

// =========================
// DEMOTE ADMIN BACK TO MEMBER (admin only, can't leave zero admins)
// =========================
export const demoteAdmin = async (req, res) => {
  try {
    const { id, userId } = req.params;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found" });
    }

    if (!isAdmin(group, req.userId)) {
      return res.status(403).json({
        success: false,
        message: "Only group admins can demote other admins",
      });
    }

    if (!isAdmin(group, userId)) {
      return res.status(400).json({
        success: false,
        message: "That user is not an admin",
      });
    }

    if (group.admins.length <= 1) {
      return res.status(400).json({
        success: false,
        message: "A group must have at least one admin",
      });
    }

    group.admins = group.admins.filter((a) => a.toString() !== userId);
    await group.save();

    const populated = await populateGroup(Group.findById(group._id));

    return res.status(200).json({
      success: true,
      message: "Admin rights removed",
      group: formatGroup(populated, req.userId),
    });
  } catch (error) {
    console.error("Demote admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while demoting admin",
    });
  }
};

// =========================
// GET GROUP MESSAGES
// =========================
export const getGroupMessages = async (req, res) => {
  try {
    const { id } = req.params;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    if (!isMember(group, req.userId)) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this group",
      });
    }

    const messages = await Message.find({ group: id })
      .populate("sender", "name username avatar")
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error("Get group messages error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching group messages",
    });
  }
};

// =========================
// SEND GROUP MESSAGE (text, image, or location)
// =========================
export const sendGroupMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, type, location } = req.body;

    const isLocation = type === "location";
    const isImage = type === "image";

    if (isLocation) {
      const loc = typeof location === "string" ? JSON.parse(location) : location;
      if (!loc || typeof loc.lat !== "number" || typeof loc.lng !== "number") {
        return res.status(400).json({
          success: false,
          message: "A valid location (lat, lng) is required",
        });
      }
    } else if (isImage) {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Image file is required for image messages",
        });
      }
    } else if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message text is required",
      });
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    if (!isMember(group, req.userId)) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this group",
      });
    }

    let attachmentUrl = null;
    if (isImage && req.file) {
      const result = await uploadToCloudinary(req.file.buffer, "ring-chat/messages");
      attachmentUrl = result.secure_url;
    }

    const parsedLocation =
      isLocation && location
        ? typeof location === "string"
          ? JSON.parse(location)
          : location
        : undefined;

    const message = await Message.create({
      group: id,
      sender: req.userId,
      type: isLocation ? "location" : isImage ? "image" : "text",
      text: isLocation || isImage ? (text || "") : text.trim(),
      attachment: attachmentUrl,
      location: isLocation
        ? { lat: parsedLocation.lat, lng: parsedLocation.lng, label: parsedLocation.label || "" }
        : undefined,
      status: "sent",
    });

    group.lastMessage = message._id;
    await group.save();

    const populatedMessage = await message.populate(
      "sender",
      "name username avatar"
    );

    const io = req.app.get("io");
    if (io) {
      group.members
        .filter((m) => m.toString() !== req.userId)
        .forEach((memberId) => {
          const socketId = getReceiverSocketId(memberId.toString());
          if (socketId) {
            io.to(socketId).emit("receive_message", populatedMessage);
          }
        });
    }

    return res.status(201).json({
      success: true,
      message: populatedMessage,
    });
  } catch (error) {
    console.error("Send group message error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while sending group message",
    });
  }
};
