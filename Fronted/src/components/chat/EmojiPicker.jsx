import { useEffect, useRef, useState } from 'react';
import { Smile } from 'lucide-react';

const EMOJI_GROUPS = {
  'Smileys': ['😀', '😁', '😂', '🤣', '😊', '😍', '😘', '😉', '😎', '🤩', '🥳', '😇', '🙂', '😅', '😆', '🤗', '🤔', '😴', '😜', '🤪'],
  'Reactions': ['❤️', '🔥', '👍', '👎', '👏', '🙌', '🙏', '💯', '✨', '🎉', '😢', '😭', '😡', '😱', '😳', '🥺', '😐', '😴', '💔', '💕'],
  'People': ['👋', '🤝', '💪', '🫶', '🤙', '✌️', '👊', '🤞', '🫡', '🙋', '🧑‍💻', '🕺', '💃'],
  'Objects': ['🎂', '☕', '🍕', '🍔', '🎁', '🎈', '📸', '🎵', '⚽', '🏆', '💼', '📱', '💡', '⏰', '🌙', '☀️', '🌧️', '🔥'],
};

export default function EmojiPicker({ onSelect }) {
  const [open, setOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState('Smileys');
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Emoji"
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-surface-sunken hover:text-brand-600 ${
          open ? 'bg-surface-sunken text-brand-600' : 'text-ink-muted'
        }`}
      >
        <Smile size={20} />
      </button>

      {open && (
        <div className="absolute bottom-14 left-0 z-40 w-72 animate-pop-in rounded-xl2 border border-line bg-surface-card p-3 shadow-lift">
          <div className="mb-2 flex gap-1 border-b border-line pb-2">
            {Object.keys(EMOJI_GROUPS).map((group) => (
              <button
                key={group}
                type="button"
                onClick={() => setActiveGroup(group)}
                className={`rounded-lg px-2 py-1 text-[11px] font-medium transition-colors ${
                  activeGroup === group
                    ? 'bg-brand-400 text-ink'
                    : 'text-ink-muted hover:bg-surface-sunken'
                }`}
              >
                {group}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 max-h-48 overflow-y-auto">
            {EMOJI_GROUPS[activeGroup].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onSelect(emoji);
                  setOpen(false);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-transform hover:scale-125 hover:bg-surface-sunken"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
