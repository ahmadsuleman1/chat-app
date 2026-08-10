import { ArrowLeft, ChevronRight, Users } from 'lucide-react';
import Avatar from '../ui/Avatar';

function formatLastSeen(dateStr) {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ChatHeader({ chat, onBack, onOpenGroupInfo }) {
  if (!chat) return null;
  const isGroup = chat.kind === 'group';
  const user = chat.user;
  const isOnline = !isGroup && user?.status === 'online';

  return (
    <div className="flex items-center gap-3 border-b border-line bg-surface-card px-4 py-3">
      {onBack && (
        <button
          onClick={onBack}
          className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink lg:hidden"
          aria-label="Back to chats"
        >
          <ArrowLeft size={18} />
        </button>
      )}

      {isGroup ? (
        <button
          onClick={onOpenGroupInfo}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-0.5 pr-2 text-left transition-colors hover:bg-surface-sunken"
        >
          {chat.avatarUrl ? (
            <img src={chat.avatarUrl} alt={chat.name} className="h-10 w-10 shrink-0 rounded-full object-cover" />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-brand-400">
              <Users size={18} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{chat.name}</p>
            <p className="truncate text-xs text-ink-muted">{chat.memberCount} members</p>
          </div>
          <ChevronRight size={16} className="shrink-0 text-ink-faint" />
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar name={user?.name} src={user?.avatarUrl} status={user?.status} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{user?.name}</p>
            <p className={`text-xs ${isOnline ? 'text-success' : 'text-ink-muted'}`}>
              {isOnline ? 'Online' : user?.lastSeen ? `Last seen ${formatLastSeen(user.lastSeen)}` : 'Offline'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
