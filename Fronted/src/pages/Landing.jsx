import { Link } from 'react-router-dom';
import { ArrowRight, Radio } from 'lucide-react';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';

export default function Landing() {
  return (
    <div className="min-h-screen bg-surface">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink font-display text-sm font-bold text-brand-400">
            R
          </div>
          <span className="font-display text-lg font-semibold">Ring</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/login">
            <Button variant="ghost" size="sm">Log in</Button>
          </Link>
          <Link to="/register">
            <Button variant="primary" size="sm">Sign up</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-12 md:py-20 lg:grid-cols-2">
        <div className="animate-rise-in">
          <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-card px-3 py-1 font-mono text-xs text-ink-muted">
            <Radio size={12} className="text-brand-500" />
            presence, in real time
          </span>
          <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl lg:text-6xl">
            Know who's here.
            <br />
            <span className="text-brand-500">Talk when it counts.</span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-ink-muted">
            Ring is a fast, focused messenger. A single glowing ring around every
            avatar tells you who's around right now — no guessing, no stale
            "last seen an hour ago."
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/register">
              <Button size="lg" icon={ArrowRight} className="flex-row-reverse">
                Create your account
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg">
                I already have an account
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="w-full max-w-sm rounded-xl2 border border-line bg-surface-card p-5 shadow-lift">
            <div className="mb-4 flex items-center gap-3 border-b border-line pb-4">
              <Avatar name="Ayesha Khan" status="online" size="md" />
              <div>
                <p className="text-sm font-semibold text-ink">Ayesha Khan</p>
                <p className="text-xs text-success">Online</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="max-w-[75%] rounded-2xl rounded-bl-sm bg-surface-sunken px-4 py-2.5 text-sm text-ink">
                Are you free for a quick call?
              </div>
              <div className="ml-auto max-w-[75%] rounded-2xl rounded-br-sm bg-brand-400 px-4 py-2.5 text-sm text-ink">
                Yep, calling you now 🎧
              </div>
            </div>
          </div>
          <div
            className="absolute -z-10 h-72 w-72 rounded-full bg-brand-300/30 blur-3xl"
            aria-hidden="true"
          />
        </div>
      </main>
    </div>
  );
}
