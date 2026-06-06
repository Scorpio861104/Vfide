'use client';

/**
 * VaultPendingChangesBanner — dashboard surface for timelocked changes.
 *
 * Sits in the vault dashboard above the deeper detail sections. When the
 * owner has changes queued, the banner shows up with a count and a link
 * to /vault/pending-changes for management. When nothing is queued, the
 * banner returns null — no dashboard clutter during normal operation.
 *
 * Design choice: two visual states.
 *   - "Ready" (any change is past its timelock): emerald, gently urgent.
 *     The owner has work to do (apply the change) or a decision to
 *     consciously not apply it.
 *   - "Waiting" (changes queued but timelocks haven't expired): cyan,
 *     purely informational. The owner just needs to know it's there.
 *
 * Not alarming — unlike OwnerChallengeBanner (Phase 1), pending changes
 * are expected. The owner proposed them. The banner is helpful, not
 * urgent. Single-line content; click-through for detail.
 *
 * The banner reads through usePendingChanges, the same hook /vault/pending-changes
 * uses. So the count is always accurate to what the user sees on the page.
 */

import Link from 'next/link';
import { Hourglass, ChevronRight, CheckCircle2 } from 'lucide-react';
import { m } from 'framer-motion';
import { usePendingChanges } from '@/hooks/usePendingChanges';
import type { Address } from 'viem';

export function VaultPendingChangesBanner({ vaultAddress }: { vaultAddress: Address | undefined }) {
  const { changes } = usePendingChanges(vaultAddress);

  // Nothing pending — banner stays invisible. This is the common case.
  if (changes.length === 0) return null;

  const readyCount = changes.filter((c) => c.canApply).length;
  const waitingCount = changes.length - readyCount;
  const hasReady = readyCount > 0;

  return (
    <m.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <Link
        href="/vault/pending-changes"
        className={`block rounded-2xl p-4 border-2 transition-colors ${
          hasReady
            ? 'bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-500/30 hover:border-emerald-400/50'
            : 'bg-gradient-to-br from-accent/10 to-blue-500/5 border-accent/30 hover:border-accent/50'
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                hasReady ? 'bg-emerald-500/20' : 'bg-accent/20'
              }`}
            >
              {hasReady ? (
                <CheckCircle2 className="text-emerald-300" size={20} />
              ) : (
                <Hourglass className="text-accent" size={20} />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">
                {hasReady && waitingCount === 0
                  ? `${readyCount} pending ${readyCount === 1 ? 'change is' : 'changes are'} ready to apply`
                  : hasReady && waitingCount > 0
                    ? `${readyCount} ready · ${waitingCount} waiting for timelock`
                    : `${waitingCount} pending ${waitingCount === 1 ? 'change' : 'changes'} on your vault`}
              </p>
              <p className={`text-xs mt-0.5 ${hasReady ? 'text-emerald-300/80' : 'text-accent/80'}`}>
                {hasReady
                  ? 'Click to apply now, or cancel if you changed your mind'
                  : 'Click to view what\'s queued'}
              </p>
            </div>
          </div>
          <ChevronRight className={hasReady ? 'text-emerald-300' : 'text-accent'} size={20} />
        </div>
      </Link>
    </m.div>
  );
}
