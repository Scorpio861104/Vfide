/**
 * Guardian resilience helper (Wave 87 — Guardian institution campaign).
 *
 * Pure, testable assessment of whether a guardian configuration can survive the loss of guardians
 * (death, disappearance, account loss, refusal to act). The on-chain contract permits a threshold equal
 * to the guardian count, which is valid but DANGEROUS: with threshold == count, losing even one guardian
 * makes the recovery threshold permanently unreachable — the owner is locked out of recovery. This helper
 * surfaces that risk so the owner can add redundancy before it matters.
 *
 * This is advisory only: it never changes the vault, it just tells the owner how fragile their setup is.
 */

export interface GuardianResilience {
  guardianCount: number;
  threshold: number;
  /** How many guardians can be lost while recovery is still possible (count - threshold). */
  lossTolerance: number;
  /** True when losing even one guardian makes recovery impossible (threshold == count). */
  zeroRedundancy: boolean;
  /** Severity of the resilience posture. */
  level: 'none' | 'fragile' | 'ok' | 'strong';
  /** Plain-language warning/advice, or null when the setup is healthy. */
  warning: string | null;
}

function safeCount(n: number): number {
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

export function assessGuardianResilience(guardianCountRaw: number, thresholdRaw: number): GuardianResilience {
  const guardianCount = safeCount(guardianCountRaw);
  const threshold = safeCount(thresholdRaw);
  const lossTolerance = Math.max(0, guardianCount - threshold);

  // No usable recovery at all.
  if (guardianCount === 0 || threshold === 0) {
    return {
      guardianCount, threshold, lossTolerance: 0, zeroRedundancy: true, level: 'none',
      warning: 'No recovery is possible yet. Add guardians and set a recovery threshold so you can get back into your vault if you lose your phone.',
    };
  }

  const zeroRedundancy = lossTolerance === 0;

  if (zeroRedundancy) {
    return {
      guardianCount, threshold, lossTolerance, zeroRedundancy: true, level: 'fragile',
      warning: `Your recovery needs all ${guardianCount} of your guardians to approve. If even one becomes unreachable — lost phone, passed away, or simply unavailable — recovery becomes impossible. Add another guardian (keeping the same threshold) so you can still recover if one is lost.`,
    };
  }

  if (lossTolerance >= 2) {
    return {
      guardianCount, threshold, lossTolerance, zeroRedundancy: false, level: 'strong',
      warning: null,
    };
  }

  // lossTolerance === 1: survives one loss, but not two.
  return {
    guardianCount, threshold, lossTolerance, zeroRedundancy: false, level: 'ok',
    warning: null,
  };
}
