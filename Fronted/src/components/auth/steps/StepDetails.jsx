import { useState } from 'react';
import StepShell from '../StepShell';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import { isValidPhone, calculateAge, isDateInFuture } from '../../../utils/validators';

export default function StepDetails({ data, onNext, onBack }) {
  const [phoneNumber, setPhoneNumber] = useState(data.phoneNumber || '');
  const [dateOfBirth, setDateOfBirth] = useState(data.dateOfBirth || '');
  const [errors, setErrors] = useState({});

  function handleSubmit(e) {
    e.preventDefault();
    const next = {};

    if (!phoneNumber.trim()) next.phoneNumber = 'Phone number is required.';
    else if (!isValidPhone(phoneNumber)) next.phoneNumber = 'Enter a valid phone number.';

    if (!dateOfBirth) {
      next.dateOfBirth = 'Date of birth is required.';
    } else if (isDateInFuture(dateOfBirth)) {
      next.dateOfBirth = 'Date of birth cannot be in the future.';
    } else if (calculateAge(dateOfBirth) < 18) {
      next.dateOfBirth = 'You must be at least 18 years old.';
    }

    setErrors(next);
    if (Object.keys(next).length) return;

    onNext({ phoneNumber: phoneNumber.trim(), dateOfBirth });
  }

  return (
    <StepShell title="Tell us a little more" subtitle="Used only for account security, never shown publicly.">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          label="Phone number"
          name="phoneNumber"
          type="tel"
          autoFocus
          prefix="+92"
          placeholder="300 1234567"
          value={phoneNumber}
          error={errors.phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />
        <Input
          label="Date of birth"
          name="dateOfBirth"
          type="date"
          max={new Date().toISOString().split('T')[0]}
          value={dateOfBirth}
          error={errors.dateOfBirth}
          hint="You must be 18 or older to use Ring."
          onChange={(e) => setDateOfBirth(e.target.value)}
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
