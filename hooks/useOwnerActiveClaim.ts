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

  // The contract considers a claim "challengeable" only in GuardianApproved
  // state — Pending claims are still gathering votes, and Approved/Executed/
  // Rejected/Expired claims are past the point where a challenge can fire.
  //
  // Per the contract (VaultRecoveryClaim.sol challengeClaim):
  //   - status must be ClaimStatus.GuardianApproved
  //   - block.timestamp must be < claim.challengeEndsAt
  //
  // We compute the local boolean defensively. The contract has the final
  // say; if our prediction here is wrong, the button click will fail with
  // a contract revert and the UI will surface that error.
  const canChallenge =
    !!recovery.claim &&
    recovery.claim.status === RecoveryClaimStatus.GuardianApproved &&
    recovery.challengeTimeRemaining > 0n;

  return {
    hasActiveClaim: recovery.hasClaim && !!recovery.claim,
    ownVault: hasVault ? vaultAddress : undefined,
    claimId: recovery.claimId,
    claim: recovery.claim,
    canChallenge,
    challengeTimeRemaining: recovery.challengeTimeRemaining,
  };
}
