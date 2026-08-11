import { useRef, useState } from 'react';
import { Image as ImageIcon, MapPin, Send, X } from 'lucide-react';
import EmojiPicker from './EmojiPicker';

const MAX_IMAGE_MB = 10;

export default function MessageInput({
  onSend,
  onSendLocation,
  onSendImage,
  onTyping,
  disabled,
  replyingTo,
  onCancelReply,
}) {
  const [value, setValue] = useState('');
  const [sharingLocation, setSharingLocation] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [sendingImage, setSendingImage] = useState(false);
  const typingTimeout = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

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

  function handlePickImage(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) return;
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      alert(`Image must be under ${MAX_IMAGE_MB}MB.`);
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (disabled) return;

    if (imageFile) {
      setSendingImage(true);
      try {
        await onSendImage?.(imageFile, value.trim(), replyingTo?.id || null);
      } finally {
        setSendingImage(false);
        clearImage();
        setValue('');
        onTyping?.(false);
        onCancelReply?.();
      }
      return;
    }

    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed, replyingTo?.id || null);
    setValue('');
    onTyping?.(false);
    onCancelReply?.();
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
    <div className="border-t border-line bg-surface-card">
      {replyingTo && (
        <div className="flex items-center gap-3 border-b border-line bg-surface-sunken px-5 py-2.5">
          <div className="min-w-0 flex-1 border-l-2 border-brand-500 pl-3">
            <p className="text-xs font-semibold text-brand-600">
              Replying to {replyingTo.senderName || 'message'}
            </p>
            <p className="truncate text-xs text-ink-muted">
              {replyingTo.type === 'image'
                ? 'Photo'
                : replyingTo.type === 'location'
                ? 'Shared location'
                : replyingTo.text}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-card hover:text-ink"
            aria-label="Cancel reply"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {imagePreview && (
        <div className="flex items-center gap-3 border-b border-line px-5 py-3">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-line">
            <img src={imagePreview} alt="Selected" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={clearImage}
              disabled={sendingImage}
              className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink/70 text-white hover:bg-ink disabled:opacity-60"
              aria-label="Remove image"
            >
              <X size={12} />
            </button>
          </div>
          <p className="text-xs text-ink-muted">
            {sendingImage ? 'Sending...' : 'Add a caption (optional) and hit send'}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-3 px-5 py-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePickImage}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || sendingImage}
          title="Send a photo"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-surface-sunken hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ImageIcon size={20} />
        </button>
        <button
          type="button"
          onClick={handleShareLocation}
          disabled={disabled || sharingLocation || !!imageFile}
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
          placeholder={imageFile ? 'Add a caption...' : 'Type a message...'}
          disabled={disabled || sendingImage}
          className="h-12 flex-1 rounded-xl border border-line bg-surface-sunken px-4 text-[15px] text-ink placeholder:text-ink-faint focus:border-brand-500 focus:bg-surface-card focus:outline-none focus:shadow-ring disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={disabled || sendingImage || (!value.trim() && !imageFile)}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-400 text-ink transition-all hover:bg-brand-500 active:scale-95 disabled:cursor-not-allowed disabled:bg-brand-300"
          aria-label="Send message"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}
