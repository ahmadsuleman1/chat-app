import { MessageCircle } from 'lucide-react';

export default function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50">
        <MessageCircle size={26} className="text-brand-500" />
      </div>
      <h2 className="font-display text-lg font-semibold text-ink">Select a conversation</h2>
      <p className="mt-1.5 max-w-xs text-sm text-ink-muted">
        Choose a conversation from the sidebar to start chatting.
      </p>
    </div>
  );
}
