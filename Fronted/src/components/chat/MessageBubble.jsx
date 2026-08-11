import { useState } from 'react';
import { Check, CheckCheck, ImageOff, Loader2, MapPin, X } from 'lucide-react';

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageBubble({ message, isOwn, senderName }) {
  const { text, createdAt, status, type, location, attachment, uploading } = message;
  const isLocation = type === 'location';
  const isImage = type === 'image';
  const [imageFailed, setImageFailed] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  return (
    <div className={`flex animate-rise-in ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[78%] rounded-2xl text-sm leading-relaxed sm:max-w-[65%] ${
          isLocation || isImage ? 'p-0 overflow-hidden' : 'px-4 py-2.5'
        } ${
          isOwn
            ? 'rounded-br-sm bg-gradient-to-br from-brand-300 to-brand-500 text-ink shadow-[0_2px_8px_-2px_rgba(234,179,8,0.4)]'
            : 'rounded-bl-sm border border-line bg-surface-card text-ink'
        }`}
      >
        {!isOwn && senderName && (
          <p className="px-4 pt-2 text-xs font-semibold text-brand-600">{senderName}</p>
        )}

        {isImage ? (
          <div className="relative">
            {imageFailed ? (
              <div className="flex h-40 w-56 flex-col items-center justify-center gap-1.5 bg-surface-sunken text-ink-faint">
                <ImageOff size={22} />
                <span className="text-xs">Couldn't load image</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => !uploading && setLightboxOpen(true)}
                className="block max-h-72 w-full max-w-72"
              >
                <img
                  src={attachment}
                  alt="Shared"
                  onError={() => setImageFailed(true)}
                  className={`h-full max-h-72 w-full object-cover ${uploading ? 'opacity-60' : ''}`}
                />
              </button>
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-ink/20">
                <Loader2 size={22} className="animate-spin text-white" />
              </div>
            )}
            {text && (
              <p className={`whitespace-pre-wrap break-words px-4 py-2 ${!isOwn && senderName ? '' : ''}`}>
                {text}
              </p>
            )}
          </div>
        ) : isLocation ? (
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
          } ${isLocation || isImage ? 'pt-1' : 'mt-1'}`}
        >
          <span>{formatTime(createdAt)}</span>
          {isOwn && status === 'read' && <CheckCheck size={13} className="text-blue-600" />}
          {isOwn && status === 'delivered' && <CheckCheck size={13} />}
          {isOwn && status === 'sent' && <Check size={13} />}
        </div>
      </div>

      {isImage && lightboxOpen && (
        <div
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Close"
          >
            <X size={18} />
          </button>
          <img
            src={attachment}
            alt="Shared"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
          />
        </div>
      )}
    </div>
  );
}
