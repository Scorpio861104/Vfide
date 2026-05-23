'use client';

/**
 * useTimelocks — single source of truth for "what's pending on the user's vault".
 *
 * Anything with a delayed apply step on CardBoundVault shows up here:
 *   - Spend-limit proposals (SENSITIVE_ADMIN_DELAY = 7 days)
 *   - Large-transfer-threshold proposals (SENSITIVE_ADMIN_DELAY)
 *   - Guardian change proposals (SENSITIVE_ADMIN_DELAY)
 *   - Token approval proposals (SENSITIVE_ADMIN_DELAY)
 *   - Wallet rotation proposals (user-chosen delay)
 *   - Queued withdrawals (WITHDRAWAL_DELAY = 7 days)
 *   - Queued payments (WITHDRAWAL_DELAY = 7 days, gated by largePaymentThreshold)
 *
 * Two consumers feed off this:
 *   - QueueHourglass — renders individual queued items as falling-sand SVGs
 *   - TimeLattice — renders a thin page-top lattice of all active timelocks
 *
 * Both want the same data shape (executeAfter, kind, label, optional amount)
 * so they can share helpers and stay visually consistent.
 *
 * Honesty note: not every Proposed event has a clean view function returning
 * its current state. For events that DO have views (queued withdrawals, queued
 * payments) we read those directly. For events that only emit (spend-limits
 * proposed, threshold proposed, rotation proposed) we subscribe to the event
 * pair (Proposed + Set/Cancelled) and synthesize a virtual entry that lives
 * for the duration of the timelock window. This is a frontend convenience, not
 * a contract surface — if the user reloads the page and the relevant event is
 * past the RPC's event-history window, that pending state won't reappear until
 * applied or cancelled. We disclose this in the consuming component.
 */

import { useMemo, useState } from 'react';
import { useReadContract, useWatchContractEvent } from 'wagmi';
import CardBoundVaultABI from '@/lib/abis/CardBoundVault.json';
import { useUserVault } from './useVaultHooks';

export type TimelockKind =
  | 'withdrawal'
  | 'payment'
  | 'spendLimits'
  | 'largeTransferThreshold'
  | 'guardianChange'
  | 'tokenApproval'
  | 'walletRotation';

export interface Timelock {
  /** Stable key suitable for React lists. */
  key: string;
  kind: TimelockKind;
  /** Unix seconds when this entry becomes executable. */
  executeAfter: bigint;
  /** Optional amount in wei when applicable (withdrawals, payments). */
  amount?: bigint;
  /** Optional contract-side queue index, used for cancel/execute calls. */
  queueIndex?: bigint;
  /** Optional short label e.g. "Guardian Alice" or "+2 max-per-tx". */
  label?: string;
  /** Wall-clock ms when we noticed it (used for sorting ties). */
  noticedAt: number;
}

interface UseTimelocksResult {
  timelocks: Timelock[];
  /** Earliest executeAfter across all entries, or null if empty. */
  nextUpAt: bigint | null;
  /** True while initial reads are loading. */
  isLoading: boolean;
  refetch: () => void;
}

const SEVEN_DAYS_SEC = 7n * 24n * 60n * 60n;

