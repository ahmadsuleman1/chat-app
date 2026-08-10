import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import Input from '../components/ui/Input';
import PasswordInput from '../components/auth/PasswordInput';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { isValidEmail } from '../utils/validators';

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate() {
    const next = {};
    if (!form.email.trim()) next.email = 'Email is required.';
    else if (!isValidEmail(form.email)) next.email = 'Enter a valid email address.';
    if (!form.password) next.password = 'Password is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await login({ email: form.email.trim(), password: form.password });
      const redirectTo = location.state?.from || '/profile-setup';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      if (err.status === 403) {
        toast.error(err.message || 'Please verify your email before logging in.');
        navigate('/resend-verification', { state: { email: form.email.trim() } });
        return;
      }
      toast.error(err.message || 'Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-bold text-ink">Welcome back</h1>
        <p className="mt-2 text-[15px] text-ink-muted">Log in to keep the conversation going.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          placeholder="yourname@gmail.com"
          value={form.email}
          error={errors.email}
          className="h-12 text-[15px]"
          onChange={(e) => update('email', e.target.value)}
        />
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-ink-soft">
              Password
            </label>
            <Link to="/forgot-password" className="text-xs font-semibold text-brand-600 hover:underline">
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            name="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={form.password}
            error={errors.password}
            className="h-12 text-[15px]"
            onChange={(e) => update('password', e.target.value)}
          />
        </div>

        <Button type="submit" size="lg" fullWidth loading={submitting} disabled={submitting}>
          {submitting ? 'Signing in...' : 'Log in'}
        </Button>
      </form>

      <div className="my-7 flex items-center gap-3">
        <div className="h-px flex-1 bg-line" />
        <span className="text-xs font-medium uppercase tracking-wide text-ink-faint">or</span>
        <div className="h-px flex-1 bg-line" />
      </div>

      <p className="text-center text-[15px] text-ink-muted">
        Don't have an account?{' '}
        <Link to="/register" className="font-semibold text-brand-600 hover:underline">
          Create one
        </Link>
      </p>
    </AuthLayout>
  );
}
