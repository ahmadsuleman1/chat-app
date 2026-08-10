import { useState } from 'react';
import { Crown, LogOut, ShieldCheck, ShieldOff, Trash2, UserMinus, UserPlus } from 'lucide-react';
import Modal from '../ui/Modal';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import SearchUsers from './SearchUsers';
import { groupService } from '../../services/groupService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function GroupInfoModal({ open, onClose, group, onUpdated, onLeft, onDeleted }) {
  const { currentUser } = useAuth();
  const toast = useToast();
  const [busyId, setBusyId] = useState(null);
  const [addingMember, setAddingMember] = useState(false);
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!group) return null;

  async function withBusy(id, fn) {
    setBusyId(id);
    try {
      await fn();
    } catch (err) {
      toast.error(err.message || 'Something went wrong.');
    } finally {
      setBusyId(null);
    }
  }

  function handlePromote(memberId) {
    withBusy(memberId, async () => {
      const data = await groupService.promoteAdmin(group.id, memberId);
      onUpdated?.(data.group);
      toast.success('Promoted to admin.');
    });
  }

  function handleDemote(memberId) {
    withBusy(memberId, async () => {
      const data = await groupService.demoteAdmin(group.id, memberId);
      onUpdated?.(data.group);
      toast.success('Admin rights removed.');
    });
  }

  function handleRemove(memberId) {
    withBusy(memberId, async () => {
      const data = await groupService.removeMember(group.id, memberId);
      if (data.deleted) {
        onDeleted?.(group.id);
      } else {
        onUpdated?.(data.group);
      }
      toast.success('Member removed.');
    });
  }

  async function handleAddMember(user) {
    setAddingMember(false);
    try {
      const data = await groupService.addMember(group.id, user._id || user.id);
      onUpdated?.(data.group);
      toast.success(`${user.name} added to the group.`);
    } catch (err) {
      toast.error(err.message || 'Could not add member.');
    }
  }

  async function handleLeave() {
    try {
      const data = await groupService.leave(group.id);
      onLeft?.(group.id);
      onClose();
      toast.success(data.deleted ? 'Group deleted (you were the last member).' : 'You left the group.');
    } catch (err) {
      toast.error(err.message || 'Could not leave the group.');
    }
  }

  async function handleDelete() {
    try {
      await groupService.delete(group.id);
      onDeleted?.(group.id);
      onClose();
      toast.success('Group deleted.');
    } catch (err) {
      toast.error(err.message || 'Could not delete the group.');
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={group.name} size="md">
      <div className="space-y-5">
        {group.description && <p className="text-sm text-ink-muted">{group.description}</p>}

        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-ink">{group.memberCount} members</p>
          {group.isAdmin && (
            <button
              onClick={() => setAddingMember((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:underline"
            >
              <UserPlus size={14} /> Add member
            </button>
          )}
        </div>

        {addingMember && (
          <div className="rounded-xl border border-line p-3">
            <SearchUsers onSelectUser={handleAddMember} />
          </div>
        )}

        <div className="max-h-72 space-y-1 overflow-y-auto">
          {group.members.map((m) => {
            const isSelf = m.id === currentUser?.id;
            const busy = busyId === m.id;
            return (
              <div key={m.id} className="flex items-center gap-3 rounded-xl px-2 py-2">
                <Avatar name={m.name} src={m.avatarUrl} size="sm" status={m.status} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium text-ink">
                    {m.name} {isSelf && <span className="text-ink-faint">(you)</span>}
                    {m.isAdmin && <Crown size={12} className="shrink-0 text-brand-500" />}
                  </p>
                  <p className="truncate text-xs text-ink-muted">@{m.username}</p>
                </div>

                {group.isAdmin && !isSelf && (
                  <div className="flex shrink-0 items-center gap-1">
                    {m.isAdmin ? (
                      <button
                        title="Remove admin"
                        disabled={busy}
                        onClick={() => handleDemote(m.id)}
                        className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-sunken hover:text-ink disabled:opacity-50"
                      >
                        <ShieldOff size={15} />
                      </button>
                    ) : (
                      <button
                        title="Make admin"
                        disabled={busy}
                        onClick={() => handlePromote(m.id)}
                        className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-sunken hover:text-ink disabled:opacity-50"
                      >
                        <ShieldCheck size={15} />
                      </button>
                    )}
                    <button
                      title="Remove from group"
                      disabled={busy}
                      onClick={() => handleRemove(m.id)}
                      className="rounded-lg p-1.5 text-ink-muted hover:bg-danger-bg hover:text-danger disabled:opacity-50"
                    >
                      <UserMinus size={15} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="space-y-2 border-t border-line pt-4">
          {!confirmingLeave ? (
            <Button variant="outline" fullWidth icon={LogOut} onClick={() => setConfirmingLeave(true)}>
              Leave group
            </Button>
          ) : (
            <div className="rounded-xl border border-line p-3">
              <p className="mb-2 text-sm text-ink">Leave "{group.name}"?</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" fullWidth onClick={() => setConfirmingLeave(false)}>
                  Cancel
                </Button>
                <Button variant="danger" size="sm" fullWidth onClick={handleLeave}>
                  Leave
                </Button>
              </div>
            </div>
          )}

          {group.isCreator && (
            !confirmingDelete ? (
              <Button variant="ghost" fullWidth icon={Trash2} className="text-danger hover:bg-danger-bg" onClick={() => setConfirmingDelete(true)}>
                Delete group
              </Button>
            ) : (
              <div className="rounded-xl border border-danger/30 bg-danger-bg p-3">
                <p className="mb-2 text-sm text-ink">Delete "{group.name}" for everyone? This can't be undone.</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" fullWidth onClick={() => setConfirmingDelete(false)}>
                    Cancel
                  </Button>
                  <Button variant="danger" size="sm" fullWidth onClick={handleDelete}>
                    Delete
                  </Button>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </Modal>
  );
}