export function useTimelocks(): UseTimelocksResult {
  const { vaultAddress } = useUserVault();
  const vault = (vaultAddress as `0x${string}` | null) ?? undefined;

  const [virtualTimelocks, setVirtualTimelocks] = useState<Timelock[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // ── Withdrawal queue — has a clean batch view. Primary source for the hourglass.
  const { data: withdrawalQueueRaw, isLoading: isLoadingWithdrawals, refetch: refetchW } =
    useReadContract({
      address: vault,
      abi: CardBoundVaultABI,
      functionName: 'getPendingQueuedWithdrawals',
      query: { enabled: !!vault },
    });

  const withdrawalTimelocks = useMemo<Timelock[]>(() => {
    if (!withdrawalQueueRaw) return [];
    const [indices, amounts, executeAfters] = withdrawalQueueRaw as readonly [
      readonly bigint[],
      readonly bigint[],
      readonly bigint[],
    ];
    return indices.map((idx, i) => ({
      key: `withdrawal:${idx.toString()}`,
      kind: 'withdrawal' as const,
      executeAfter: executeAfters[i]!,
      amount: amounts[i]!,
      queueIndex: idx,
      noticedAt: Date.now(),
    }));
  }, [withdrawalQueueRaw]);

  // ── Live event subscription — bumps refetch / synthesizes virtual entries.
  useWatchContractEvent({
    address: vault,
    abi: CardBoundVaultABI,
    eventName: 'WithdrawalQueued',
    onLogs: () => {
      void refetchW();
    },
  });
  useWatchContractEvent({
    address: vault,
    abi: CardBoundVaultABI,
    eventName: 'WithdrawalCancelled',
    onLogs: () => {
      void refetchW();
    },
  });

  useWatchContractEvent({
    address: vault,
    abi: CardBoundVaultABI,
    eventName: 'SpendLimitsChangeProposed',
    onLogs: (logs) => {
      const ts = Date.now();
      setVirtualTimelocks((prev) => {
        const next = [...prev.filter((t) => t.kind !== 'spendLimits')];
        for (const log of logs) {
          const args = (log as unknown as { args?: { executeAfter?: bigint } }).args;
          if (args?.executeAfter !== undefined) {
            next.push({
              key: `spendLimits:${args.executeAfter.toString()}`,
              kind: 'spendLimits',
              executeAfter: args.executeAfter,
              label: 'Spend-limit change',
              noticedAt: ts,
            });
          }
        }
        return next;
      });
    },
  });
  useWatchContractEvent({
    address: vault,
    abi: CardBoundVaultABI,
    eventName: 'SpendLimitsSet',
    onLogs: () => {
      setVirtualTimelocks((prev) => prev.filter((t) => t.kind !== 'spendLimits'));
    },
  });
  useWatchContractEvent({
    address: vault,
    abi: CardBoundVaultABI,
    eventName: 'SpendLimitsChangeCancelled',
    onLogs: () => {
      setVirtualTimelocks((prev) => prev.filter((t) => t.kind !== 'spendLimits'));
    },
  });

  useWatchContractEvent({
    address: vault,
    abi: CardBoundVaultABI,
    eventName: 'LargeTransferThresholdChangeProposed',
    onLogs: (logs) => {
      const ts = Date.now();
      setVirtualTimelocks((prev) => {
        const next = [...prev.filter((t) => t.kind !== 'largeTransferThreshold')];
        for (const log of logs) {
          const args = (log as unknown as { args?: { executeAfter?: bigint; _threshold?: bigint } }).args;
          if (args?.executeAfter !== undefined) {
            next.push({
              key: `largeTransferThreshold:${args.executeAfter.toString()}`,
              kind: 'largeTransferThreshold',
              executeAfter: args.executeAfter,
              amount: args._threshold,
              label: 'Queue threshold change',
              noticedAt: ts,
            });
          }
        }
        return next;
      });
    },
  });
  useWatchContractEvent({
    address: vault,
    abi: CardBoundVaultABI,
    eventName: 'LargeTransferThresholdSet',
    onLogs: () => {
      setVirtualTimelocks((prev) => prev.filter((t) => t.kind !== 'largeTransferThreshold'));
    },
  });
  useWatchContractEvent({
    address: vault,
    abi: CardBoundVaultABI,
    eventName: 'LargeTransferThresholdChangeCancelled',
    onLogs: () => {
      setVirtualTimelocks((prev) => prev.filter((t) => t.kind !== 'largeTransferThreshold'));
    },
  });

  useWatchContractEvent({
    address: vault,
    abi: CardBoundVaultABI,
    eventName: 'GuardianChangeProposed',
    onLogs: (logs) => {
      const ts = Date.now();
      setVirtualTimelocks((prev) => {
        const next = [...prev];
        for (const log of logs) {
          const args = (log as unknown as {
            args?: { guardian?: `0x${string}`; active?: boolean; executeAfter?: bigint };
          }).args;
          if (args?.executeAfter !== undefined) {
            next.push({
              key: `guardian:${args.guardian ?? ''}:${args.executeAfter.toString()}`,
              kind: 'guardianChange',
              executeAfter: args.executeAfter,
              label: args.active ? 'Add guardian' : 'Remove guardian',
              noticedAt: ts,
            });
          }
        }
        return next;
      });
    },
  });
  useWatchContractEvent({
    address: vault,
    abi: CardBoundVaultABI,
    eventName: 'GuardianSet',
    onLogs: () => {
      setVirtualTimelocks((prev) => prev.filter((t) => t.kind !== 'guardianChange'));
    },
  });
  useWatchContractEvent({
    address: vault,
    abi: CardBoundVaultABI,
    eventName: 'GuardianChangeCancelled',
    onLogs: () => {
      setVirtualTimelocks((prev) => prev.filter((t) => t.kind !== 'guardianChange'));
    },
  });

  // ── Aggregate + sort.
  const timelocks = useMemo<Timelock[]>(() => {
    const merged = [...withdrawalTimelocks, ...virtualTimelocks];
    merged.sort((a, b) => Number(a.executeAfter - b.executeAfter));
    return merged;
  }, [withdrawalTimelocks, virtualTimelocks]);

  const nextUpAt = useMemo<bigint | null>(
    () => (timelocks.length ? timelocks[0]!.executeAfter : null),
    [timelocks],
  );

  const refetch = () => {
    void refetchW();
    setRefreshKey((k) => k + 1);
  };
  void refreshKey;

  return {
    timelocks,
    nextUpAt,
    isLoading: isLoadingWithdrawals,
    refetch,
  };
}

/** Convenience: format a remaining time as a short human string. */
export function formatTimelockRemaining(executeAfterSec: bigint): string {
  const remainingMs = Math.max(0, Number(executeAfterSec) * 1000 - Date.now());
  if (remainingMs <= 0) return 'ready';
  const totalSec = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  if (days >= 1) return `${days}d ${hours}h`;
  if (hours >= 1) return `${hours}h ${minutes}m`;
  if (minutes >= 1) return `${minutes}m`;
  return `${totalSec}s`;
}

/** Convenience: percent (0..1) of how far through the 7-day window we are. */
export function timelockProgress(executeAfterSec: bigint, totalSec = SEVEN_DAYS_SEC): number {
  const nowSec = BigInt(Math.floor(Date.now() / 1000));
  const remaining = executeAfterSec > nowSec ? executeAfterSec - nowSec : 0n;
  const elapsed = totalSec > remaining ? totalSec - remaining : 0n;
  const ratio = Number(elapsed) / Number(totalSec);
  return Math.max(0, Math.min(1, ratio));
}
