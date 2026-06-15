'use client';

/**
 * OwnerInheritanceClaimBanner — app-wide alarm for an active inheritance (continuity) claim (Wave 88).
 *
 * THE GAP THIS CLOSES: recovery claims raise a loud, app-wide OwnerChallengeBanner so a returning owner
 * cannot miss them. Inheritance claims — which transfer the vault to heirs if the owner is presumed gone —
 * had NO equivalent app-level alarm. In the false-activation / owner-returns scenario (the owner was
 * hospitalized, traveling, or briefly unreachable, and a guardian initiated a claim), the owner would open
 * the app and see nothing unless they happened to visit the inheritance pages — even though they hold the
 * single-action ownerOverrideClaim power to cancel it. This banner makes an active claim impossible to miss
 * during the 30-day veto window, with one tap to override.
 *
 * Fires only in STATE_VETO_PERIOD (1) — the window in which the owner can still override. It never fires
 * during normal operation (state 0) or after the veto window has passed.
 */

import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, Loader2, ShieldCheck } from 'lucide-react';
import { useInheritance } from '@/hooks/useInheritance';

const STATE_VETO_PERIOD = 1;

function formatRemaining(windowEnd: number, nowSec: number): string {
  const secs = Math.max(0, windowEnd - nowSec);
  const days = Math.floor(secs / 86400);
  const hours = Math.floor((secs % 86400) / 3600);
  if (days > 0) return `${days} day${days === 1 ? '' : 's'}${hours > 0 ? ` ${hours}h` : ''}`;
  if (hours > 0) return `${hours} hour${hours === 1 ? '' : 's'}`;
  return 'less than an hour';
}

export function OwnerInheritanceClaimBanner() {
  const inheritance = useInheritance();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Only show during the veto window of an active claim against the connected owner's own vault.
  const state = inheritance?.state;
  if (state !== STATE_VETO_PERIOD || done) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  const windowEnd = typeof inheritance.windowEnd === 'bigint' ? Number(inheritance.windowEnd) : 0;
  const remaining = formatRemaining(windowEnd, nowSec);

  const handleOverride = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await inheritance.ownerOverride();
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Override failed. Try again from the inheritance page.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="sticky top-0 z-50 w-full border-b border-rose-500/40 bg-gradient-to-r from-rose-950/95 to-red-900/90 backdrop-blur"
        role="alert"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 shrink-0 text-rose-300" size={20} aria-hidden="true" />
            <div>
              <p className="text-sm font-bold text-rose-100">
                An inheritance claim is active on your vault
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-rose-200/90">
                Someone has started the process to transfer your vault as if you were gone. If you are reading
                this, you are not — cancel it now. This does not affect your funds. <span className="inline-flex items-center gap-1 font-semibold text-rose-100"><Clock size={11} aria-hidden="true" /> {remaining} left to cancel</span>.
              </p>
              {error && <p className="mt-1 text-xs font-medium text-rose-300">{error}</p>}
            </div>
          </div>
          <button
            onClick={() => void handleOverride()}
            disabled={submitting}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-rose-100 px-4 py-2 text-sm font-bold text-rose-950 transition-colors hover:bg-white disabled:opacity-60"
          >
            {submitting ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <ShieldCheck size={15} aria-hidden="true" />}
            {submitting ? 'Cancelling…' : 'I\'m here — cancel this'}
          </button>
        </div>
      </m.div>
    </AnimatePresence>
  );
}
