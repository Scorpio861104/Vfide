'use client';

/**
 * useVerifierVote — trusted-verifier perspective on a pending recovery claim.
 *
 * The verifier path is an alternate quorum for cases where guardians can't
 * be reached or refuse to participate. Trusted verifiers are a small set of
 * attested addresses (set by the protocol owner via setTrustedVerifier) who
 * can vote on claims as a fallback.
 *
 * This is a separate path from guardians. A claim can be approved via:
 *   - Guardian-only path: M-of-N guardian approvals
 *   - Verifier-fallback path: MIN_VERIFIER_VOTES verifier approvals when
 *     the guardian set is incomplete or unresponsive
 *
 * Most users will never see this UI — it's for verifiers themselves, who
 * are typically protocol contributors or trusted third parties identified
 * to perform this role.
 *
 * Design note: kept narrowly scoped because the verifier role is more
 * constrained than guardians (smaller surface, no "change my mind" path,
 * fewer edge cases).
 */

import { useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { type Address } from 'viem';
import VaultRecoveryClaimABI from '@/lib/abis/VaultRecoveryClaim.json';
import { CONTRACT_ADDRESSES } from '@/lib/contracts';

interface UseVerifierVoteArgs {
  claimId: bigint | undefined;
}

export function useVerifierVote({ claimId }: UseVerifierVoteArgs) {
  const { address: verifierAddress } = useAccount();
  const { writeContractAsync, isPending: isWritePending, error: writeError, data: txHash } = useWriteContract();
  const recoveryAddress = CONTRACT_ADDRESSES.VaultRecoveryClaim as Address;

  const enabled = !!claimId && claimId > 0n && !!verifierAddress;

  // ─────────────────────────────────────────────────────────────────
  // Is the connected wallet a trusted verifier?
  // The contract has a trustedVerifier[address] mapping. If false, the
  // verifierVote write will revert with NotTrustedVerifier.
  // ─────────────────────────────────────────────────────────────────
  const { data: isTrustedRaw } = useReadContract({
    address: recoveryAddress,
    abi: VaultRecoveryClaimABI,
    functionName: 'trustedVerifier',
    args: verifierAddress ? [verifierAddress] : undefined,
    query: { enabled: !!verifierAddress },
  });
  const isTrustedVerifier = !!isTrustedRaw;

  // ─────────────────────────────────────────────────────────────────
  // Has this verifier already voted?
  // ─────────────────────────────────────────────────────────────────
  const { data: hasVotedRaw, refetch: refetchVoted } = useReadContract({
    address: recoveryAddress,
    abi: VaultRecoveryClaimABI,
    functionName: 'verifierVoted',
    args: enabled ? [claimId, verifierAddress] : undefined,
    query: { enabled },
  });

  const hasVoted = !!hasVotedRaw;

  // ─────────────────────────────────────────────────────────────────
  // Write: cast a verifier vote
  //
  // Reverts on:
  //   - NotTrustedVerifier: caller isn't on the verifier list
  //   - AlreadyVoted: caller already voted
  //   - ClaimNotPending: claim is no longer in voting state
  // ─────────────────────────────────────────────────────────────────
  const vote = useCallback(
    async (approve: boolean) => {
      if (!claimId || claimId === 0n) throw new Error('No claim ID specified');
      return writeContractAsync({
        address: recoveryAddress,
        abi: VaultRecoveryClaimABI as any,
        functionName: 'verifierVote',
        args: [claimId, approve],
      });
    },
    [claimId, recoveryAddress, writeContractAsync]
  );

  // Track tx confirmation state
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  return {
    isTrustedVerifier,
    hasVoted,
    vote,
    isWritePending,
    isConfirming,
    isConfirmed,
    writeError,
    refetchVoted,
  };
}
