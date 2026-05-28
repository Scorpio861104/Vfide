'use client';

/**
 * useEscrowList — enumerate escrows for a given role + address.
 *
 * Event-based enumeration (Phase 3d Turn 2+):
 *   CommerceEscrow now emits EscrowOpened (indexed buyer, indexed merchant)
 *   on every new escrow. We scan that event stream filtered by the user's
 *   address to get the set of escrow ids they're a party to, then read each
 *   one's current state via multicall.
 *
 *   This is O(N_events_for_this_user) — typically a handful, not the whole
 *   protocol's escrow count. A massive improvement over the pre-events
 *   iterate-everything approach.
 *
 * For real-time updates:
 *   `useWatchEscrowEvents` (separate hook, future) can subscribe to
 *   EscrowOpened / EscrowFunded / EscrowReleased / EscrowRefunded /
 *   EscrowDisputed / EscrowResolved with the same indexed-filter pattern.
 *
 * Backward-compatibility note:
 *   If the deployed CommerceEscrow predates the event-emission version
 *   (Phase 3d Turn 2), getLogs returns no results and the list will look
 *   empty. To handle that case, callers can opt into the iteration
 *   fallback by passing `fallbackToIteration: true` — useful for testnet
 *   scenarios where an older contract version may still be live.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { type Address, getAbiItem, type Log } from 'viem';
import { CONTRACT_ADDRESSES, isConfiguredContractAddress } from '@/lib/contracts';
// CommerceEscrow ABI ships as VFIDECommerceABI (lib/abis/VFIDECommerce.json).
// Aliased here as CommerceEscrowABI for readability — this hook reads escrow
// state/events from CommerceEscrow, NOT the merchant registry.
import { VFIDECommerceABI as CommerceEscrowABI } from '@/lib/abis';
import { EscrowState, type CommerceEscrowRecord } from './useCommerceEscrow';

export type EscrowRole = 'buyer' | 'merchant';

interface UseEscrowListOptions {
  /** If the contract is pre-events, also scan via iteration. Slower; off by default. */
  fallbackToIteration?: boolean;
}

const ITERATION_PAGE_SIZE = 50;

function decodeEscrowFromMulticall(id: bigint, result: any): CommerceEscrowRecord | null {
  if (!result || result.status !== 'success') return null;
  const raw = result.result;
  if (raw && typeof raw === 'object' && 'buyerOwner' in raw) {
    return {
      id,
      buyerOwner: raw.buyerOwner as Address,
      merchantOwner: raw.merchantOwner as Address,
      buyerVault: raw.buyerVault as Address,
      sellerVault: raw.sellerVault as Address,
      amount: BigInt(raw.amount ?? 0),
      state: Number(raw.state) as EscrowState,
      metaHash: raw.metaHash as `0x${string}`,
      openedAt: Number(raw.openedAt ?? 0),
    };
  }
  if (Array.isArray(raw) && raw.length >= 8) {
    return {
      id,
      buyerOwner: raw[0] as Address,
      merchantOwner: raw[1] as Address,
      buyerVault: raw[2] as Address,
      sellerVault: raw[3] as Address,
      amount: BigInt(raw[4] as any),
      state: Number(raw[5]) as EscrowState,
      metaHash: raw[6] as `0x${string}`,
      openedAt: Number(raw[7] ?? 0),
    };
  }
  return null;
}

export function useEscrowList(
  role: EscrowRole,
  viewerAddress?: Address,
  options: UseEscrowListOptions = {}
) {
  const { address: connectedAddress } = useAccount();
  const publicClient = usePublicClient();
  const escrowAddress = CONTRACT_ADDRESSES.CommerceEscrow;
  const escrowConfigured = isConfiguredContractAddress(escrowAddress);

  const target = viewerAddress ?? connectedAddress;
  const [escrows, setEscrows] = useState<CommerceEscrowRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!escrowConfigured || !target || !publicClient) {
      setEscrows([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      // 1. Scan EscrowOpened events filtered by the user's address.
      //    For buyers, filter by the `buyer` indexed arg. For merchants,
      //    filter by the `merchant` indexed arg.
      const escrowOpenedAbi = getAbiItem({ abi: CommerceEscrowABI, name: 'EscrowOpened' });

      const args: Record<string, Address> =
        role === 'buyer' ? { buyer: target } : { merchant: target };

      const logs = (await publicClient.getLogs({
        address: escrowAddress!,
        event: escrowOpenedAbi as any,
        args: args as any,
        fromBlock: 0n,
        toBlock: 'latest',
      })) as Log[];

      // Extract escrow ids from the logs. EscrowOpened(uint256 indexed id, ...)
      // → log.args.id is a bigint.
      const ids: bigint[] = [];
      for (const log of logs) {
        const id = (log as any).args?.id;
        if (typeof id === 'bigint') ids.push(id);
      }

      // If no events found and the caller opted in, try iteration fallback.
      if (ids.length === 0 && options.fallbackToIteration) {
        const totalCountRaw = await publicClient.readContract({
          address: escrowAddress!,
          abi: CommerceEscrowABI,
          functionName: 'escrowCount',
        });
        const totalCount = BigInt(totalCountRaw as any);
        if (totalCount > 0n) {
          // Iterate (capped at first page only for fallback)
          const endId = totalCount - 1n;
          const startId = endId >= BigInt(ITERATION_PAGE_SIZE - 1) ? endId - BigInt(ITERATION_PAGE_SIZE - 1) : 0n;
          const calls: any[] = [];
          for (let i = startId; i <= endId; i += 1n) {
            calls.push({
              address: escrowAddress!,
              abi: CommerceEscrowABI as any,
              functionName: 'escrows',
              args: [i],
            });
          }
          const results = await publicClient.multicall({ contracts: calls });
          let i = startId;
          for (const result of results) {
            const e = decodeEscrowFromMulticall(i, result);
            if (e) {
              const isMatch =
                role === 'buyer'
                  ? e.buyerOwner.toLowerCase() === target.toLowerCase()
                  : e.merchantOwner.toLowerCase() === target.toLowerCase();
              if (isMatch && e.state !== EscrowState.None) ids.push(e.id);
            }
            i += 1n;
          }
        }
      }

      if (ids.length === 0) {
        setEscrows([]);
        setIsLoading(false);
        return;
      }

      // 2. Multicall-read current state of all matched escrows.
      const calls = ids.map((id) => ({
        address: escrowAddress! as Address,
        abi: CommerceEscrowABI as any,
        functionName: 'escrows' as const,
        // abi-parity-ok: escrows(uint256 id) — 1 arg, statically present in .map callback
        args: [id] as const,
      }));
      const results = await publicClient.multicall({ contracts: calls });

      const records: CommerceEscrowRecord[] = [];
      ids.forEach((id, idx) => {
        const e = decodeEscrowFromMulticall(id, results[idx]);
        if (e) records.push(e);
      });

      // Newest first
      records.sort((a, b) => Number(b.id - a.id));
      setEscrows(records);
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || 'Failed to load escrow list');
    } finally {
      setIsLoading(false);
    }
  }, [escrowConfigured, target, publicClient, escrowAddress, role, options.fallbackToIteration]);

  useEffect(() => {
    let cancelled = false;
    void refetch();
    return () => { cancelled = true; };
    }, [refetch]);

  return {
    escrows,
    isLoading,
    error,
    refetch,
  };
}
