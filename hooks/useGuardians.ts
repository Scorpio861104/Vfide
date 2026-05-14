'use client';

/**
 * useGuardians — current active guardians + their last-seen on-chain action.
 *
 * CardBoundVault doesn't expose an enumerator function — `isGuardian(addr)`
 * is a per-address check, `guardianCount` is a number. To get the actual
 * list we replay GuardianSet event history (latest state wins per address)
 * and filter to `active=true`.
 *
 * Activity signal for the Constellation visualization:
 *   - We replay WithdrawalCancelled events from the same vault. Each one
 *     has an indexed `cancelledBy` arg. If that address is a current
 *     guardian, we record the block timestamp as their "lastAction".
 *   - We also count their cancellations as a brightness multiplier:
 *     a guardian who has cancelled 5 things glows brighter than one
 *     who's cancelled 0.
 *
 * Cost: two getLogs calls per session per vault. Block-range bounded by
 * the chain's RPC limits — viem handles pagination if needed via the
 * `fromBlock: 'earliest'` default. For very long vault histories this
 * could be slow; if that's a concern in production we can add a
 * fromBlock heuristic (e.g. last 90 days). For now: full history is
 * the correct semantic, even if it's a few hundred RPC ms.
 */

import { useEffect, useState } from 'react';
import { usePublicClient } from 'wagmi';
import CardBoundVaultABI from '@/lib/abis/CardBoundVault.json';

export interface GuardianRecord {
  address: `0x${string}`;
  /** Block timestamp (epoch sec) when they were added. */
  addedAt: bigint | null;
  /** Most recent on-chain action timestamp (epoch sec), or null. */
  lastActionAt: bigint | null;
  /** Cumulative count of on-chain actions (cancellations). */
  actionCount: number;
}

