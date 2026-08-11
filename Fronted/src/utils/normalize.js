// Backend sends raw Mongoose docs for messages (_id, sender as populated
// object or plain id, conversation/group as ObjectId) and `avatar` instead
// of `avatarUrl` for users. These helpers translate both into the shapes
// the rest of the frontend already expects, in one place.

function normalizeReplyTo(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const senderObj = raw.sender && typeof raw.sender === 'object' ? raw.sender : null;
  return {
    id: raw._id || raw.id,
    senderName: senderObj?.name || raw.senderName || '',
    text: raw.text || '',
    type: raw.type || 'text',
    attachment: raw.attachment || null,
    isDeleted: !!raw.isDeleted,
  };
}

export function normalizeMessage(raw) {
  if (!raw) return raw;
  const senderObj = raw.sender && typeof raw.sender === 'object' ? raw.sender : null;

  return {
    id: raw._id || raw.id,
    conversationId: raw.conversation?._id || raw.conversation || null,
    groupId: raw.group?._id || raw.group || null,
    senderId: senderObj ? senderObj._id || senderObj.id : raw.sender,
    senderName: senderObj?.name || raw.senderName,
    senderAvatar: senderObj?.avatar || raw.senderAvatar,
    text: raw.text || '',
    type: raw.type || 'text',
    attachment: raw.attachment || null,
    location: raw.location || null,
    status: raw.status || 'sent',
    replyTo: normalizeReplyTo(raw.replyTo),
    isDeleted: !!raw.isDeleted,
    createdAt: raw.createdAt,
  };
}

export function withAvatarUrl(user) {
  if (!user) return user;
  return { ...user, avatarUrl: user.avatarUrl ?? user.avatar ?? '' };
}

export function withAvatarUrlList(users) {
  return (users || []).map(withAvatarUrl);
}
