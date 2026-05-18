'use client';

/**
 * useChallengeClaim — original owner's veto path against a recovery claim.
 *
 * When a recovery claim is initiated against a vault, the original owner has
 * a window of time (3-30 days, per the vault's challengePeriodPreference) to
 * call challengeClaim and kill the recovery. This is the user's defense
 * against a rogue trustee or social-engineered recovery attempt.
 *
 * The veto requires:
 *   - msg.sender == claim.originalOwner (the wallet that owns the vault before
 *     recovery)
 *   - claim status is GuardianApproved (not Pending, not Executed)
 *   - The challenge window hasn't ended
 *
 * Per R-8 (see threat model), challenging a claim also locks the initiator
 * out from re-initiating against the same vault for 30 days. This is the
 * harassment-prevention mechanism: a rogue trustee whose first attempt was
 * vetoed can't immediately try again.
 *
 * UI placement:
 *   - Prominently on the vault dashboard when a claim is active
 *   - In the recovery beacon's expanded view (the beacon already watches
 *     for ClaimInitiated events; this is the action to take when one fires)
 *   - On the /vault/safety page as documentation of how the veto works
 */

import { useCallback } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { type Address } from 'viem';
import VaultRecoveryClaimABI from '@/lib/abis/VaultRecoveryClaim.json';
import { CONTRACT_ADDRESSES } from '@/lib/contracts';

interface UseChallengeClaimArgs {
  claimId: bigint | undefined;
  originalOwner?: Address; // optional: for the UI to verify connected wallet matches
}

export function useChallengeClaim({ claimId, originalOwner }: UseChallengeClaimArgs) {
  const { address: connectedAddress } = useAccount();
  const { writeContractAsync, isPending: isWritePending, error: writeError } = useWriteContract();
  const recoveryAddress = CONTRACT_ADDRESSES.VaultRecoveryClaim as Address;

  // Role check: is the connected wallet the original owner of the vault?
  // If not, calling challenge() will revert with NotOriginalOwner. The UI
  // should hide the challenge button when this is false.
  const isOriginalOwner =
    !!connectedAddress && !!originalOwner && connectedAddress.toLowerCase() === originalOwner.toLowerCase();

  /**
   * Write: challenge the claim.
   *
   * Reason is a short text the owner provides ("I haven't lost my phone,
   * this is suspicious"). It's stored on-chain and emitted in the event for
   * a permanent record of why the recovery was rejected. Guardians can see
   * this and learn that someone tried to attack the vault.
   *
   * Reverts on:
   *   - NotOriginalOwner: connected wallet isn't the vault's current owner
   *   - ChallengePeriodEnded: too late — challenge window has expired
   *   - ClaimNotPending: claim is already executed/rejected/expired
   */
  const challenge = useCallback(
    async (reason: string) => {
      if (!claimId || claimId === 0n) throw new Error('No claim ID specified');
      return writeContractAsync({
        address: recoveryAddress,
        abi: VaultRecoveryClaimABI as any,
        functionName: 'challengeClaim',
        args: [claimId, reason],
      });
    },
    [claimId, recoveryAddress, writeContractAsync]
  );

  return {
    isOriginalOwner,
    challenge,
    isWritePending,
    writeError,
  };
}
