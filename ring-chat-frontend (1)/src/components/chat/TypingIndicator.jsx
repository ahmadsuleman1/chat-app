export default function TypingIndicator({ name }) {
  return (
    <div className="flex animate-rise-in items-center gap-2 px-1">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-line bg-surface-card px-3.5 py-2.5">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-faint [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-faint [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-faint" />
      </div>
      {name && <span className="text-xs text-ink-faint">{name} is typing...</span>}
    </div>
  );
}
