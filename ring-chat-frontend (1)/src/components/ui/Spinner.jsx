export default function Spinner({ size = 20, className = '', label }) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`} role="status">
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className="animate-spin text-brand-500"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
        <path
          d="M22 12a10 10 0 0 0-10-10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      {label && <span className="text-sm text-ink-muted">{label}</span>}
    </div>
  );
}

export function FullPageSpinner({ label = 'Loading...' }) {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-surface">
      <Spinner size={28} label={label} />
    </div>
  );
}
