import { useState } from 'react';
import StepShell from '../StepShell';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import { isValidUsername } from '../../../utils/validators';

export default function StepUsername({ data, onNext, onBack, serverError }) {
  const [username, setUsername] = useState(data.username || '');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return setError('Username is required.');
    if (!isValidUsername(trimmed)) {
      return setError('3-20 characters, letters, numbers and underscores only.');
    }
    setError('');
    onNext({ username: trimmed });
  }

  return (
    <StepShell title="Choose your username" subtitle="This is how people will find and mention you.">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          label="Username"
          name="username"
          autoFocus
          prefix="@"
          placeholder="merab_dev"
          value={username}
          error={error || serverError}
          hint="3-20 characters, no spaces."
          onChange={(e) => setUsername(e.target.value)}
        />
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button type="submit" fullWidth>
            Continue
          </Button>
        </div>
      </form>
    </StepShell>
  );
}
