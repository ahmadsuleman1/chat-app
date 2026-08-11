import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Camera, Moon, Sun, Users } from 'lucide-react';
import Avatar from '../components/ui/Avatar';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import Switch from '../components/ui/Switch';
import PasswordInput from '../components/auth/PasswordInput';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { userService } from '../services/userService';
import { isValidEmail } from '../utils/validators';

function Section({ title, description, children }) {
  return (
    <div className="border-t border-line py-6 first:border-t-0 first:pt-0">
      <h2 className="font-display text-sm font-semibold text-ink">{title}</h2>
      {description && <p className="mt-1 text-xs text-ink-muted">{description}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

export default function Profile() {
  const { currentUser, updateCurrentUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const fileInputRef = useRef(null);

  // Basic info
  const [name, setName] = useState(currentUser?.name || '');
  const [username, setUsername] = useState(currentUser?.username || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [profileErrors, setProfileErrors] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState({});
  const [savingPassword, setSavingPassword] = useState(false);

  // Email change
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailErrors, setEmailErrors] = useState({});
  const [savingEmail, setSavingEmail] = useState(false);

  // Privacy
  const [allowGroupInvites, setAllowGroupInvites] = useState(
    currentUser?.allowGroupInvites !== false
  );
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  async function handleSaveProfile(e) {
    e.preventDefault();
    const next = {};
    if (!name.trim()) next.name = 'Name cannot be empty.';
    if (!username.trim()) next.username = 'Username is required.';
    setProfileErrors(next);
    if (Object.keys(next).length) return;

    setSavingProfile(true);
    try {
      const data = await userService.updateProfile({
        name: name.trim(),
        username: username.trim(),
        bio: bio.trim(),
      });
      updateCurrentUser(data.user || data);
      toast.success('Profile updated.');
    } catch (err) {
      toast.error(err.message || 'Could not save changes.');
    } finally {
      setSavingProfile(false);
    }
  }

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

  async function handleChangePassword(e) {
    e.preventDefault();
    const next = {};
    if (!currentPassword) next.currentPassword = 'Enter your current password.';
    if (!newPassword) next.newPassword = 'Enter a new password.';
    else if (newPassword.length < 8) next.newPassword = 'Use at least 8 characters.';
    if (newPassword !== confirmNewPassword) next.confirmNewPassword = 'Passwords do not match.';
    setPasswordErrors(next);
    if (Object.keys(next).length) return;

    setSavingPassword(true);
    try {
      await userService.changePassword(currentPassword, newPassword);
      toast.success('Password updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      toast.error(err.message || 'Could not update password.');
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleChangeEmail(e) {
    e.preventDefault();
    const next = {};
    if (!newEmail.trim()) next.newEmail = 'Enter a new email address.';
    else if (!isValidEmail(newEmail)) next.newEmail = 'Enter a valid email address.';
    if (!emailPassword) next.emailPassword = 'Enter your current password.';
    setEmailErrors(next);
    if (Object.keys(next).length) return;

    setSavingEmail(true);
    try {
      const data = await userService.changeEmail(newEmail.trim(), emailPassword);
      updateCurrentUser(data.user || data);
      toast.success('Email updated. Please verify your new address.');
      setNewEmail('');
      setEmailPassword('');
    } catch (err) {
      toast.error(err.message || 'Could not update email.');
    } finally {
      setSavingEmail(false);
    }
  }

  async function handlePrivacyToggle(next) {
    setAllowGroupInvites(next);
    setSavingPrivacy(true);
    try {
      const data = await userService.updatePrivacy({ allowGroupInvites: next });
      updateCurrentUser(data.user || data);
    } catch (err) {
      setAllowGroupInvites(!next);
      toast.error(err.message || 'Could not update privacy settings.');
    } finally {
      setSavingPrivacy(false);
    }
  }

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-surface px-4 py-8">
      <div className="mx-auto max-w-lg">
        <Link
          to="/chat"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
        >
          <ArrowLeft size={16} />
          Back to chat
        </Link>

        <div className="rounded-xl2 border border-line bg-surface-card p-6 shadow-soft sm:p-8">
          {/* Header */}
          <div className="flex flex-col items-center border-b border-line pb-6">
            <div className="relative">
              <Avatar name={currentUser.name} src={currentUser.avatarUrl} size="xl" status="online" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
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
            <h1 className="mt-4 font-display text-xl font-bold text-ink">{currentUser.name}</h1>
            <p className="text-sm text-ink-muted">@{currentUser.username}</p>
          </div>

          {/* Profile info */}
          <Section title="Profile" description="How you appear to other people.">
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <Input
                label="Name"
                name="name"
                value={name}
                error={profileErrors.name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                label="Username"
                name="username"
                value={username}
                error={profileErrors.username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <div>
                <label htmlFor="bio" className="mb-1.5 block text-sm font-medium text-ink-soft">
                  Bio
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
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-ink-muted">Phone number</p>
                  <p className="mt-0.5 font-medium text-ink">{currentUser.phoneNumber || '—'}</p>
                </div>
                <div>
                  <p className="text-ink-muted">Date of birth</p>
                  <p className="mt-0.5 font-medium text-ink">
                    {currentUser.dateOfBirth
                      ? new Date(currentUser.dateOfBirth).toLocaleDateString()
                      : '—'}
                  </p>
                </div>
              </div>
              <Button type="submit" fullWidth loading={savingProfile} disabled={savingProfile}>
                {savingProfile ? 'Saving...' : 'Save changes'}
              </Button>
            </form>
          </Section>

          {/* Appearance */}
          <Section title="Appearance">
            <Switch
              checked={theme === 'dark'}
              onChange={toggleTheme}
              label={theme === 'dark' ? 'Dark mode' : 'Light mode'}
              description="Switch between light and dark theme."
            />
            <div className="flex items-center gap-2 text-xs text-ink-faint">
              {theme === 'dark' ? <Moon size={13} /> : <Sun size={13} />}
              <span>Currently using {theme} mode.</span>
            </div>
          </Section>

          {/* Privacy */}
          <Section title="Privacy">
            <Switch
              checked={allowGroupInvites}
              onChange={handlePrivacyToggle}
              disabled={savingPrivacy}
              label="Allow group invites"
              description="Let other people add you to groups directly, without asking first."
            />
            {!allowGroupInvites && (
              <p className="flex items-center gap-1.5 text-xs text-ink-muted">
                <Users size={13} />
                People will not be able to add you to new groups.
              </p>
            )}
          </Section>

          {/* Security: password */}
          <Section title="Change password">
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-soft">
                  Current password
                </label>
                <PasswordInput
                  name="currentPassword"
                  value={currentPassword}
                  error={passwordErrors.currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-soft">
                  New password
                </label>
                <PasswordInput
                  name="newPassword"
                  showStrength
                  value={newPassword}
                  error={passwordErrors.newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-soft">
                  Confirm new password
                </label>
                <PasswordInput
                  name="confirmNewPassword"
                  value={confirmNewPassword}
                  error={passwordErrors.confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                variant="outline"
                fullWidth
                loading={savingPassword}
                disabled={savingPassword}
              >
                {savingPassword ? 'Updating...' : 'Update password'}
              </Button>
            </form>
          </Section>

          {/* Security: email */}
          <Section title="Change email" description="Your new email will need to be verified before it's trusted.">
            <form onSubmit={handleChangeEmail} className="space-y-4">
              <div className="text-sm">
                <p className="text-ink-muted">Current email</p>
                <p className="mt-0.5 truncate font-medium text-ink">{currentUser.email}</p>
              </div>
              <Input
                label="New email address"
                name="newEmail"
                type="email"
                value={newEmail}
                error={emailErrors.newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-soft">
                  Current password
                </label>
                <PasswordInput
                  name="emailPassword"
                  value={emailPassword}
                  error={emailErrors.emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                variant="outline"
                fullWidth
                loading={savingEmail}
                disabled={savingEmail}
              >
                {savingEmail ? 'Updating...' : 'Update email'}
              </Button>
            </form>
          </Section>
        </div>
      </div>
    </div>
  );
}
