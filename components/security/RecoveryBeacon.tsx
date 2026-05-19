'use client';

/**
 * RecoveryBeacon — visible "guardian, you have work" pulse.
 *
 * Mounted in AppShell so the signal reaches the user on any page. The
 * beacon is invisible (returns null) when no active claims are in
 * the user's watchlist. When something is active, it appears as a
 * pulsing dot near the Monument corner with a tooltip describing
 * which vault and claim.
 *
 * Click behaviour: navigates to the guardian dashboard with the
 * affected vault pre-loaded (the alert-style URL the LockVaultPanel
 * generates points here too — same destination, different sources).
 *
 * Reduced motion: static glow, no pulse animation.
 */

import { useRecoveryBeacon } from '@/hooks/useRecoveryBeacon';
import { usePrefersReducedMotion } from '@/app/components/usePrefersReducedMotion';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export function RecoveryBeacon() {
  const { activeClaims, isActive } = useRecoveryBeacon();
  const reducedMotion = usePrefersReducedMotion();

  if (!isActive) return null;

  const claim = activeClaims[0];
  if (!claim) return null;
  const moreCount = activeClaims.length - 1;
  const linkTarget = `/guardians?watch=${claim.vault}&alert=1`;
  const tooltip = `Recovery in progress: ${claim.vaultLabel || claim.vault.slice(0, 10) + '…'}${
    moreCount > 0 ? ` (+${moreCount} more)` : ''
  }`;

  return (
    <Link
      href={linkTarget}
      title={tooltip}
      aria-label={tooltip}
      className="fixed bottom-32 right-4 md:bottom-6 md:right-20 z-40 group"
    >
      <div className="relative">
        {/* The pulse — rendered behind the dot. */}
        {!reducedMotion && (
          <>
            <div
              className="absolute inset-0 rounded-full bg-amber-500/40 animate-ping"
              style={{ animationDuration: '1.8s' }}
            />
            <div
              className="absolute inset-0 rounded-full bg-amber-400/30"
              style={{
                animation: 'pulse 1.8s ease-in-out infinite',
              }}
            />
          </>
        )}
        {/* The dot itself. */}
        <div
          className={`relative flex items-center justify-center w-11 h-11 rounded-full bg-amber-500 shadow-lg ${
            reducedMotion ? '' : 'group-hover:scale-110 transition-transform'
          }`}
          style={
            reducedMotion
              ? { boxShadow: '0 0 24px rgba(245, 158, 11, 0.6)' }
              : undefined
          }
        >
          <AlertTriangle className="w-5 h-5 text-white" />
        </div>
        {/* Count badge when there are multiple. */}
        {moreCount > 0 && (
          <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
            {activeClaims.length}
          </div>
        )}
      </div>
    </Link>
  );
}
