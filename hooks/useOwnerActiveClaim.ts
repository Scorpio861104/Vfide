'use client';

/**
 * useOwnerActiveClaim — does the connected user's OWN vault have an active
 * recovery claim against it?
 *
 * Distinct from useRecoveryBeacon. The beacon watches claims against vaults
 * the user GUARDS (someone else's vaults). This hook watches the user's OWN
 * vault for incoming claims — i.e., is someone trying to recover the user's
 * vault, possibly without their authorization?
 *
 * The two purposes are different:
 *   - Beacon → "you have guardian work to do, go vote"
 *   - This hook → "your own vault is under attack/recovery, decide whether to challenge"
 *
 * Returns null when:
 *   - User has no vault
 *   - User has a vault but no active claim against it
 *
 * Returns claim data when:
 *   - User has a vault AND a claim is active against it
 *
 * UI consumer: OwnerChallengeBanner. Shown high-visibility across the app
 * when the result is non-null.
 */

import { useVaultHub } from '@/hooks/useVaultHub';

// Mirror VaultRecoveryClaim.sol line 108:
//   uint64 public constant FINALIZATION_GRACE_PERIOD = 1 days;
// The contract allows a challenge up to challengeEndsAt + FINALIZATION_GRACE_PERIOD,
// but the on-chain challengeTimeRemaining() view only counts down to challengeEndsAt.
// We add the grace period here so the UI stays accurate.
const FINALIZATION_GRACE_PERIOD = 86400n; // 1 day in seconds
import { useRecoveryClaim, RecoveryClaimStatus, type RecoveryClaimData } from '@/hooks/useRecoveryClaim';

export interface OwnerActiveClaimResult {
  /** Whether the connected user has a vault under active recovery claim. */
  hasActiveClaim: boolean;
  /** The user's vault address (if they have one). */
  ownVault: `0x${string}` | undefined;
  /** The active claim ID (if any). */
  claimId: bigint;
  /** Full claim data for rendering details. Null if no claim. */
  claim: RecoveryClaimData | null;
  /** Convenience: is the claim still in a state where the owner can challenge? */
  canChallenge: boolean;
  /** Convenience: seconds left in the challenge window (0 if not applicable). */
  challengeTimeRemaining: bigint;
}

export function useOwnerActiveClaim(): OwnerActiveClaimResult {
  const { vaultAddress, hasVault } = useVaultHub();
  const recovery = useRecoveryClaim({ targetVault: hasVault ? vaultAddress : undefined });

  // The contract allows challenge when status is NOT (None, Executed, Rejected, Expired).
  // This means Pending(1), GuardianApproved(2), and Approved(4) are all challengeable,
  // as long as challengeEndsAt has not passed (+ FINALIZATION_GRACE_PERIOD).
  //
  // Note: challengeEndsAt is set at claim CREATION time, so a Pending claim already
  // has a running challenge window — the owner can veto before guardians even vote.
  //
  // Per the contract (VaultRecoveryClaim.sol challengeClaim):
  //   - status must not be None/Executed/Rejected/Expired
  //   - block.timestamp must be <= claim.challengeEndsAt + FINALIZATION_GRACE_PERIOD
  //   - caller must be the original owner
  //
  // We compute the local boolean defensively. The contract has the final
  // say; if our prediction here is wrong, the button click will fail with
  // a contract revert and the UI will surface that error.
  const CHALLENGEABLE_STATUSES = new Set([
    RecoveryClaimStatus.Pending,
    RecoveryClaimStatus.GuardianApproved,
    RecoveryClaimStatus.Approved,
  ]);
  // Effective remaining time = on-chain countdown + grace period the contract also allows.
  // This ensures the "Veto" button remains visible during the 1-day finalization grace window.
  const effectiveChallengeTimeRemaining =
    recovery.challengeTimeRemaining > 0n
      ? recovery.challengeTimeRemaining + FINALIZATION_GRACE_PERIOD
      : FINALIZATION_GRACE_PERIOD;

  const canChallenge =
    !!recovery.claim &&
    CHALLENGEABLE_STATUSES.has(recovery.claim.status) &&
    effectiveChallengeTimeRemaining > 0n;

  return {
    hasActiveClaim: recovery.hasClaim && !!recovery.claim,
    ownVault: hasVault ? vaultAddress : undefined,
    claimId: recovery.claimId,
    claim: recovery.claim,
    canChallenge,
    challengeTimeRemaining: effectiveChallengeTimeRemaining,
  };
}
