import { useRef, useState } from 'react';
import { MapPin, Send } from 'lucide-react';
import EmojiPicker from './EmojiPicker';

export default function MessageInput({ onSend, onSendLocation, onTyping, disabled }) {
  const [value, setValue] = useState('');
  const [sharingLocation, setSharingLocation] = useState(false);
  const typingTimeout = useRef(null);
  const inputRef = useRef(null);

  function handleEmojiSelect(emoji) {
    setValue((prev) => prev + emoji);
    inputRef.current?.focus();
  }

  function handleChange(e) {
    setValue(e.target.value);
    onTyping?.(true);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => onTyping?.(false), 1500);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    onTyping?.(false);
  }

  function handleShareLocation() {
    if (disabled || sharingLocation || !onSendLocation) return;

    if (!navigator.geolocation) {
      onSendLocation({ error: 'Location is not supported on this device.' });
      return;
    }

    setSharingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onSendLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setSharingLocation(false);
      },
      () => {
        onSendLocation({ error: "Couldn't get your location. Check location permissions." });
        setSharingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-3 border-t border-line bg-surface-card px-5 py-4"
    >
      <button
        type="button"
        onClick={handleShareLocation}
        disabled={disabled || sharingLocation}
        title="Share your current location"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-surface-sunken hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <MapPin size={20} className={sharingLocation ? 'animate-pulse' : ''} />
      </button>
      <EmojiPicker onSelect={handleEmojiSelect} />
      <input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        placeholder="Type a message..."
        disabled={disabled}
        className="h-12 flex-1 rounded-xl border border-line bg-surface-sunken px-4 text-[15px] text-ink placeholder:text-ink-faint focus:border-brand-500 focus:bg-surface-card focus:outline-none focus:shadow-ring disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-400 text-ink transition-all hover:bg-brand-500 active:scale-95 disabled:cursor-not-allowed disabled:bg-brand-300"
        aria-label="Send message"
      >
        <Send size={20} />
      </button>
    </form>
  );
}
