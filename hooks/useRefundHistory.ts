'use client';

/**
 * useRefundHistory — list a merchant's or customer's refunds by reading events.
 *
 * Why event-scanning instead of a direct view:
 *   MerchantPortal.sol has `merchantRefunds[address]` and `customerRefunds[address]`
 *   mappings that DO track every refund per party, but those mappings are declared
 *   `private` so they're not exposed in the ABI. There's no view function that
 *   returns "all refunds for this merchant" or "all refunds for this customer."
 *
 *   The only on-chain enumeration mechanism is the RefundInitiated and
 *   RefundCompleted events, both of which have `customer` and `merchant`
 *   indexed. So we filter logs by the role and the address, reconcile the
 *   two event streams (a refund can be initiated and then completed), and
 *   build a status-tagged list.
 *
 * Constraints inherited from this approach:
 *   - RPC node must return historical logs reasonably quickly. For Base mainnet
 *     this is fine; for some lightweight RPCs it may be slow. The hook polls
 *     once on mount and watches for new events thereafter via useWatchContractEvent.
 *   - Reorg sensitivity: a recent event could disappear in a chain reorg. We
 *     accept that — the user can refresh and the canonical view will catch up.
 *   - Event payloads only include customer/merchant/orderId/amount. To get the
 *     refundId (needed to call completeRefund), we re-derive it from the
 *     contract's keccak formula. The contract uses:
 *       keccak256(abi.encode(merchant, customer, orderId, block.timestamp, index))
 *     where index = customerRefunds[customer].length at the moment of the call.
 *     We can't reproduce `index` purely from events. So we ALSO read
 *     getRefundStatus(refundId) for each candidate refundId we've seen — but
 *     we get refundId only from events that emit it... and these don't emit it.
 *
 *   This is a real limitation of the current contract: the merchant has no
 *   way to know the refundId of a refund they initiated unless they captured
 *   it from the transaction receipt at the moment of submission. We work
 *   around this by storing initiated-refund IDs in localStorage when this
 *   hook's owner submits an initiateRefund through useMerchantPayments.
 *
 *   This workaround is a release-blocking finding worth logging in backlog —
 *   the contract should emit refundId in the RefundInitiated event so the
 *   frontend can rehydrate state cleanly after a session loss.
 */

import { useEffect, useState, useCallback } from 'react';
import { useAccount, usePublicClient, useWatchContractEvent } from 'wagmi';
import { type Address, type Log, decodeEventLog } from 'viem';
import { CONTRACT_ADDRESSES, isConfiguredContractAddress } from '@/lib/contracts';
import { MerchantPortalABI } from '@/lib/abis';

export type RefundRole = 'merchant' | 'customer';

/**
 * One refund entry in the history. Lifecycle:
 *   - `initiated` (RefundInitiated event seen, no matching RefundCompleted)
 *   - `completed` (both events seen)
 *   - `expired` (initiated >30 days ago without completion — REFUND_COMPLETION_WINDOW)
 */
export type RefundEntryStatus = 'initiated' | 'completed' | 'expired';

export interface RefundEntry {
  /** Refund ID, if known (only present for refunds the user initiated through this UI). */
  refundId?: `0x${string}`;
  customer: Address;
  merchant: Address;
  orderId: string;
  amount: bigint;
  /** Unix seconds. Block timestamp of the RefundInitiated event. */
  initiatedAt: number;
  /** Unix seconds. Block timestamp of the RefundCompleted event, if completed. */
  completedAt?: number;
  status: RefundEntryStatus;
  /** Block number for ordering. */
  initiatedBlock: bigint;
}

const REFUND_COMPLETION_WINDOW = 30 * 86_400; // 30 days in seconds

/**
 * Refund ID storage (localStorage). When the merchant initiates a refund
 * through the UI, we capture the refundId from the transaction receipt's
 * RefundInitiated event topic and persist it. This lets us reconstruct
 * "what refunds did I start" after a session loss.
 *
 * Storage key: `vfide:refunds:initiated:<connectedAddress>:<merchantOrCustomerAddress>`
 * Storage value: JSON array of { refundId, orderId, txHash, blockNumber }
 *
 * This is a workaround for the contract not emitting refundId in events.
 */
