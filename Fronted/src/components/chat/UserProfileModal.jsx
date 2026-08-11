import { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import Modal from '../ui/Modal';
import Avatar from '../ui/Avatar';
import Spinner from '../ui/Spinner';
import { userService } from '../../services/userService';
import { useToast } from '../../context/ToastContext';

function formatJoined(dateStr) {
  if (!dateStr) return 'Unknown';
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

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

export default function UserProfileModal({ userId, open, onClose }) {
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !userId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setProfile(null);
      try {
        const data = await userService.getById(userId);
        if (!cancelled) setProfile(data.user);
      } catch (err) {
        if (!cancelled) toast.error(err.message || "Couldn't load this profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId]);

  return (
    <Modal open={open} onClose={onClose} title="Profile" size="sm">
      {loading && (
        <div className="flex items-center justify-center py-10">
          <Spinner size={22} label="Loading profile..." />
        </div>
      )}

      {!loading && profile && (
        <div className="flex flex-col items-center text-center">
          <Avatar name={profile.name} src={profile.avatarUrl} size="xl" status={profile.status} />

          <h3 className="mt-4 font-display text-lg font-bold text-ink">{profile.name}</h3>
          <p className="text-sm text-ink-muted">@{profile.username}</p>

          <div className="mt-1.5 flex items-center gap-1.5 text-xs">
            {profile.status === 'online' ? (
              <span className="flex items-center gap-1.5 font-medium text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                Online now
              </span>
            ) : (
              <span className="text-ink-muted">
                Last seen {profile.lastSeen ? formatLastSeen(profile.lastSeen) : 'a while ago'}
              </span>
            )}
          </div>

          {profile.bio && (
            <p className="mt-4 rounded-xl bg-surface-sunken px-4 py-3 text-sm leading-relaxed text-ink-soft">
              {profile.bio}
            </p>
          )}

          <div className="mt-5 flex w-full items-center justify-center gap-2 border-t border-line pt-4 text-xs text-ink-muted">
            <Calendar size={14} />
            <span>Joined {formatJoined(profile.joinedAt)}</span>
          </div>
        </div>
      )}

      {!loading && !profile && (
        <p className="py-6 text-center text-sm text-ink-muted">Couldn't load this profile.</p>
      )}
    </Modal>
  );
}
