import { useState } from 'react';
import { Search, X, Users } from 'lucide-react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Avatar from '../ui/Avatar';
import Spinner from '../ui/Spinner';
import { userService } from '../../services/userService';
import { groupService } from '../../services/groupService';
import { useToast } from '../../context/ToastContext';

export default function CreateGroupModal({ open, onClose, onCreated }) {
  const toast = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState([]); // [{id, name, username, avatarUrl}]
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  function reset() {
    setName('');
    setDescription('');
    setQuery('');
    setResults([]);
    setSelected([]);
    setError('');
  }

  function handleClose() {
    reset();
    onClose();
  }

  let searchTimeout;
  function handleQueryChange(value) {
    setQuery(value);
    clearTimeout(searchTimeout);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    searchTimeout = setTimeout(async () => {
      try {
        const data = await userService.search(value.trim());
        setResults(data.users || data || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }

  function toggleSelect(user) {
    const id = user._id || user.id;
    setSelected((prev) =>
      prev.some((u) => u.id === id)
        ? prev.filter((u) => u.id !== id)
        : [...prev, { id, name: user.name, username: user.username, avatarUrl: user.avatar || user.avatarUrl }]
    );
  }

  async function handleCreate() {
    if (!name.trim()) {
      setError('Group name is required.');
      return;
    }
    setError('');
    setCreating(true);
    try {
      const data = await groupService.create({
        name: name.trim(),
        description: description.trim(),
        members: selected.map((u) => u.id),
      });

      if (data.skippedMembers?.length) {
        const names = data.skippedMembers.map((u) => u.name).join(', ');
        toast.error(`${names} ${data.skippedMembers.length > 1 ? "don't" : "doesn't"} allow being added to groups directly.`);
      }

      toast.success('Group created.');
      onCreated?.(data.group);
      handleClose();
    } catch (err) {
      toast.error(err.message || 'Could not create the group.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="New group" size="md">
      <div className="space-y-4">
        <Input
          label="Group name"
          value={name}
          error={error}
          autoFocus
          placeholder="e.g. Weekend Trip"
          onChange={(e) => setName(e.target.value)}
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-soft">
            Description <span className="text-ink-faint">(optional)</span>
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this group about?"
            className="w-full resize-none rounded-xl border border-line bg-surface-card px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-brand-500 focus:outline-none focus:shadow-ring"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-soft">Add members</label>
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search by name or username"
              className="h-10 w-full rounded-xl border border-line bg-surface-sunken pl-9 pr-9 text-sm text-ink placeholder:text-ink-faint focus:border-brand-500 focus:bg-surface-card focus:outline-none focus:shadow-ring"
            />
            {query && (
              <button
                onClick={() => handleQueryChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {selected.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selected.map((u) => (
                <span
                  key={u.id}
                  className="flex items-center gap-1.5 rounded-full bg-brand-50 py-1 pl-1 pr-2.5 text-xs font-medium text-ink"
                >
                  <Avatar name={u.name} src={u.avatarUrl} size="xs" />
                  {u.name}
                  <button onClick={() => toggleSelect({ _id: u.id })} className="text-ink-muted hover:text-ink">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {query.trim() && (
            <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-line bg-surface-card shadow-soft">
              {searching && (
                <div className="flex items-center justify-center py-5">
                  <Spinner size={16} />
                </div>
              )}
              {!searching && results.length === 0 && (
                <p className="px-4 py-5 text-center text-sm text-ink-muted">No people found.</p>
              )}
              {!searching &&
                results.map((user) => {
                  const id = user._id || user.id;
                  const isSelected = selected.some((u) => u.id === id);
                  return (
                    <button
                      key={id}
                      onClick={() => toggleSelect(user)}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-sunken ${
                        isSelected ? 'bg-brand-50' : ''
                      }`}
                    >
                      <Avatar name={user.name} src={user.avatar || user.avatarUrl} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{user.name}</p>
                        <p className="truncate text-xs text-ink-muted">@{user.username}</p>
                      </div>
                      {isSelected && <Users size={14} className="text-brand-600" />}
                    </button>
                  );
                })}
            </div>
          )}
        </div>

        <Button fullWidth size="lg" loading={creating} disabled={creating} onClick={handleCreate}>
          {creating ? 'Creating...' : 'Create group'}
        </Button>
      </div>
    </Modal>
  );
}