const STORAGE_PREFIX = 'vfide:refunds:initiated:';

interface StoredRefund {
  refundId: `0x${string}`;
  orderId: string;
  txHash: `0x${string}`;
  blockNumber: string; // bigint as string
}

function storageKey(viewerAddress: Address, role: RefundRole): string {
  return `${STORAGE_PREFIX}${viewerAddress.toLowerCase()}:${role}`;
}

export function loadStoredRefundIds(viewerAddress: Address, role: RefundRole): StoredRefund[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKey(viewerAddress, role));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function rememberRefundId(
  viewerAddress: Address,
  role: RefundRole,
  entry: StoredRefund
): void {
  if (typeof window === 'undefined') return;
  try {
    const current = loadStoredRefundIds(viewerAddress, role);
    // De-dup by refundId
    const next = [...current.filter((r) => r.refundId !== entry.refundId), entry];
    window.localStorage.setItem(storageKey(viewerAddress, role), JSON.stringify(next));
  } catch {
    // Silent — localStorage might be disabled
  }
}

/**
 * Decode logs into RefundEntry objects, keyed by (merchant, customer, orderId)
 * so we can reconcile initiated+completed events into a single record.
 */
async function buildEntries(params: {
  initiatedLogs: Log[];
  completedLogs: Log[];
  initiatedTimestamps: Map<string, number>;
  completedTimestamps: Map<string, number>;
  storedRefundIds: StoredRefund[];
}): Promise<RefundEntry[]> {
  const { initiatedLogs, completedLogs, initiatedTimestamps, completedTimestamps, storedRefundIds } =
    params;

  // First pass: build a map keyed by "merchant|customer|orderId" of initiated refunds.
  const byKey = new Map<string, RefundEntry>();

  for (const log of initiatedLogs) {
    try {
      const decoded = decodeEventLog({
        abi: MerchantPortalABI as any,
        data: log.data,
        topics: log.topics,
        eventName: 'RefundInitiated',
      });
      const args = decoded.args as unknown as {
        customer: Address;
        merchant: Address;
        orderId: string;
        amount: bigint;
      };
      const key = `${args.merchant.toLowerCase()}|${args.customer.toLowerCase()}|${args.orderId}`;
      const timestampKey = `${log.transactionHash}|${log.logIndex}`;
      const initiatedAt = initiatedTimestamps.get(timestampKey) ?? 0;

      // Match against stored refundIds for fast lookup
      const stored = storedRefundIds.find((s) => s.orderId === args.orderId);

      const now = Math.floor(Date.now() / 1000);
      const isExpired = initiatedAt > 0 && now - initiatedAt > REFUND_COMPLETION_WINDOW;

      byKey.set(key, {
        refundId: stored?.refundId,
        customer: args.customer,
        merchant: args.merchant,
        orderId: args.orderId,
        amount: args.amount,
        initiatedAt,
        status: isExpired ? 'expired' : 'initiated',
        initiatedBlock: (log as any).blockNumber ?? 0n,
      });
    } catch {
      // Skip malformed log
    }
  }

  // Second pass: mark completed entries.
  for (const log of completedLogs) {
    try {
      const decoded = decodeEventLog({
        abi: MerchantPortalABI as any,
        data: log.data,
        topics: log.topics,
        eventName: 'RefundCompleted',
      });
      const args = decoded.args as unknown as {
        customer: Address;
        merchant: Address;
        orderId: string;
        amount: bigint;
      };
      const key = `${args.merchant.toLowerCase()}|${args.customer.toLowerCase()}|${args.orderId}`;
      const entry = byKey.get(key);
      const timestampKey = `${log.transactionHash}|${log.logIndex}`;
      const completedAt = completedTimestamps.get(timestampKey);

      if (entry) {
        entry.status = 'completed';
        entry.completedAt = completedAt;
      }
    } catch {
      // Skip malformed log
    }
  }

  return Array.from(byKey.values()).sort((a, b) => {
    // Newest first
    if (a.initiatedBlock !== b.initiatedBlock) {
      return Number(b.initiatedBlock - a.initiatedBlock);
    }
    return b.initiatedAt - a.initiatedAt;
  });
}

