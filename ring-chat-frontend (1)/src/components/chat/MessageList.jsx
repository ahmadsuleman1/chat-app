import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import Spinner from '../ui/Spinner';

export default function MessageList({ messages, loading, currentUserId, typingUser, showSenderName }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUser]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner size={20} label="Loading messages..." />
      </div>
    );
  }

  if (!loading && messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="text-sm font-medium text-ink">No messages yet</p>
        <p className="mt-1 text-xs text-ink-muted">Say hello to get things started.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5 sm:px-8">
      {messages.map((m) => (
        <MessageBubble
          key={m.id}
          message={m}
          isOwn={m.senderId === currentUserId}
          senderName={showSenderName && m.senderId !== currentUserId ? m.senderName : null}
        />
      ))}
      {typingUser && <TypingIndicator name={typingUser} />}
      <div ref={bottomRef} />
    </div>
  );
}
