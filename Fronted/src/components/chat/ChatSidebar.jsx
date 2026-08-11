import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Settings, UserPlus, Users } from 'lucide-react';
import Avatar from '../ui/Avatar';
import Spinner from '../ui/Spinner';
import ChatListItem from './ChatListItem';
import SearchUsers from './SearchUsers';
import CreateGroupModal from './CreateGroupModal';
import Modal from '../ui/Modal';
import { useAuth } from '../../context/AuthContext';

export default function ChatSidebar({
  items,
  loading,
  activeChatId,
  onSelectChat,
  onStartConversation,
  onGroupCreated,
  onDeleteConversation,
  className = '',
}) {
  const { currentUser, logout } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);

  async function handleSelectUser(user) {
    setSearchOpen(false);
    await onStartConversation(user);
  }

  function handleGroupCreated(group) {
    onGroupCreated?.(group);
  }

  return (
    <aside className={`flex h-full w-full flex-col border-r border-line bg-surface-card ${className}`}>
      <div className="flex items-center justify-between border-b border-line px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink font-display text-sm font-bold text-brand-400">
            R
          </div>
          <span className="font-display text-base font-semibold">Ring</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCreateGroupOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
            aria-label="New group"
            title="New group"
          >
            <Users size={17} />
          </button>
          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
            aria-label="Start new conversation"
            title="New conversation"
          >
            <UserPlus size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        {loading && (
          <div className="flex items-center justify-center py-10">
            <Spinner size={20} label="Loading chats..." />
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-medium text-ink">No chats yet</p>
            <p className="mt-1 text-xs text-ink-muted">
              Search for someone or start a group to begin.
            </p>
          </div>
        )}

        <div className="space-y-1">
          {items.map((item) => (
            <ChatListItem
              key={`${item.kind}-${item.id}`}
              item={item}
              active={item.id === activeChatId}
              onClick={() => onSelectChat(item)}
              onDelete={item.kind === 'dm' ? onDeleteConversation : undefined}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-line px-3 py-3">
        <Link to="/profile" className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1 py-1 transition-colors hover:bg-surface-sunken">
          <Avatar name={currentUser?.name} src={currentUser?.avatarUrl} size="sm" status="online" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{currentUser?.name}</p>
            <p className="truncate text-xs text-ink-muted">@{currentUser?.username}</p>
          </div>
        </Link>
        <Link
          to="/profile"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
          aria-label="Settings"
          title="Settings"
        >
          <Settings size={16} />
        </Link>
        <button
          onClick={logout}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-danger-bg hover:text-danger"
          aria-label="Log out"
          title="Log out"
        >
          <LogOut size={16} />
        </button>
      </div>

      <Modal open={searchOpen} onClose={() => setSearchOpen(false)} title="Start a conversation">
        <SearchUsers onSelectUser={handleSelectUser} />
      </Modal>

      <CreateGroupModal
        open={createGroupOpen}
        onClose={() => setCreateGroupOpen(false)}
        onCreated={handleGroupCreated}
      />
    </aside>
  );
}
