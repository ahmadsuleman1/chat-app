import { useRef, useState, useEffect } from 'react';
import { Image as ImageIcon, MapPin, Send, Mic, Trash2, Check, X } from 'lucide-react';
import EmojiPicker from './EmojiPicker';
import { useToast } from '../../context/ToastContext';

const MAX_IMAGE_MB = 10;

export default function MessageInput({
  onSend,
  onSendLocation,
  onSendImage,
  onSendVoice,
  onTyping,
  onVoiceRecordingStart,
  onVoiceRecordingStop,
  disabled,
  replyingTo,
  onCancelReply,
}) {
  const toast = useToast();
  const [value, setValue] = useState('');
  const [sharingLocation, setSharingLocation] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [sendingImage, setSendingImage] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  const typingTimeout = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const shouldCancelRef = useRef(false);
  // Ref mirror of recordSeconds so onstop always reads the true final value
  // (React state inside the onstop closure is stale due to async batching).
  const recordSecondsRef = useRef(0);

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  function getSupportedMimeType() {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/aac',
    ];
    for (const type of types) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  }

  function handleEmojiSelect(emoji) {
    setValue((prev) => prev + emoji);
    inputRef.current?.focus();
  }

  // ---- Voice Recording Logic ----
  async function handleStartRecording() {
    if (disabled || isRecording || sendingImage) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast.error('Voice recording is not supported in this browser.');
      return;
    }

    try {
      shouldCancelRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (recordTimerRef.current) {
          clearInterval(recordTimerRef.current);
          recordTimerRef.current = null;
        }

        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }

        onVoiceRecordingStop?.();

        if (!shouldCancelRef.current && audioChunksRef.current.length > 0) {
          const finalType = mediaRecorder.mimeType || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: finalType });
          // Use the ref value — it's always up-to-date even inside this closure,
          // unlike the stale `recordSeconds` state snapshot.
          const finalDuration = recordSecondsRef.current > 0 ? recordSecondsRef.current : 1;
          onSendVoice?.(audioBlob, finalDuration);
        }

        recordSecondsRef.current = 0;
        setRecordSeconds(0);
        setIsRecording(false);
        shouldCancelRef.current = false;
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      recordSecondsRef.current = 0;
      setRecordSeconds(0);
      onVoiceRecordingStart?.();

      recordTimerRef.current = setInterval(() => {
        recordSecondsRef.current += 1;
        setRecordSeconds(recordSecondsRef.current);
      }, 1000);
    } catch (err) {
      console.error('Mic access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast.error('Microphone permission was denied. Please allow microphone access in your browser.');
      } else {
        toast.error(err.message || 'Could not start voice recording.');
      }
    }
  }

  function handleStopAndSendRecording() {
    if (mediaRecorderRef.current && isRecording) {
      shouldCancelRef.current = false;
      mediaRecorderRef.current.stop();
    }
  }

  function handleCancelRecording() {
    if (mediaRecorderRef.current && isRecording) {
      shouldCancelRef.current = true;
      mediaRecorderRef.current.stop();
      toast.info('Voice recording canceled');
    }
  }

  function handleMicClick() {
    if (isRecording) {
      handleStopAndSendRecording();
    } else {
      handleStartRecording();
    }
  }

  // ---- Text & Image message logic ----
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
      toast.error(`Image must be under ${MAX_IMAGE_MB}MB.`);
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

    if (isRecording) {
      handleStopAndSendRecording();
      return;
    }

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
    if (disabled || sharingLocation || isRecording || !!imageFile || !onSendLocation) return;

    if (!navigator.geolocation) {
      toast.error('Location is not supported on this device.');
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
      (err) => {
        toast.error(err?.message || "Couldn't get your location. Check location permissions.");
        setSharingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
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
                : replyingTo.type === 'voice'
                ? 'Voice note'
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

      <form onSubmit={handleSubmit} className="flex items-end gap-2 px-3 py-3 sm:gap-3 sm:px-5 sm:py-4">
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
          disabled={disabled || sendingImage || isRecording}
          title="Send a photo"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-surface-sunken hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-60 sm:h-12 sm:w-12"
        >
          <ImageIcon size={20} />
        </button>
        <button
          type="button"
          onClick={handleShareLocation}
          disabled={disabled || sharingLocation || !!imageFile || isRecording}
          title="Share your current location"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-surface-sunken hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-60 sm:h-12 sm:w-12"
        >
          <MapPin size={20} className={sharingLocation ? 'animate-pulse' : ''} />
        </button>
        <EmojiPicker onSelect={handleEmojiSelect} />

        {isRecording ? (
          <div className="flex h-11 flex-1 items-center justify-between gap-2 rounded-xl border border-red-400/50 bg-red-50/50 px-3 text-red-700 dark:bg-red-950/20 dark:text-red-300 sm:h-12 sm:px-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
              <span className="font-mono text-xs font-semibold sm:text-sm">
                Recording {formatTime(recordSeconds)}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCancelRecording}
                title="Cancel recording"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/40"
              >
                <Trash2 size={16} />
              </button>
              <button
                type="button"
                onClick={handleStopAndSendRecording}
                title="Send voice note"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500 text-white hover:bg-red-600"
              >
                <Check size={16} />
              </button>
            </div>
          </div>
        ) : (
          <input
            ref={inputRef}
            value={value}
            onChange={handleChange}
            placeholder={imageFile ? 'Add a caption...' : 'Type a message...'}
            disabled={disabled || sendingImage}
            className="h-11 flex-1 rounded-xl border border-line bg-surface-sunken px-4 text-[15px] text-ink placeholder:text-ink-faint focus:border-brand-500 focus:bg-surface-card focus:outline-none focus:shadow-ring disabled:opacity-60 sm:h-12"
          />
        )}

        {!isRecording && (
          <button
            type="button"
            onClick={handleMicClick}
            disabled={disabled || sendingImage || !!imageFile}
            title="Record voice message"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-surface-sunken hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-60 sm:h-12 sm:w-12"
          >
            <Mic size={20} />
          </button>
        )}

        {!isRecording && (
          <button
            type="submit"
            disabled={disabled || sendingImage || (!value.trim() && !imageFile)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-400 text-ink transition-all hover:bg-brand-500 active:scale-95 disabled:cursor-not-allowed disabled:bg-brand-300 sm:h-12 sm:w-12"
            aria-label="Send message"
          >
            <Send size={20} />
          </button>
        )}
      </form>
    </div>
  );
}