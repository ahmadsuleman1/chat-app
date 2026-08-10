import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary:
    'bg-brand-400 text-ink hover:bg-brand-500 active:bg-brand-600 shadow-soft disabled:bg-brand-300',
  dark: 'bg-ink text-white hover:bg-ink-soft active:bg-black disabled:bg-ink-faint',
  ghost: 'bg-transparent text-ink hover:bg-surface-sunken active:bg-line disabled:text-ink-faint',
  outline:
    'bg-transparent border border-line text-ink hover:border-ink-faint hover:bg-surface-sunken disabled:text-ink-faint',
  danger: 'bg-danger text-white hover:bg-red-700 disabled:bg-red-300',
};

const SIZES = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon: Icon,
  className = '',
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold
        transition-all duration-150 ease-out
        focus-visible:outline-none focus-visible:shadow-ring
        disabled:cursor-not-allowed disabled:opacity-70
        active:scale-[0.98]
        ${VARIANTS[variant]} ${SIZES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {!loading && Icon && <Icon size={16} />}
      {children}
    </button>
  );
}
