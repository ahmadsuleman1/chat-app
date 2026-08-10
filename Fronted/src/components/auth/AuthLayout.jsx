import { Link } from 'react-router-dom';
import { Radio } from 'lucide-react';
import Avatar from '../ui/Avatar';

/**
 * Shared shell for every auth screen (login, register, verify, forgot/reset
 * password). Mirrors the big, centered-card feel of Google's sign-in and
 * Instagram's split-screen layout: a wide branding panel on desktop, a
 * generously-padded card on every screen size.
 */
export default function AuthLayout({ children, cardClassName = '' }) {
  return (
    <div className="flex min-h-screen bg-surface">
      {/* Branding panel — visible from lg breakpoint up, Instagram-style */}
      <div className="relative hidden w-[46%] shrink-0 items-center justify-center overflow-hidden bg-ink lg:flex">
        <div
          className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-32 -right-16 h-[28rem] w-[28rem] rounded-full bg-brand-300/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative z-10 flex max-w-md flex-col items-center px-10 text-center">
          <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-400 font-display text-2xl font-bold text-ink shadow-lift">
            R
          </div>


          <div className="mt-10 w-full rounded-xl2 border border-white/10 bg-white/[0.04] p-5 text-left shadow-lift backdrop-blur animate-stay-fade">
            <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-4">
              <Avatar name="Ayesha Khan" status="online" size="md" />
              <div>
                <p className="text-sm font-semibold text-white">Ayesha Khan</p>
                <p className="flex items-center gap-1 text-xs text-brand-300">
                  <Radio size={10} /> Online now
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-white/10 px-4 py-2.5 text-sm text-white">
                Are you free for a quick call?
              </div>
              <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-brand-400 px-4 py-2.5 text-sm text-ink">
                Yep, calling you now 🎧
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-xl">
          <Link
            to="/"
            className="mx-auto mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-ink font-display text-lg font-bold text-brand-400 lg:hidden"
          >
            R
          </Link>

          <div
            className={`animate-rise-in rounded-2xl border border-line bg-surface-card p-8 shadow-soft sm:p-10 ${cardClassName}`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
