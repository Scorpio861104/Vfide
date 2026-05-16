'use client';

/**
 * useGuardianVote — guardian's view of a pending recovery claim.
 *
 * The other half of useRecoveryClaim. Where useRecoveryClaim is from the
 * claimant's perspective ("my recovery, my vault"), this hook is from the
 * guardian's perspective ("someone claims they're recovering Alice's vault,
 * here's the claim, should I vote yes?").
 *
 * Used in:
 *   - Guardian dashboard's pending-recovery card
 *   - The RecoveryBeacon's expanded view
 *   - Future: direct-link approval pages that a claimant texts to their guardians
 *
 * What it returns:
 *   - hasVoted: has the connected wallet already voted on this claim?
 *   - guardianVote: their actual vote if cast (true/false)
 *   - vote(approve: boolean): cast their vote
 *   - approvalCount, requiredApprovals: progress display
 *
 * Identity assumption: the connected wallet must be a guardian on the vault.
 * If not, vote() will revert (NotGuardian error). The UI should check
 * is-guardian before showing the vote button, but the hook works
 * regardless and surfaces the error cleanly.
 */

import { useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { type Address } from 'viem';
import VaultRecoveryClaimABI from '@/lib/abis/VaultRecoveryClaim.json';
import { CONTRACT_ADDRESSES } from '@/lib/contracts';

interface UseGuardianVoteArgs {
  claimId: bigint | undefined;
}

export function useGuardianVote({ claimId }: UseGuardianVoteArgs) {
  const { address: guardianAddress } = useAccount();
  const { writeContractAsync, isPending: isWritePending, error: writeError } = useWriteContract();
  const recoveryAddress = CONTRACT_ADDRESSES.VaultRecoveryClaim as Address;

  const enabled = !!claimId && claimId > 0n && !!guardianAddress;

  // ─────────────────────────────────────────────────────────────────
  // Has this guardian already voted?
  //
  // The contract stores guardianVoted[claimId][guardian] = bool. Reading
  // this directly via the auto-generated getter tells us whether the
  // guardian has cast a vote yet. We use this to:
  //   - Disable the vote button if they've already voted
  //   - Show their previous vote in the UI
  //
  // Note: the contract also stores `guardianApproval[claimId][guardian]`
  // = bool which tells us WHAT they voted (true/false). We read both
  // because "voted no" and "haven't voted" look the same from the
  // guardianVoted mapping alone (both false-ish in different ways).
  // ─────────────────────────────────────────────────────────────────
  const { data: hasVotedRaw, refetch: refetchVoted } = useReadContract({
    address: recoveryAddress,
    abi: VaultRecoveryClaimABI,
    functionName: 'guardianVoted',
    args: enabled ? [claimId, guardianAddress] : undefined,
    query: { enabled },
  });

  const { data: voteValueRaw } = useReadContract({
    address: recoveryAddress,
    abi: VaultRecoveryClaimABI,
    functionName: 'guardianApproval',
    args: enabled ? [claimId, guardianAddress] : undefined,
    query: { enabled: enabled && !!hasVotedRaw },
  });

  const hasVoted = !!hasVotedRaw;
  const guardianVote = hasVoted ? !!voteValueRaw : null;

  // ─────────────────────────────────────────────────────────────────
  // Write: cast a vote
  //
  // Reverts on:
  //   - NotGuardian: caller isn't a guardian of the vault
  //   - AlreadyVoted: caller already cast their vote
  //   - ClaimNotPending: claim is no longer in voting state
  //   - InsufficientApprovals: never thrown by guardianVote (would be by
  //     finalize); voting itself doesn't require any threshold
  //
  // Note: there's no "change my mind" path. Once voted, the vote is final.
  // This is intentional — vote stability matters for the threshold
  // calculation, and flip-flopping would make the protocol harder to reason
  // about. If a guardian wants to vote differently, they need a new claim
  // (which happens after challenge or expiry).
  // ─────────────────────────────────────────────────────────────────
  const vote = useCallback(
    async (approve: boolean) => {
      if (!claimId || claimId === 0n) throw new Error('No claim ID specified');
      return writeContractAsync({
        address: recoveryAddress,
        abi: VaultRecoveryClaimABI as any,
        functionName: 'guardianVote',
        args: [claimId, approve],
      });
    },
    [claimId, recoveryAddress, writeContractAsync]
  );

  return {
    hasVoted,
    guardianVote, // null if not voted, true/false if voted
    vote,
    isWritePending,
    writeError,
    refetchVoted,
  };
}
