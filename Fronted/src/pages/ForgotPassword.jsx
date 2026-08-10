import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck, ArrowLeft } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useToast } from '../context/ToastContext';
import { authService } from '../services/authService';
import { isValidEmail } from '../utils/validators';

export default function ForgotPassword() {
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return setError('Email is required.');
    if (!isValidEmail(email)) return setError('Enter a valid email address.');
    setError('');

    setSubmitting(true);
    try {
      await authService.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      toast.error(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <AuthLayout>
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-success-bg">
            <MailCheck size={30} className="text-success" />
          </div>
          <h1 className="font-display text-2xl font-bold text-ink">Check your inbox</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">
            If <span className="font-semibold text-ink">{email.trim()}</span> is registered,
            we've sent a link to reset your password. It expires in 15 minutes.
          </p>
          <Link to="/login" className="mt-7 block">
            <Button size="lg" variant="outline" fullWidth>Back to login</Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <Link
        to="/login"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={15} /> Back to login
      </Link>

      <h1 className="font-display text-3xl font-bold text-ink">Forgot your password?</h1>
      <p className="mt-2 text-[15px] text-ink-muted">
        Enter your email and we'll send you a link to reset it.
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-5">
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          placeholder="yourname@gmail.com"
          value={email}
          error={error}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" size="lg" fullWidth loading={submitting} disabled={submitting}>
          {submitting ? 'Sending...' : 'Send reset link'}
        </Button>
      </form>
    </AuthLayout>
  );
}
