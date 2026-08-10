import Avatar from '../ui/Avatar';

function formatTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ConversationItem({ conversation, active, onClick }) {
  const { user, lastMessage, unreadCount, updatedAt } = conversation;

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 ${
        active ? 'bg-brand-50' : 'hover:bg-surface-sunken'
      }`}
    >
      <Avatar name={user?.name} src={user?.avatarUrl} status={user?.status} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className={`truncate text-sm font-semibold ${active ? 'text-ink' : 'text-ink'}`}>
            {user?.name || 'Unknown user'}
          </p>
          <span className="shrink-0 font-mono text-[11px] text-ink-faint">
            {formatTime(updatedAt)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs text-ink-muted">
            {lastMessage || 'Start the conversation'}
          </p>
          {unreadCount > 0 && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-400 px-1.5 text-[11px] font-bold text-ink">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
