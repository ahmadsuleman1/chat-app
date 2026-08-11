import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { userService } from '../services/userService';

export default function ProfileSetup() {
  const { currentUser, updateCurrentUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const data = await userService.uploadAvatar(file);
      updateCurrentUser({ avatarUrl: data.avatar || data.user?.avatar });
      toast.success('Profile photo updated.');
    } catch (err) {
      toast.error(err.message || 'Could not upload photo.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (bio.trim()) {
        const data = await userService.updateProfile({ bio: bio.trim() });
        updateCurrentUser(data.user || data);
      }
      navigate('/chat', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Could not save profile.');
      setSaving(false);
    }
  }

  function handleSkip() {
    navigate('/chat', { replace: true });
  }

  return (
    <AuthLayout cardClassName="flex flex-col items-center">
      <div className="mb-8 text-center w-full">
        <h1 className="font-display text-3xl font-bold text-ink">Set up your profile</h1>
        <p className="mt-2 text-[15px] text-ink-muted">Add a photo and bio so people know it's you.</p>
      </div>

      <div className="relative mb-8">
        <Avatar name={currentUser?.name || ''} src={currentUser?.avatarUrl} size="xl" status="online" />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          type="button"
          className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface-card bg-brand-400 text-ink transition-transform hover:scale-105 hover:bg-brand-500 active:scale-95 disabled:opacity-60"
          aria-label="Change profile photo"
        >
          {uploading ? <Spinner size={14} /> : <Camera size={14} />}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
      </div>

      <form onSubmit={handleSubmit} className="w-full space-y-6">
        <div>
          <label htmlFor="bio" className="mb-1.5 block text-sm font-medium text-ink-soft">
            Bio (optional)
          </label>
          <textarea
            id="bio"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell people a bit about yourself"
            className="w-full resize-none rounded-xl border border-line bg-surface-card px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-brand-500 focus:outline-none focus:shadow-ring"
          />
        </div>

        <div className="space-y-3">
          <Button type="submit" size="lg" fullWidth loading={saving} disabled={saving}>
            {saving ? 'Saving...' : 'Continue to Chat'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            fullWidth
            onClick={handleSkip}
            disabled={saving}
          >
            Skip for now
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
}
