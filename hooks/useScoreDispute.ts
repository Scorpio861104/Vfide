'use client';

/**
 * Seer score-dispute hooks.
 *
 * Wires `Seer.requestScoreReview(string reason)` plus the read of the
 * caller's current dispute record. The contract maintains a single
 * `ScoreDispute` per user — they cannot file a second dispute while
 * the first is unresolved.
 *
 * Contract surface used:
 *   - scoreDisputes(address) returns (requester, reason, timestamp, resolved, approved)
 *   - requestScoreReview(string)
 *
 * Reverts to translate for UI:
 *   - TRUST_Bounds        — reason empty or >500 chars
 *   - TRUST_AlreadySet    — there's already an unresolved dispute
 */

'use client';

import { useReadContract, useWriteContract, useAccount,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { SeerABI } from '@/lib/abis';
import { isConfiguredContractAddress, getContractConfigurationError } from '@/lib/contracts';
import { useContractAddresses } from './useContractAddresses';

export interface ScoreDispute {
  requester: `0x${string}`;
  reason: string;
  timestamp: bigint;
  resolved: boolean;
  approved: boolean;
  hasOpenDispute: boolean;
}

export function useScoreDispute(): {
  data: ScoreDispute | null;
  isLoading: boolean;
  refetch: () => void;
} {
  const { Seer } = useContractAddresses();
  const { address } = useAccount();

  const { data, isLoading, refetch } = useReadContract({
    address: Seer,
    abi: SeerABI,
    functionName: 'scoreDisputes',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConfiguredContractAddress(Seer),
    },
  });

  if (!data) {
    return { data: null, isLoading, refetch };
  }

  // Solidity tuple → JS tuple
  const tuple = data as readonly [`0x${string}`, string, bigint, boolean, boolean];
  const [requester, reason, timestamp, resolved, approved] = tuple;
  const hasOpenDispute = timestamp > 0n && !resolved;

  return {
    data: { requester, reason, timestamp, resolved, approved, hasOpenDispute },
    isLoading,
    refetch};
}

export function useRequestScoreReview() {
  const { Seer } = useContractAddresses();
  const { writeContractAsync, isPending, error, data: txHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  /**
   * Submit a ProofScore dispute on-chain. Reason is bounded 1-500 bytes
   * by the contract; the UI should enforce this client-side too so the
   * user doesn't waste gas on a guaranteed revert.
   */
  const requestReview = async (reason: string) => {
    if (!isConfiguredContractAddress(Seer)) {
      throw getContractConfigurationError('Seer');
    }
    const trimmed = reason.trim();
    if (trimmed.length === 0) {
      throw new Error('Reason is required.');
    }
    // Bytes-length check matches the contract's `bytes(reason).length`.
    // For ASCII this equals string length; for UTF-8 we use TextEncoder
    // to count actual bytes, which is what Solidity sees.
    const byteLength = new TextEncoder().encode(trimmed).length;
    if (byteLength > 500) {
      throw new Error('Reason is too long — keep it under 500 bytes.');
    }
    return writeContractAsync({
      address: Seer,
      abi: SeerABI,
      functionName: 'requestScoreReview',
      args: [trimmed],
    });
  };

  return { requestReview,
    isPending,
    isSuccess: isConfirmed,
    txHash: txHash ?? null,
    error: error as Error | null, isConfirming, isConfirmed};
}
