import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import StepProgress from '../components/auth/StepProgress';
import StepName from '../components/auth/steps/StepName';
import StepEmail from '../components/auth/steps/StepEmail';
import StepUsername from '../components/auth/steps/StepUsername';
import StepDetails from '../components/auth/steps/StepDetails';
import StepPassword from '../components/auth/steps/StepPassword';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const TOTAL_STEPS = 5;

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({});
  const [usernameError, setUsernameError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function goNext(partial) {
    setFormData((prev) => ({ ...prev, ...partial }));
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function goBack() {
    setUsernameError('');
    setStep((s) => Math.max(s - 1, 1));
  }

  async function handleFinalSubmit({ password }) {
    const finalData = { ...formData, password };
    const payload = {
      name: `${finalData.firstName} ${finalData.lastName}`,
      username: finalData.username,
      email: finalData.email,
      phoneNumber: finalData.phoneNumber,
      dateOfBirth: finalData.dateOfBirth,
      password: finalData.password,
    };

    setSubmitting(true);
    try {
      await register(payload);
      navigate('/register/success', { replace: true, state: { email: payload.email } });
    } catch (err) {
      const message = err.message || 'Something went wrong. Please try again.';
      if (/username/i.test(message)) {
        setUsernameError('This username is already taken.');
        setStep(3);
      } else if (/email/i.test(message)) {
        toast.error('Email is already registered.');
        setStep(2);
      } else {
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <StepProgress step={step} total={TOTAL_STEPS} />

      {step === 1 && <StepName data={formData} onNext={goNext} />}
      {step === 2 && <StepEmail data={formData} onNext={goNext} onBack={goBack} />}
      {step === 3 && (
        <StepUsername
          data={formData}
          onNext={goNext}
          onBack={goBack}
          serverError={usernameError}
        />
      )}
      {step === 4 && <StepDetails data={formData} onNext={goNext} onBack={goBack} />}
      {step === 5 && (
        <StepPassword onNext={handleFinalSubmit} onBack={goBack} submitting={submitting} />
      )}

      <p className="mt-7 text-center text-[15px] text-ink-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand-600 hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
