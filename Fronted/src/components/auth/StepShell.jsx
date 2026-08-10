export default function StepShell({ title, subtitle, children }) {
  return (
    <div className="animate-rise-in">
      <h1 className="font-display text-3xl font-bold text-ink">{title}</h1>
      {subtitle && <p className="mt-2 text-[15px] text-ink-muted">{subtitle}</p>}
      <div className="mt-7">{children}</div>
    </div>
  );
}
