const SIZES = {
  xs: { box: 'h-5 w-5', text: 'text-[9px]', ring: '-inset-[2px]', dot: 'h-1.5 w-1.5', dotPos: '-bottom-0 -right-0' },
  sm: { box: 'h-8 w-8', text: 'text-xs', ring: '-inset-[3px]', dot: 'h-2 w-2', dotPos: '-bottom-0 -right-0' },
  md: { box: 'h-10 w-10', text: 'text-sm', ring: '-inset-[3px]', dot: 'h-2.5 w-2.5', dotPos: '-bottom-0 -right-0' },
  lg: { box: 'h-14 w-14', text: 'text-lg', ring: '-inset-1', dot: 'h-3.5 w-3.5', dotPos: '-bottom-0.5 -right-0.5' },
  xl: { box: 'h-24 w-24', text: 'text-3xl', ring: '-inset-1.5', dot: 'h-5 w-5', dotPos: '-bottom-1 -right-1' },
};

function initialsOf(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '?';
}

/**
 * Avatar + "presence ring" — the app's signature identity element.
 * A soft animated ring traces the avatar when the person is online,
 * and pulses outward once to signal a fresh online transition.
 */
export default function Avatar({
  name,
  src,
  size = 'md',
  status, // 'online' | 'offline' | undefined (unknown / hide)
  ring = true,
  className = '',
}) {
  const s = SIZES[size];
  const isOnline = status === 'online';

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      {ring && (
        <span
          className={`absolute ${s.ring} rounded-full transition-opacity duration-300 ${
            isOnline ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            background: isOnline
              ? 'conic-gradient(from 180deg, #FACC15, #FDE047, #FACC15)'
              : 'transparent',
            padding: '2px',
            WebkitMask:
              'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          }}
          aria-hidden="true"
        />
      )}
      <div
        className={`${s.box} relative flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand-400 to-brand-600 font-display font-semibold text-ink ${s.text}`}
      >
        {src ? (
          <img src={src} alt={name || 'User avatar'} className="h-full w-full object-cover" />
        ) : (
          <span>{initialsOf(name)}</span>
        )}
      </div>
      {status && (
        <span
          className={`absolute ${s.dotPos} ${s.dot} rounded-full border-2 border-surface-card ${
            isOnline ? 'bg-success' : 'bg-ink-faint'
          }`}
          aria-label={isOnline ? 'Online' : 'Offline'}
        >
          {isOnline && (
            <span className="absolute inset-0 rounded-full bg-success animate-pulse-ring" />
          )}
        </span>
      )}
    </div>
  );
}
