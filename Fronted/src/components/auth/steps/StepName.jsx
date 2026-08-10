import { useState } from 'react';
import StepShell from '../StepShell';
import Input from '../../ui/Input';
import Button from '../../ui/Button';

export default function StepName({ data, onNext }) {
  const [firstName, setFirstName] = useState(data.firstName || '');
  const [lastName, setLastName] = useState(data.lastName || '');
  const [errors, setErrors] = useState({});

  function handleSubmit(e) {
    e.preventDefault();
    const next = {};
    if (!firstName.trim()) next.firstName = 'First name is required.';
    if (!lastName.trim()) next.lastName = 'Last name is required.';
    setErrors(next);
    if (Object.keys(next).length) return;

    onNext({ firstName: firstName.trim(), lastName: lastName.trim() });
  }

  return (
    <StepShell title="What's your name?" subtitle="This is how you'll appear to other people.">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          label="First name"
          name="firstName"
          autoFocus
          placeholder="First name"
          value={firstName}
          error={errors.firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        <Input
          label="Last name"
          name="lastName"
          placeholder="Last name"
          value={lastName}
          error={errors.lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
        <Button type="submit" fullWidth>
          Continue
        </Button>
      </form>
    </StepShell>
  );
}
