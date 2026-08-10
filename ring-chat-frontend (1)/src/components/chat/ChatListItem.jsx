import { Users } from 'lucide-react';
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

function lastMessagePreview(lastMessage) {
  if (!lastMessage) return null;
  if (lastMessage.type === 'location') return '📍 Location';
  return lastMessage.text;
}

/**
 * Renders either a 1:1 conversation or a group as a sidebar row.
 * `item` is a normalized shape: { kind: 'dm' | 'group', id, ... }
 */
export default function ChatListItem({ item, active, onClick }) {
  const isGroup = item.kind === 'group';

  const title = isGroup ? item.name : item.user?.name || 'Unknown user';
  const preview = lastMessagePreview(item.lastMessage);
  const subtitle = preview || (isGroup ? `${item.memberCount} members` : 'Start the conversation');
  const updatedAt = item.updatedAt;
  const unreadCount = item.unreadCount || 0;

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 ${
        active ? 'bg-brand-50' : 'hover:bg-surface-sunken'
      }`}
    >
      {isGroup ? (
        item.avatarUrl ? (
          <img src={item.avatarUrl} alt={item.name} className="h-10 w-10 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-brand-400">
            <Users size={18} />
          </div>
        )
      ) : (
        <Avatar name={item.user?.name} src={item.user?.avatarUrl} status={item.user?.status} />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-ink">{title}</p>
          <span className="shrink-0 font-mono text-[11px] text-ink-faint">{formatTime(updatedAt)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs text-ink-muted">{subtitle}</p>
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
