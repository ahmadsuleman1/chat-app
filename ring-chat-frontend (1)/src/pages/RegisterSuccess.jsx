import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import Button from '../components/ui/Button';
import { useToast } from '../context/ToastContext';
import { authService } from '../services/authService';

export default function RegisterSuccess() {
  const location = useLocation();
  const toast = useToast();
  const email = location.state?.email;

  const [resending, setResending] = useState(false);

  async function handleResend() {
    if (!email) return;
    setResending(true);
    try {
      await authService.resendVerification(email);
      toast.success('Verification email sent again.');
    } catch (err) {
      toast.error(err.message || 'Something went wrong. Please try again.');
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthLayout>
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-success-bg">
          <MailCheck size={30} className="text-success" />
        </div>
        <h1 className="font-display text-2xl font-bold text-ink">Check your email</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">
          {email ? (
            <>
              We've sent a verification link to{' '}
              <span className="font-semibold text-ink">{email}</span>. Click it to activate your
              account — the link expires in 15 minutes.
            </>
          ) : (
            "We've sent a verification link to your email. Click it to activate your account before logging in."
          )}
        </p>

        <Link to="/login" className="mt-7 block">
          <Button size="lg" fullWidth>Continue to login</Button>
        </Link>

        {email && (
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="mt-4 text-sm font-semibold text-brand-600 hover:underline disabled:opacity-60"
          >
            {resending ? 'Sending...' : "Didn't get it? Resend the email"}
          </button>
        )}
      </div>
    </AuthLayout>
  );
}
