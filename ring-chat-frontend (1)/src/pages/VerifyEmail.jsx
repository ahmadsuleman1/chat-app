import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import Button from '../components/ui/Button';
import { authService } from '../services/authService';

export default function VerifyEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [message, setMessage] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    async function run() {
      try {
        const data = await authService.verifyEmail(token);
        setStatus('success');
        setMessage(data.message || 'Your email has been verified.');
      } catch (err) {
        setStatus('error');
        setMessage(err.message || 'This verification link is invalid or has expired.');
      }
    }

    run();
  }, [token]);

  return (
    <AuthLayout>
      <div className="text-center">
        {status === 'verifying' && (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-surface-sunken">
              <Loader2 size={32} className="animate-spin text-brand-500" />
            </div>
            <h1 className="font-display text-2xl font-bold text-ink">Verifying your email...</h1>
            <p className="mt-2 text-[15px] text-ink-muted">This will just take a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-success-bg">
              <CheckCircle2 size={32} className="text-success" />
            </div>
            <h1 className="font-display text-2xl font-bold text-ink">Email verified</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{message}</p>
            <Link to="/login" className="mt-7 block">
              <Button size="lg" fullWidth>Continue to login</Button>
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-danger-bg">
              <XCircle size={32} className="text-danger" />
            </div>
            <h1 className="font-display text-2xl font-bold text-ink">Verification failed</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{message}</p>
            <Link to="/resend-verification" className="mt-7 block">
              <Button size="lg" fullWidth>Resend verification email</Button>
            </Link>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
