import { Check, CheckCheck, MapPin } from 'lucide-react';

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageBubble({ message, isOwn, senderName }) {
  const { text, createdAt, status, type, location } = message;
  const isLocation = type === 'location';

  return (
    <div className={`flex animate-rise-in ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[78%] rounded-2xl text-sm leading-relaxed sm:max-w-[65%] ${
          isLocation ? 'p-0 overflow-hidden' : 'px-4 py-2.5'
        } ${
          isOwn
            ? 'rounded-br-sm bg-brand-400 text-ink'
            : 'rounded-bl-sm border border-line bg-surface-card text-ink'
        }`}
      >
        {!isOwn && senderName && (
          <p className="px-4 pt-2 text-xs font-semibold text-brand-600">{senderName}</p>
        )}

        {isLocation ? (
          <a
            href={`https://www.google.com/maps?q=${location.lat},${location.lng}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 px-4 py-3"
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                isOwn ? 'bg-ink/10' : 'bg-brand-50'
              }`}
            >
              <MapPin size={18} className={isOwn ? 'text-ink' : 'text-brand-600'} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Shared location</p>
              <p className={`truncate text-xs ${isOwn ? 'text-ink/70' : 'text-ink-muted'}`}>
                Open in Google Maps
              </p>
            </div>
          </a>
        ) : (
          <p className={`whitespace-pre-wrap break-words ${!isOwn && senderName ? 'px-4' : ''}`}>
            {text}
          </p>
        )}

        <div
          className={`flex items-center justify-end gap-1 pb-2 pr-4 font-mono text-[10px] ${
            isOwn ? 'text-ink/60' : 'text-ink-faint'
          } ${isLocation ? 'pt-1' : 'mt-1'}`}
        >
          <span>{formatTime(createdAt)}</span>
          {isOwn && status === 'seen' && <CheckCheck size={13} className="text-blue-600" />}
          {isOwn && status === 'delivered' && <CheckCheck size={13} />}
          {isOwn && status === 'sent' && <Check size={13} />}
        </div>
      </div>
    </div>
  );
}
