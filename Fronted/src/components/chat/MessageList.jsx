import { useEffect, useLayoutEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import Spinner from '../ui/Spinner';

const LOAD_MORE_THRESHOLD = 80; // px from top before fetching the next page

export default function MessageList({
  messages,
  loading,
  currentUserId,
  typingUser,
  showSenderName,
  hasMore,
  loadingMore,
  onLoadMore,
  onReplyToMessage,
  onDeleteMessage,
}) {
  const containerRef = useRef(null);
  const bottomRef = useRef(null);
  const prevFirstIdRef = useRef(null);
  const prevScrollHeightRef = useRef(0);
  const isFreshChatRef = useRef(true);

  // A new chat was just opened (loading flips true) - the next successful
  // render should jump straight to the bottom, not animate there.
  useEffect(() => {
    if (loading) isFreshChatRef.current = true;
  }, [loading]);

  // Keeps the reading position stable: if older messages were just
  // prepended (because the user scrolled up), restore the scroll offset
  // instead of letting the browser reset it to the top. Otherwise, this is
  // either the first paint for this chat or a new message landed at the
  // bottom - scroll down for those.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || messages.length === 0) return;

    const firstId = messages[0].id;
    const wasPrepend =
      !isFreshChatRef.current && prevFirstIdRef.current !== null && firstId !== prevFirstIdRef.current;

    if (wasPrepend) {
      container.scrollTop = container.scrollHeight - prevScrollHeightRef.current;
    } else {
      bottomRef.current?.scrollIntoView({ behavior: isFreshChatRef.current ? 'auto' : 'smooth' });
      isFreshChatRef.current = false;
    }

    prevFirstIdRef.current = firstId;
  }, [messages]);

  function handleScroll() {
    const container = containerRef.current;
    if (!container || loadingMore || !hasMore) return;
    if (container.scrollTop < LOAD_MORE_THRESHOLD) {
      // Capture the height now, synchronously, before the fetch resolves and
      // React re-renders with the older messages prepended.
      prevScrollHeightRef.current = container.scrollHeight;
      onLoadMore?.();
    }
  }

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
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 space-y-3 overflow-y-auto px-5 py-5 sm:px-8"
    >
      {loadingMore && (
        <div className="flex justify-center py-1">
          <Spinner size={16} />
        </div>
      )}
      {messages.map((m) => (
        <MessageBubble
          key={m.id}
          message={m}
          isOwn={m.senderId === currentUserId}
          senderName={showSenderName && m.senderId !== currentUserId ? m.senderName : null}
          onReply={m.isDeleted || String(m.id).startsWith('temp-') ? null : () => onReplyToMessage?.(m)}
          onDelete={
            m.isDeleted || String(m.id).startsWith('temp-')
              ? null
              : (mode) => onDeleteMessage?.(m, mode)
          }
        />
      ))}
      {typingUser && <TypingIndicator name={typingUser} />}
      <div ref={bottomRef} />
    </div>
  );
}