interface UseGuardiansResult {
  guardians: GuardianRecord[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// Minimal inline event ABI fragments (so we can pass them to getLogs).
const guardianSetEvent = CardBoundVaultABI.find(
  (e) => e.type === 'event' && e.name === 'GuardianSet',
);
const withdrawalCancelledEvent = CardBoundVaultABI.find(
  (e) => e.type === 'event' && e.name === 'WithdrawalCancelled',
);
const paymentQueueCancelledEvent = CardBoundVaultABI.find(
  (e) => e.type === 'event' && e.name === 'PaymentQueueCancelled',
);

export function useGuardians(vaultAddress?: `0x${string}`): UseGuardiansResult {
  const publicClient = usePublicClient();
  const [guardians, setGuardians] = useState<GuardianRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!vaultAddress || !publicClient) {
      setGuardians([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    void (async () => {
      try {
        // 1. Pull all GuardianSet events for the vault.
        const setLogs = (guardianSetEvent
          ? await publicClient.getLogs({
              address: vaultAddress,
              event: guardianSetEvent as never,
              fromBlock: 'earliest',
              toBlock: 'latest',
            })
          : []) as Array<{ blockNumber?: bigint; logIndex?: number; args?: unknown }>;

        // Reconcile add/remove. We need block timestamps for "addedAt", so we
        // batch-fetch block info for unique block numbers we care about.
        const uniqueBlocks = new Set<bigint>();
        for (const log of setLogs) {
          if (log.blockNumber !== undefined) uniqueBlocks.add(log.blockNumber);
        }

        const blockTsMap = new Map<bigint, bigint>();
        await Promise.all(
          Array.from(uniqueBlocks).map(async (bn) => {
            const block = await publicClient.getBlock({ blockNumber: bn });
            blockTsMap.set(bn, block.timestamp);
          }),
        );

        // Per-address last state. We walk in chronological order and let
        // the latest event win.
        setLogs.sort((a, b) => {
          if (a.blockNumber !== b.blockNumber) {
            return (a.blockNumber ?? 0n) < (b.blockNumber ?? 0n) ? -1 : 1;
          }
          return (a.logIndex ?? 0) < (b.logIndex ?? 0) ? -1 : 1;
        });
        const state = new Map<string, { active: boolean; addedAt: bigint | null }>();
        for (const log of setLogs) {
          const args = (log as unknown as {
            args?: { guardian?: `0x${string}`; active?: boolean };
          }).args;
          if (!args?.guardian) continue;
          const addr = args.guardian.toLowerCase();
          const ts = log.blockNumber !== undefined ? blockTsMap.get(log.blockNumber) ?? null : null;
          const prev = state.get(addr);
          if (args.active) {
            // First-add wins for addedAt; subsequent re-adds preserve original timestamp.
            state.set(addr, {
              active: true,
              addedAt: prev?.active ? prev.addedAt : ts,
            });
          } else {
            state.set(addr, { active: false, addedAt: prev?.addedAt ?? null });
          }
        }

        // 2. Pull cancellation events to enrich activity metrics.
        const [withdrawalCancelLogs, paymentCancelLogs] = (await Promise.all([
          withdrawalCancelledEvent
            ? publicClient.getLogs({
                address: vaultAddress,
                event: withdrawalCancelledEvent as never,
                fromBlock: 'earliest',
                toBlock: 'latest',
              })
            : Promise.resolve([]),
          paymentQueueCancelledEvent
            ? publicClient.getLogs({
                address: vaultAddress,
                event: paymentQueueCancelledEvent as never,
                fromBlock: 'earliest',
                toBlock: 'latest',
              })
            : Promise.resolve([]),
        ])) as [
          Array<{ blockNumber?: bigint; args?: unknown }>,
          Array<{ blockNumber?: bigint; args?: unknown }>,
        ];

        // Need timestamps for cancellation blocks too.
        const cancelBlocks = new Set<bigint>();
        for (const log of [...withdrawalCancelLogs, ...paymentCancelLogs]) {
          if (log.blockNumber !== undefined && !blockTsMap.has(log.blockNumber)) {
            cancelBlocks.add(log.blockNumber);
          }
        }
        await Promise.all(
          Array.from(cancelBlocks).map(async (bn) => {
            const block = await publicClient.getBlock({ blockNumber: bn });
            blockTsMap.set(bn, block.timestamp);
          }),
        );

        const activity = new Map<string, { lastActionAt: bigint; count: number }>();
        const tally = (log: { blockNumber?: bigint }, by?: `0x${string}`) => {
          if (!by) return;
          const ts = log.blockNumber !== undefined ? blockTsMap.get(log.blockNumber) ?? null : null;
          if (ts === null) return;
          const addr = by.toLowerCase();
          const prev = activity.get(addr);
          if (!prev || ts > prev.lastActionAt) {
            activity.set(addr, {
              lastActionAt: ts,
              count: (prev?.count ?? 0) + 1,
            });
          } else {
            activity.set(addr, { lastActionAt: prev.lastActionAt, count: prev.count + 1 });
          }
        };

        for (const log of withdrawalCancelLogs) {
          const args = (log as unknown as { args?: { cancelledBy?: `0x${string}` } }).args;
          tally(log, args?.cancelledBy);
        }
        for (const log of paymentCancelLogs) {
          const args = (log as unknown as { args?: { by?: `0x${string}` } }).args;
          tally(log, args?.by);
        }

        // 3. Build the result — only active guardians.
        const result: GuardianRecord[] = [];
        for (const [addrLc, st] of state.entries()) {
          if (!st.active) continue;
          const act = activity.get(addrLc);
          result.push({
            address: addrLc as `0x${string}`,
            addedAt: st.addedAt,
            lastActionAt: act?.lastActionAt ?? null,
            actionCount: act?.count ?? 0,
          });
        }
        // Stable order: by addedAt ascending (oldest guardians first).
        result.sort((a, b) => {
          const aT = a.addedAt ?? 0n;
          const bT = b.addedAt ?? 0n;
          return aT < bT ? -1 : aT > bT ? 1 : 0;
        });

        if (!cancelled) setGuardians(result);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load guardians.');
          setGuardians([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [vaultAddress, publicClient, tick]);

  return {
    guardians,
    isLoading,
    error,
    refetch: () => setTick((t) => t + 1),
  };
}
