'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useAccount,
  useReadContract,
  useWatchContractEvent,
  useWriteContract,
} from 'wagmi';
import { motion } from 'framer-motion';
import { formatUnits } from 'viem';
import { AlertTriangle, Clock, X, Loader2, Inbox, Shield } from 'lucide-react';
import CardBoundVaultABI from '@/lib/abis/CardBoundVault.json';
import { useGuardianWatchlist } from '@/app/guardians/components/hooks';
import { shortAddress } from '@/app/guardians/components/types';
import { QueueHourglass } from './QueueHourglass';

/**
 * Surfaces pending queued withdrawals (and payments, lazily) on every vault
 * the connected user has added to their Guardian Watchlist. Each queued item
 * has a Cancel button.
 *
 * The 7-day queue is only protective if a guardian SEES the queued item in
 * time. This widget is the visibility layer that closes that gap.
 *
 * Notes on data shape:
 *   - getPendingQueuedWithdrawals() returns (indices[], amounts[], executeAfters[]).
 *     One call per vault; cheap.
 *   - For payments, the contract exposes paymentQueue(i) per-index but no
 *     batch view. We fetch queueLength() first; if 0, skip. Otherwise we
 *     lazy-iterate (cap at 32 entries per vault for sanity).
 */

interface PendingItem {
  vault: `0x${string}`;
  vaultLabel?: string;
  kind: 'withdrawal' | 'payment';
  queueIndex: bigint;
  amount: bigint;
  executeAfter: bigint;
}

export function GuardianPendingQueueWidget() {
  const { address, isConnected } = useAccount();
  const { entries } = useGuardianWatchlist();

  if (!isConnected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-gray-700 bg-gray-900/40 p-6 text-center text-gray-400 text-sm"
      >
        Connect a wallet to see queued items on vaults you guard.
      </motion.div>
    );
  }

  if (!entries.length) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-gray-700 bg-gray-900/40 p-6 text-center"
      >
        <Inbox className="w-10 h-10 mx-auto mb-3 text-gray-500" />
        <div className="text-sm text-gray-400">
          You don't have any vaults in your Guardian Watchlist yet. Add a vault
          address above to see its pending queue here.
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Shield className="w-5 h-5 text-cyan-400" />
        <h3 className="text-lg font-bold text-white">Pending queue (guarded vaults)</h3>
      </div>
      <div className="text-xs text-gray-400 -mt-2">
        Anything below is sitting in a 7-day queue. Cancel button is available
        to you as a guardian. If you don't recognize an entry, cancel it and
        contact the vault owner.
      </div>

      {entries.map((entry) => (
        <PendingQueueRow
          key={entry.address}
          vault={entry.address}
          label={entry.label}
          connectedAddress={address}
        />
      ))}
    </div>
  );
}

interface PendingQueueRowProps {
  vault: `0x${string}`;
  label?: string;
  connectedAddress?: `0x${string}`;
}

