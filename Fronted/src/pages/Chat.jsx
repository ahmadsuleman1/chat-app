import { useCallback, useEffect, useMemo, useState } from 'react';
import ChatSidebar from '../components/chat/ChatSidebar';
import ChatHeader from '../components/chat/ChatHeader';
import MessageList from '../components/chat/MessageList';
import MessageInput from '../components/chat/MessageInput';
import EmptyState from '../components/chat/EmptyState';
import GroupInfoModal from '../components/chat/GroupInfoModal';
import UserProfileModal from '../components/chat/UserProfileModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { conversationService } from '../services/conversationService';
import { messageService } from '../services/messageService';
import { groupService } from '../services/groupService';
import { getSocket } from '../socket/socket';
import { normalizeMessage } from '../utils/normalize';

const MESSAGE_PAGE_SIZE = 30;

export default function Chat() {
  const { currentUser } = useAuth();
  const toast = useToast();

  const [conversations, setConversations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [listLoading, setListLoading] = useState(true);

  const [activeChat, setActiveChat] = useState(null); // { kind: 'dm'|'group', id, ... }
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [sidebarVisibleOnMobile, setSidebarVisibleOnMobile] = useState(true);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [userProfileOpen, setUserProfileOpen] = useState(false);

  // Merge conversations + groups into one time-sorted sidebar list
  const chatItems = useMemo(() => {
    const dms = conversations.map((c) => ({ ...c, kind: 'dm' }));
    const grps = groups.map((g) => ({ ...g, kind: 'group' }));
    return [...dms, ...grps].sort(
      (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
    );
  }, [conversations, groups]);

  // Load conversations + groups together
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setListLoading(true);
      try {
        const [convData, groupData] = await Promise.all([
          conversationService.list(),
          groupService.list(),
        ]);
        if (!cancelled) {
          setConversations(convData.conversations || []);
          setGroups(groupData.groups || []);
        }
      } catch (err) {
        if (!cancelled) toast.error(err.message || 'Could not load your chats.');
      } finally {
        if (!cancelled) setListLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load messages whenever the active chat changes
  useEffect(() => {
    if (!activeChat) return;
    let cancelled = false;

    async function loadMessages() {
      setMessagesLoading(true);
      setMessages([]);
      setHasMoreMessages(false);
      setReplyingTo(null);
      try {
        const data =
          activeChat.kind === 'group'
            ? await groupService.getMessages(activeChat.id, { limit: MESSAGE_PAGE_SIZE })
            : await messageService.getMessages(activeChat.id, { limit: MESSAGE_PAGE_SIZE });
        const raw = data.messages || data || [];
        if (!cancelled) {
          setMessages(raw.map(normalizeMessage));
          setHasMoreMessages(!!data.hasMore);
        }
      } catch (err) {
        if (!cancelled) toast.error(err.message || 'Could not load messages.');
      } finally {
        if (!cancelled) setMessagesLoading(false);
      }
    }
    loadMessages();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChat?.kind, activeChat?.id]);

  // Fetch an older page when the user scrolls near the top of the thread.
  const handleLoadMoreMessages = useCallback(async () => {
    if (!activeChat || loadingMoreMessages || !hasMoreMessages || messages.length === 0) return;

    const oldest = messages[0];
    setLoadingMoreMessages(true);
    try {
      const data =
        activeChat.kind === 'group'
          ? await groupService.getMessages(activeChat.id, {
              before: oldest.createdAt,
              limit: MESSAGE_PAGE_SIZE,
            })
          : await messageService.getMessages(activeChat.id, {
              before: oldest.createdAt,
              limit: MESSAGE_PAGE_SIZE,
            });
      const older = (data.messages || []).map(normalizeMessage);
      setMessages((prev) => [...older, ...prev]);
      setHasMoreMessages(!!data.hasMore);
    } catch (err) {
      toast.error(err.message || 'Could not load older messages.');
    } finally {
      setLoadingMoreMessages(false);
    }
  }, [activeChat, messages, loadingMoreMessages, hasMoreMessages, toast]);

  // Socket event wiring: presence, incoming messages, typing, group lifecycle
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function handleReceiveMessage(raw) {
      const message = normalizeMessage(raw);
      const belongsToActive =
        activeChat &&
        ((activeChat.kind === 'dm' && message.conversationId === activeChat.id) ||
          (activeChat.kind === 'group' && message.groupId === activeChat.id));

      if (belongsToActive) {
        setMessages((prev) => [...prev, message]);
      }

      if (message.conversationId) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === message.conversationId
              ? { ...c, lastMessage: message, updatedAt: message.createdAt }
              : c
          )
        );
      }
      if (message.groupId) {
        setGroups((prev) =>
          prev.map((g) =>
            g.id === message.groupId
              ? { ...g, lastMessage: message, updatedAt: message.createdAt }
              : g
          )
        );
      }
    }

    function handlePresence({ userId, status, lastSeen }) {
      setConversations((prev) =>
        prev.map((c) =>
          c.user?.id === userId ? { ...c, user: { ...c.user, status, lastSeen } } : c
        )
      );
      setGroups((prev) =>
        prev.map((g) => ({
          ...g,
          members: g.members?.map((m) => (m.id === userId ? { ...m, status, lastSeen } : m)),
        }))
      );
      setActiveChat((prev) => {
        if (!prev) return prev;
        if (prev.kind === 'dm' && prev.user?.id === userId) {
          return { ...prev, user: { ...prev.user, status, lastSeen } };
        }
        if (prev.kind === 'group') {
          return {
            ...prev,
            members: prev.members?.map((m) => (m.id === userId ? { ...m, status, lastSeen } : m)),
          };
        }
        return prev;
      });
    }

    function resolveTyperName(userId) {
      if (!activeChat) return 'Someone';
      if (activeChat.kind === 'dm') return activeChat.user?.name || 'Someone';
      const member = activeChat.members?.find((m) => m.id === userId);
      return member?.name || 'Someone';
    }

    function handleTyping({ conversationId, groupId, userId }) {
      if (activeChat?.kind === 'dm' && conversationId === activeChat.id) {
        setTypingUser(resolveTyperName(userId));
      } else if (activeChat?.kind === 'group' && groupId === activeChat.id) {
        setTypingUser(resolveTyperName(userId));
      }
    }

    function handleStopTyping({ conversationId, groupId }) {
      if (
        (activeChat?.kind === 'dm' && conversationId === activeChat.id) ||
        (activeChat?.kind === 'group' && groupId === activeChat.id)
      ) {
        setTypingUser(null);
      }
    }

    function handleGroupDeleted({ groupId }) {
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      setActiveChat((prev) => {
        if (prev?.kind === 'group' && prev.id === groupId) {
          toast.info('This group was deleted.');
          return null;
        }
        return prev;
      });
    }

    function handleMemberLeftGroup({ groupId, userId }) {
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? { ...g, members: g.members?.filter((m) => m.id !== userId) }
            : g
        )
      );
    }

    // Sender's side: a message they sent has now been seen by the recipient
    function handleMessageRead({ messageId }) {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, status: 'read' } : m))
      );
    }

    // Someone else deleted a message "for everyone" - reflect it locally
    function handleMessageDeleted({ messageId }) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, isDeleted: true, text: '', attachment: null, location: null }
            : m
        )
      );
    }

    socket.on('receive_message', handleReceiveMessage);
    socket.on('presence', handlePresence);
    socket.on('typing', handleTyping);
    socket.on('stop_typing', handleStopTyping);
    socket.on('group_deleted', handleGroupDeleted);
    socket.on('member_left_group', handleMemberLeftGroup);
    socket.on('message_read', handleMessageRead);
    socket.on('message_deleted', handleMessageDeleted);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('presence', handlePresence);
      socket.off('typing', handleTyping);
      socket.off('stop_typing', handleStopTyping);
      socket.off('group_deleted', handleGroupDeleted);
      socket.off('member_left_group', handleMemberLeftGroup);
      socket.off('message_read', handleMessageRead);
      socket.off('message_deleted', handleMessageDeleted);
    };
  }, [activeChat, toast]);

  // Receiver's side: while a DM is open, mark any of the other person's
  // unread messages as read (this is what actually makes the blue ticks work)
  useEffect(() => {
    if (!activeChat || activeChat.kind !== 'dm' || !currentUser) return;
    const socket = getSocket();
    if (!socket) return;

    const unseen = messages.filter(
      (m) =>
        m.senderId !== currentUser.id &&
        m.status !== 'read' &&
        !String(m.id).startsWith('temp-')
    );

    unseen.forEach((m) => socket.emit('message_read', { messageId: m.id }));

    // Reflect it in the sidebar badge right away instead of waiting on a refetch
    if (unseen.length > 0) {
      setConversations((prev) =>
        prev.map((c) => (c.id === activeChat.id ? { ...c, unreadCount: 0 } : c))
      );
    }
  }, [activeChat, messages, currentUser]);

  const handleSelectChat = useCallback(
    (item) => {
      const socket = getSocket();
      if (activeChat?.kind === 'group' && activeChat.id !== item.id) {
        socket?.emit('leave_group', activeChat.id);
      }
      setActiveChat(item);
      setTypingUser(null);
      setSidebarVisibleOnMobile(false);
      if (item.kind === 'group') {
        socket?.emit('join_group', item.id);
      }
      // Optimistically clear the badge the moment you open a chat
      if (item.kind === 'dm') {
        setConversations((prev) =>
          prev.map((c) => (c.id === item.id ? { ...c, unreadCount: 0 } : c))
        );
      } else {
        setGroups((prev) =>
          prev.map((g) => (g.id === item.id ? { ...g, unreadCount: 0 } : g))
        );
      }
    },
    [activeChat]
  );

  const handleStartConversation = useCallback(
    async (user) => {
      try {
        const data = await conversationService.createOrGet(user._id || user.id);
        const conversation = data.conversation || data;
        setConversations((prev) => {
          const exists = prev.some((c) => c.id === conversation.id);
          return exists ? prev : [conversation, ...prev];
        });
        handleSelectChat({ ...conversation, kind: 'dm' });
      } catch (err) {
        toast.error(err.message || 'Could not start conversation.');
      }
    },
    [handleSelectChat, toast]
  );

  const handleGroupCreated = useCallback(
    (group) => {
      setGroups((prev) => [group, ...prev]);
      handleSelectChat({ ...group, kind: 'group' });
    },
    [handleSelectChat]
  );

  const handleGroupUpdated = useCallback((group) => {
    setGroups((prev) => prev.map((g) => (g.id === group.id ? group : g)));
    setActiveChat((prev) => (prev?.kind === 'group' && prev.id === group.id ? { ...group, kind: 'group' } : prev));
  }, []);

  const handleGroupLeft = useCallback((groupId) => {
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    setActiveChat((prev) => (prev?.kind === 'group' && prev.id === groupId ? null : prev));
  }, []);

  const handleGroupDeleted = useCallback((groupId) => {
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    setActiveChat((prev) => (prev?.kind === 'group' && prev.id === groupId ? null : prev));
  }, []);

  const handleDeleteConversation = useCallback(
    async (conversation) => {
      const confirmed = window.confirm(
        `Delete your chat with ${conversation.user?.name || 'this person'}? It'll be removed from your list, but stays for them.`
      );
      if (!confirmed) return;

      try {
        await conversationService.delete(conversation.id);
        setConversations((prev) => prev.filter((c) => c.id !== conversation.id));
        setActiveChat((prev) =>
          prev?.kind === 'dm' && prev.id === conversation.id ? null : prev
        );
        toast.success('Chat deleted.');
      } catch (err) {
        toast.error(err.message || 'Could not delete chat.');
      }
    },
    [toast]
  );

  const appendOptimistic = useCallback(
    (base) => {
      const optimisticId = `temp-${Date.now()}`;
      const optimistic = {
        id: optimisticId,
        conversationId: activeChat.kind === 'dm' ? activeChat.id : null,
        groupId: activeChat.kind === 'group' ? activeChat.id : null,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatarUrl,
        status: 'sent',
        createdAt: new Date().toISOString(),
        ...base,
      };
      setMessages((prev) => [...prev, optimistic]);
      return optimisticId;
    },
    [activeChat, currentUser]
  );

  const handleSend = useCallback(
    async (text, replyToId) => {
      if (!activeChat) return;
      const optimisticId = appendOptimistic({
        text,
        type: 'text',
        replyTo: replyingTo
          ? {
              id: replyingTo.id,
              senderName: replyingTo.senderId === currentUser.id ? 'You' : replyingTo.senderName,
              text: replyingTo.text,
              type: replyingTo.type,
            }
          : null,
      });
      setReplyingTo(null);

      try {
        const payload = replyToId ? { text, replyTo: replyToId } : { text };
        const data =
          activeChat.kind === 'group'
            ? await groupService.sendMessage(activeChat.id, payload)
            : await messageService.sendMessage(activeChat.id, payload);
        const saved = normalizeMessage(data.message || data);
        setMessages((prev) => prev.map((m) => (m.id === optimisticId ? saved : m)));
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        toast.error(err.message || 'Message could not be sent.');
      }
    },
    [activeChat, appendOptimistic, toast, replyingTo, currentUser]
  );

  const handleSendLocation = useCallback(
    async (coords) => {
      if (!activeChat) return;
      if (coords.error) {
        toast.error(coords.error);
        return;
      }
      const optimisticId = appendOptimistic({
        type: 'location',
        location: { lat: coords.lat, lng: coords.lng },
      });

      try {
        const payload = { type: 'location', location: coords };
        const data =
          activeChat.kind === 'group'
            ? await groupService.sendMessage(activeChat.id, payload)
            : await messageService.sendMessage(activeChat.id, payload);
        const saved = normalizeMessage(data.message || data);
        setMessages((prev) => prev.map((m) => (m.id === optimisticId ? saved : m)));
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        toast.error(err.message || 'Could not share location.');
      }
    },
    [activeChat, appendOptimistic, toast]
  );

  const handleSendImage = useCallback(
    async (file, caption = '', replyToId) => {
      if (!activeChat || !file) return;

      const previewUrl = URL.createObjectURL(file);
      const optimisticId = appendOptimistic({
        type: 'image',
        text: caption,
        attachment: previewUrl,
        uploading: true,
      });
      setReplyingTo(null);

      try {
        const formData = new FormData();
        formData.append('type', 'image');
        formData.append('media', file);
        if (caption) formData.append('text', caption);
        if (replyToId) formData.append('replyTo', replyToId);

        const data =
          activeChat.kind === 'group'
            ? await groupService.sendMessage(activeChat.id, formData)
            : await messageService.sendMessage(activeChat.id, formData);
        const saved = normalizeMessage(data.message || data);
        setMessages((prev) => prev.map((m) => (m.id === optimisticId ? saved : m)));
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        toast.error(err.message || 'Could not send image.');
      } finally {
        URL.revokeObjectURL(previewUrl);
      }
    },
    [activeChat, appendOptimistic, toast]
  );

  const handleDeleteMessage = useCallback(
    async (message, mode) => {
      if (!activeChat) return;

      if (mode === 'everyone') {
        const confirmed = window.confirm('Delete this message for everyone?');
        if (!confirmed) return;
      }

      // Optimistic update
      if (mode === 'everyone') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === message.id ? { ...m, isDeleted: true, text: '', attachment: null, location: null } : m
          )
        );
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== message.id));
      }

      try {
        if (activeChat.kind === 'group') {
          await groupService.deleteMessage(activeChat.id, message.id, mode);
        } else {
          await messageService.deleteMessage(message.id, mode);
        }
      } catch (err) {
        toast.error(err.message || 'Could not delete message.');
        // Reload the thread to recover from a failed optimistic update
        const data =
          activeChat.kind === 'group'
            ? await groupService.getMessages(activeChat.id, { limit: MESSAGE_PAGE_SIZE })
            : await messageService.getMessages(activeChat.id, { limit: MESSAGE_PAGE_SIZE });
        setMessages((data.messages || []).map(normalizeMessage));
      }
    },
    [activeChat, toast]
  );

  const handleTypingChange = useCallback(
    (isTyping) => {
      if (!activeChat) return;
      const socket = getSocket();
      const payload =
        activeChat.kind === 'group'
          ? { groupId: activeChat.id }
          : { conversationId: activeChat.id, receiverId: activeChat.user?.id };
      socket?.emit(isTyping ? 'typing' : 'stop_typing', payload);
    },
    [activeChat]
  );

  return (
    <div className="relative h-screen w-full overflow-hidden bg-surface lg:flex">
      <div
        className={`absolute inset-0 z-10 transition-transform duration-300 ease-out lg:static lg:z-auto lg:w-80 lg:shrink-0 lg:translate-x-0 ${
          sidebarVisibleOnMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <ChatSidebar
          items={chatItems}
          loading={listLoading}
          activeChatId={activeChat?.id}
          onSelectChat={handleSelectChat}
          onStartConversation={handleStartConversation}
          onGroupCreated={handleGroupCreated}
          onDeleteConversation={handleDeleteConversation}
        />
      </div>

      <div
        className={`absolute inset-0 flex flex-col transition-transform duration-300 ease-out lg:static lg:min-w-0 lg:flex-1 lg:translate-x-0 ${
          sidebarVisibleOnMobile ? 'translate-x-full' : 'translate-x-0'
        }`}
      >
        {activeChat ? (
          <>
            <ChatHeader
              chat={activeChat}
              onBack={() => setSidebarVisibleOnMobile(true)}
              onOpenGroupInfo={() => setGroupInfoOpen(true)}
              onOpenUserProfile={() => setUserProfileOpen(true)}
            />
            <MessageList
              messages={messages}
              loading={messagesLoading}
              currentUserId={currentUser?.id}
              typingUser={typingUser}
              showSenderName={activeChat.kind === 'group'}
              hasMore={hasMoreMessages}
              loadingMore={loadingMoreMessages}
              onLoadMore={handleLoadMoreMessages}
              onReplyToMessage={setReplyingTo}
              onDeleteMessage={handleDeleteMessage}
            />
            <MessageInput
              onSend={handleSend}
              onSendLocation={handleSendLocation}
              onSendImage={handleSendImage}
              onTyping={handleTypingChange}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
            />
          </>
        ) : (
          <EmptyState />
        )}
      </div>

      <GroupInfoModal
        open={groupInfoOpen && activeChat?.kind === 'group'}
        onClose={() => setGroupInfoOpen(false)}
        group={activeChat?.kind === 'group' ? activeChat : null}
        onUpdated={handleGroupUpdated}
        onLeft={handleGroupLeft}
        onDeleted={handleGroupDeleted}
      />

      <UserProfileModal
        open={userProfileOpen && activeChat?.kind === 'dm'}
        onClose={() => setUserProfileOpen(false)}
        userId={activeChat?.kind === 'dm' ? activeChat.user?.id : null}
      />
    </div>
  );
}
