'use client';

/**
 * useProposals — batched proposal list loading.
 *
 * Two modes:
 *   • 'active' — loads currently active proposals (status === Active) via
 *     getActiveProposals(). Cheap, intended for the Proposals tab.
 *   • 'all' — paginated load of every proposal via proposalCount() +
 *     successive getProposalDetails() calls. Intended for the History tab.
 *
 * Both modes return the same ProposalRecord[] shape and a refetch helper.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useReadContract, usePublicClient } from 'wagmi';
import { type Address } from 'viem';
import { DAOABI } from '@/lib/abis';
import { CONTRACT_ADDRESSES, isConfiguredContractAddress } from '@/lib/contracts';
import { type ProposalRecord, type ProposalType, computeProposalStatus } from './useDAO';

interface UseProposalsOptions {
  mode: 'active' | 'all';
  /** For 'all' mode: max number of proposals to load (most recent first). Default 50. */
  limit?: number;
}

export function useProposals({ mode, limit = 50 }: UseProposalsOptions) {
  const publicClient = usePublicClient();
  const daoAddress = CONTRACT_ADDRESSES.DAO;
  const daoConfigured = isConfiguredContractAddress(daoAddress);

  const [proposals, setProposals] = useState<ProposalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: activeIdsRaw, refetch: refetchActiveIds } = useReadContract({
    address: daoAddress,
    abi: DAOABI,
    functionName: 'getActiveProposals',
    query: { enabled: daoConfigured && mode === 'active' },
  });

  const { data: proposalCountRaw, refetch: refetchCount } = useReadContract({
    address: daoAddress,
    abi: DAOABI,
    functionName: 'proposalCount',
    query: { enabled: daoConfigured && mode === 'all' },
  });

  const activeIds = useMemo(
    () => (activeIdsRaw as readonly bigint[] | undefined) ?? [],
    [activeIdsRaw]
  );

  /** Decode a single proposal struct from getProposalDetails return. */
  const decodeProposal = useCallback((id: bigint, raw: any): ProposalRecord => {
    const proposer = (raw.proposer ?? raw[0]) as Address;
    const ptype = Number(raw.ptype ?? raw[1]) as ProposalType;
    const target = (raw.target ?? raw[2]) as Address;
    const value = (raw.value ?? raw[3]) as bigint;
    const description = (raw.description ?? raw[4]) as string;
    const startTime = (raw.startTime ?? raw[5]) as bigint;
    const endTime = (raw.endTime ?? raw[6]) as bigint;
    const forVotes = (raw.forVotes ?? raw[7]) as bigint;
    const againstVotes = (raw.againstVotes ?? raw[8]) as bigint;
    const executed = (raw.executed ?? raw[9]) as boolean;
    const queued = (raw.queued ?? raw[10]) as boolean;
    return {
      id,
      proposer,
      ptype,
      target,
      value,
      description,
      startTime,
      endTime,
      forVotes,
      againstVotes,
      executed,
      queued,
      status: computeProposalStatus(executed, queued, endTime, forVotes, againstVotes),
    };
  }, []);

  const loadProposals = useCallback(async () => {
    if (!publicClient || !daoConfigured) {
      setProposals([]);
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      let ids: bigint[] = [];

      if (mode === 'active') {
        ids = [...activeIds];
      } else {
        // 'all' mode: enumerate from latest backwards up to `limit`
        const total = (proposalCountRaw as bigint | undefined) ?? 0n;
        if (total === 0n) {
          setProposals([]);
          setIsLoading(false);
          return;
        }
        // Proposal ids appear to be 1-indexed based on `proposalCount` semantics.
        // Walk from `total` down to `max(1, total - limit + 1)`.
        const earliest = total > BigInt(limit) ? total - BigInt(limit) + 1n : 1n;
        for (let i = total; i >= earliest; i--) {
          ids.push(i);
          if (i === 0n) break; // defensive
        }
      }

      if (ids.length === 0) {
        setProposals([]);
        setIsLoading(false);
        return;
      }

      // Fetch each proposal in parallel
      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            const r = await publicClient.readContract({
              address: daoAddress as Address,
              abi: DAOABI,
              functionName: 'getProposalDetails',
              args: [id],
            });
            return decodeProposal(id, r);
          } catch {
            return null;
          }
        })
      );

      setProposals(results.filter((p): p is ProposalRecord => p !== null));
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || 'Failed to load proposals');
      setProposals([]);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, daoConfigured, daoAddress, mode, activeIds, proposalCountRaw, limit, decodeProposal]);

  useEffect(() => {
    void loadProposals();
  }, [loadProposals]);

  const refetch = useCallback(async () => {
    // Refresh the underlying id source first, then reload details
    if (mode === 'active') {
      await refetchActiveIds();
    } else {
      await refetchCount();
    }
    await loadProposals();
  }, [mode, refetchActiveIds, refetchCount, loadProposals]);

  return {
    proposals,
    isLoading,
    error,
    refetch,
  };
}
