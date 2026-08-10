import { useState } from 'react';
import StepShell from '../StepShell';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import { isValidEmail } from '../../../utils/validators';

export default function StepEmail({ data, onNext, onBack }) {
  const [email, setEmail] = useState(data.email || '');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return setError('Email is required.');
    if (!isValidEmail(email)) return setError('Enter a valid email address.');
    setError('');
    onNext({ email: email.trim() });
  }

  return (
    <StepShell title="What's your email?" subtitle="We'll use this to keep your account secure.">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          label="Email address"
          name="email"
          type="email"
          autoFocus
          placeholder="yourname@gmail.com"
          value={email}
          error={error}
          onChange={(e) => setEmail(e.target.value)}
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
