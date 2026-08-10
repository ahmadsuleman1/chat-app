import { Radio } from 'lucide-react';
import Avatar from '../ui/Avatar';

export default function AuthLayout({ children, cardClassName = '' }) {
  return (
    <div className="min-h-screen bg-surface text-ink">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">

        {/* Left branding / preview panel */}
        <div className="relative flex min-h-[420px] items-center justify-center overflow-hidden bg-surface px-6 py-12 lg:min-h-screen">
          
          {/* Background glow */}
          <div
            className="absolute left-1/2 top-1/2 -z-0 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-300/30 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative z-10 flex max-w-md flex-col items-center px-10 text-center">

            {/* Logo */}
            <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-400 font-display text-2xl font-bold text-ink shadow-lift">
              R
            </div>

            {/* Chat preview */}
            <div className="mt-10 w-full rounded-xl2 border border-black/10 bg-white/70 p-5 text-left shadow-lift backdrop-blur animate-stay-fade">

              {/* User */}
              <div className="mb-4 flex items-center gap-3 border-b border-black/10 pb-4">
                <Avatar
                  name="Ayesha Khan"
                  status="online"
                  size="md"
                />

                <div>
                  <p className="text-sm font-semibold text-zinc-800">
                    Ayesha Khan
                  </p>

                  <p className="flex items-center gap-1 text-xs text-brand-600">
                    <Radio size={10} />
                    Online now
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="space-y-3">

                {/* Incoming message */}
                <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-zinc-100 px-4 py-2.5 text-sm text-zinc-800">
                  Are you free for a quick call?
                </div>

                {/* Outgoing message */}
                <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-brand-400 px-4 py-2.5 text-sm text-zinc-800">
                  Yep, calling you now 🎧
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Right form panel */}
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 py-12">
          <div
            className={`w-full max-w-md animate-rise-in rounded-2xl border border-line bg-surface-card p-8 shadow-soft sm:p-10 ${cardClassName}`}
          >
            {children}
          </div>
        </div>

      </div>
    </div>
  );
}