export default function StepProgress({ step, total }) {
  return (
    <div className="mb-8">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-xs font-medium tracking-wide text-ink-muted">
          STEP {step} / {total}
        </span>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              i < step ? 'bg-brand-400' : 'bg-line'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
