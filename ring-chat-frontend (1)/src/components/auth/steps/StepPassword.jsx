import { useState } from 'react';
import StepShell from '../StepShell';
import PasswordInput from '../PasswordInput';
import Button from '../../ui/Button';

export default function StepPassword({ onNext, onBack, submitting }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});

  function handleSubmit(e) {
    e.preventDefault();
    const next = {};
    if (!password) next.password = 'Password is required.';
    else if (password.length < 8) next.password = 'Use at least 8 characters.';
    if (!confirmPassword) next.confirmPassword = 'Please confirm your password.';
    else if (password !== confirmPassword) next.confirmPassword = 'Passwords do not match.';

    setErrors(next);
    if (Object.keys(next).length) return;

    onNext({ password });
  }

  return (
    <StepShell title="Secure your account" subtitle="Choose a strong password you don't use elsewhere.">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink-soft">
            Password
          </label>
          <PasswordInput
            name="password"
            autoFocus
            showStrength
            placeholder="••••••••"
            value={password}
            error={errors.password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-ink-soft">
            Confirm password
          </label>
          <PasswordInput
            name="confirmPassword"
            placeholder="••••••••"
            value={confirmPassword}
            error={errors.confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onBack} disabled={submitting}>
            Back
          </Button>
          <Button type="submit" fullWidth loading={submitting} disabled={submitting}>
            {submitting ? 'Creating account...' : 'Create account'}
          </Button>
        </div>
      </form>
    </StepShell>
  );
}