function PendingQueueRow({ vault, label, connectedAddress }: PendingQueueRowProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const bumpRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // ─── Withdrawals — batch view ────────────────────────────────────────────
  const { data: withdrawalQueue, refetch: refetchWithdrawals } = useReadContract({
    address: vault,
    abi: CardBoundVaultABI,
    functionName: 'getPendingQueuedWithdrawals',
    query: { enabled: !!vault },
  });

  // ─── Payments — fetch queueLength + iterate paymentQueue(i) ──────────────
  const [paymentItems, setPaymentItems] = useState<PendingItem[]>([]);
  const { data: paymentManagerAddr } = useReadContract({
    address: vault,
    abi: CardBoundVaultABI,
    functionName: 'paymentQueueManager',
    query: { enabled: !!vault },
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!paymentManagerAddr || !window || !(window as any).ethereum) {
        setPaymentItems([]);
        return;
      }
      try {
        // We use a minimal inline ABI fragment to avoid pulling the
        // PaymentQueueManager ABI separately.
        const paymentQueueMgrAbi = [
          {
            name: 'queueLength',
            type: 'function',
            stateMutability: 'view',
            inputs: [],
            outputs: [{ type: 'uint256' }],
          },
          {
            name: 'paymentQueue',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ type: 'uint256' }],
            outputs: [
              { type: 'address', name: 'token' },
              { type: 'address', name: 'merchant' },
              { type: 'address', name: 'recipient' },
              { type: 'uint256', name: 'amount' },
              { type: 'uint64', name: 'executeAfter' },
              { type: 'bool', name: 'executed' },
              { type: 'bool', name: 'cancelled' },
            ],
          },
        ] as const;

        // Best-effort: use viem via the global wallet provider. If we can't,
        // we just skip payment-queue display; withdrawals are the primary
        // recovery mechanism anyway.
        const { createPublicClient, custom } = await import('viem');
        const client = createPublicClient({ transport: custom((window as any).ethereum) });

        const length = (await client.readContract({
          address: paymentManagerAddr as `0x${string}`,
          abi: paymentQueueMgrAbi,
          functionName: 'queueLength',
        })) as bigint;

        const cap = length > 32n ? 32n : length;
        const items: PendingItem[] = [];
        for (let i = 0n; i < cap; i++) {
          const entry = (await client.readContract({
            address: paymentManagerAddr as `0x${string}`,
            abi: paymentQueueMgrAbi,
            functionName: 'paymentQueue',
            args: [i],
          })) as readonly [
            `0x${string}`,
            `0x${string}`,
            `0x${string}`,
            bigint,
            bigint,
            boolean,
            boolean,
          ];
          const [, , , amount, executeAfter, executed, cancelledFlag] = entry;
          if (executed || cancelledFlag) continue;
          items.push({
            vault,
            vaultLabel: label,
            kind: 'payment',
            queueIndex: i,
            amount,
            executeAfter,
          });
        }
        if (!cancelled) setPaymentItems(items);
      } catch {
        if (!cancelled) setPaymentItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [paymentManagerAddr, vault, label, refreshKey]);

  // ─── Live event subscription ────────────────────────────────────────────
  useWatchContractEvent({
    address: vault,
    abi: CardBoundVaultABI,
    eventName: 'WithdrawalQueued',
    onLogs: () => {
      void refetchWithdrawals();
    },
  });
  useWatchContractEvent({
    address: vault,
    abi: CardBoundVaultABI,
    eventName: 'PaymentQueued',
    onLogs: bumpRefresh,
  });
  useWatchContractEvent({
    address: vault,
    abi: CardBoundVaultABI,
    eventName: 'WithdrawalCancelled',
    onLogs: () => {
      void refetchWithdrawals();
    },
  });
  useWatchContractEvent({
    address: vault,
    abi: CardBoundVaultABI,
    eventName: 'PaymentQueueCancelled',
    onLogs: bumpRefresh,
  });

  // ─── Combined pending items ──────────────────────────────────────────────
  const withdrawalItems: PendingItem[] = useMemo(() => {
    if (!withdrawalQueue) return [];
    const [indices, amounts, executeAfters] = withdrawalQueue as readonly [
      readonly bigint[],
      readonly bigint[],
      readonly bigint[],
    ];
    return indices.map((idx, i) => ({
      vault,
      vaultLabel: label,
      kind: 'withdrawal' as const,
      queueIndex: idx,
      amount: amounts[i]!,
      executeAfter: executeAfters[i]!,
    }));
  }, [withdrawalQueue, vault, label]);

  const allItems = useMemo(
    () => [...withdrawalItems, ...paymentItems].sort((a, b) => Number(a.executeAfter - b.executeAfter)),
    [withdrawalItems, paymentItems],
  );

  const { writeContractAsync } = useWriteContract();
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const handleCancel = async (item: PendingItem) => {
    const key = `${item.kind}-${item.queueIndex}`;
    setCancelling(key);
    setCancelError(null);
    try {
      await writeContractAsync({
        address: vault,
        abi: CardBoundVaultABI,
        functionName:
          item.kind === 'withdrawal' ? 'cancelQueuedWithdrawal' : 'cancelQueuedPayment',
        args: [item.queueIndex],
      });
      bumpRefresh();
      if (item.kind === 'withdrawal') void refetchWithdrawals();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Cancel failed.');
    } finally {
      setCancelling(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-gray-700 bg-gray-900/50 p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-semibold text-white">
            {label || 'Vault'}{' '}
            <span className="text-xs font-mono text-gray-500 ml-2">{shortAddress(vault)}</span>
          </div>
          <div className="text-xs text-gray-500">
            {allItems.length === 0
              ? 'No pending queue items.'
              : `${allItems.length} pending item${allItems.length === 1 ? '' : 's'}`}
          </div>
        </div>
        <button
          onClick={() => {
            void refetchWithdrawals();
            bumpRefresh();
          }}
          className="text-xs text-cyan-400 hover:text-cyan-300"
        >
          Refresh
        </button>
      </div>

      {cancelError && (
        <div className="mb-3 rounded-lg bg-red-500/10 border border-red-500/30 p-2 text-xs text-red-300">
          {cancelError}
        </div>
      )}

      {allItems.length === 0 ? (
        <div className="text-xs text-gray-500 italic">Nothing queued.</div>
      ) : (
        <div className="space-y-2">
          {allItems.map((item) => {
            const isWithdrawal = item.kind === 'withdrawal';
            const cancelKey = `${item.kind}-${item.queueIndex}`;
            const isBusy = cancelling === cancelKey;
            const executesAt = Number(item.executeAfter) * 1000;
            const remainingMs = Math.max(0, executesAt - Date.now());
            const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));

            return (
              <div
                key={cancelKey}
                className={`flex items-center gap-3 rounded-lg border p-3 ${
                  isWithdrawal
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : 'border-purple-500/30 bg-purple-500/5'
                }`}
              >
                <div className="flex-shrink-0">
                  <QueueHourglass
                    executeAfterSec={item.executeAfter}
                    accent={isWithdrawal ? '#fbbf24' : '#a855f7'}
                    size={36}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white">
                    {isWithdrawal ? 'Withdrawal' : 'Payment'} #{item.queueIndex.toString()}
                  </div>
                  <div className="text-xs text-gray-400">
                    Amount: <span className="font-mono">{formatUnits(item.amount, 18)} VFIDE</span> ·
                    Executes in {remainingHours}h
                    {remainingMs <= 0 && (
                      <span className="text-red-400 font-semibold"> (executable now)</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleCancel(item)}
                  disabled={isBusy}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-medium transition-colors"
                >
                  {isBusy ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                  Cancel
                </button>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