export function useRefundHistory(role: RefundRole, viewerAddress?: Address) {
  const { address: connectedAddress } = useAccount();
  const publicClient = usePublicClient();
  const portalAddress = CONTRACT_ADDRESSES.MerchantPortal;
  const portalConfigured = isConfiguredContractAddress(portalAddress);

  const target = viewerAddress ?? connectedAddress;
  const [entries, setEntries] = useState<RefundEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!portalConfigured || !target || !publicClient) {
      setEntries([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // Use getLogs with event signatures rather than precomputed topics, so
      // viem handles topic encoding for us.

      const initiatedFilter = {
        address: portalAddress,
        event: MerchantPortalABI.find((x: any) => x.type === 'event' && x.name === 'RefundInitiated') as any,
        args: role === 'merchant' ? { merchant: target } : { customer: target },
        fromBlock: 'earliest' as const,
      };

      const completedFilter = {
        address: portalAddress,
        event: MerchantPortalABI.find((x: any) => x.type === 'event' && x.name === 'RefundCompleted') as any,
        args: role === 'merchant' ? { merchant: target } : { customer: target },
        fromBlock: 'earliest' as const,
      };

      const [initiatedLogs, completedLogs] = await Promise.all([
        publicClient.getLogs(initiatedFilter),
        publicClient.getLogs(completedFilter),
      ]);

      // Fetch block timestamps for ordering and expiry calculation.
      // We batch by unique block to limit RPC calls.
      const allBlocks = new Set<bigint>();
      for (const log of [...initiatedLogs, ...completedLogs]) {
        if (log.blockNumber) allBlocks.add(log.blockNumber);
      }
      const blockTimestamps = new Map<bigint, number>();
      await Promise.all(
        Array.from(allBlocks).map(async (bn) => {
          try {
            const block = await publicClient.getBlock({ blockNumber: bn });
            blockTimestamps.set(bn, Number(block.timestamp));
          } catch {
            blockTimestamps.set(bn, 0);
          }
        })
      );

      const initiatedTimestamps = new Map<string, number>();
      const completedTimestamps = new Map<string, number>();
      for (const log of initiatedLogs) {
        if (log.blockNumber && log.transactionHash && log.logIndex !== null) {
          initiatedTimestamps.set(
            `${log.transactionHash}|${log.logIndex}`,
            blockTimestamps.get(log.blockNumber) ?? 0
          );
        }
      }
      for (const log of completedLogs) {
        if (log.blockNumber && log.transactionHash && log.logIndex !== null) {
          completedTimestamps.set(
            `${log.transactionHash}|${log.logIndex}`,
            blockTimestamps.get(log.blockNumber) ?? 0
          );
        }
      }

      const storedRefundIds = loadStoredRefundIds(target, role);

      const built = await buildEntries({
        initiatedLogs: initiatedLogs as Log[],
        completedLogs: completedLogs as Log[],
        initiatedTimestamps,
        completedTimestamps,
        storedRefundIds,
      });
      setEntries(built);
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || 'Failed to load refund history');
    } finally {
      setIsLoading(false);
    }
  }, [portalConfigured, target, publicClient, portalAddress, role]);

  useEffect(() => {
    let _cancelled = false;
    void refetch();
    return () => { _cancelled = true; };
    }, [refetch]);

  // Watch for new events while the page is mounted.
  useWatchContractEvent({
    address: portalAddress,
    abi: MerchantPortalABI,
    eventName: 'RefundInitiated',
    args: target ? (role === 'merchant' ? { merchant: target } : { customer: target }) : undefined,
    onLogs: () => {
      void refetch();
    },
    enabled: portalConfigured && !!target,
  });

  useWatchContractEvent({
    address: portalAddress,
    abi: MerchantPortalABI,
    eventName: 'RefundCompleted',
    args: target ? (role === 'merchant' ? { merchant: target } : { customer: target }) : undefined,
    onLogs: () => {
      void refetch();
    },
    enabled: portalConfigured && !!target,
  });

  return {
    entries,
    isLoading,
    error,
    refetch,
  };
}
