'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePublicClient, useChainId } from 'wagmi';
import { type Address, parseAbiItem, formatUnits } from 'viem';
import { CONTRACT_ADDRESSES, VAULT_HUB_ABI, CARD_BOUND_VAULT_ABI } from '@/lib/contracts';
import { isAddress } from 'viem';

export interface VaultTransaction {
  id: string;
  type:
    | 'send'
    | 'receive'
    | 'vault_deposit'
    | 'vault_withdraw'
    | 'guardian_added'
    | 'guardian_removed'
    | 'next_of_kin_set'
    | 'recovery_requested'
    | 'recovery_approved'
    | 'recovery_finalized'
    | 'recovery_cancelled';
  amount?: string;
  from?: string;
  to?: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
  txHash: string;
  blockNumber?: number;
}

const GUARDIAN_ADDED = parseAbiItem(
  'event GuardianChanged(address indexed guardian, bool active)'
);
const TRUSTEE_CHANGED = parseAbiItem(
  'event TrusteeChanged(address indexed trustee, bool active)'
);
const PAYMENT_QUEUED = parseAbiItem(
  'event PaymentQueued(uint256 indexed queueIndex, address indexed token, address indexed merchant, address recipient, uint256 amount, uint64 executeAfter)'
);
const PAYMENT_EXECUTED = parseAbiItem(
  'event PaymentQueueExecuted(uint256 indexed queueIndex, address recipient, uint256 amount)'
);
const WITHDRAWAL_QUEUED = parseAbiItem(
  'event WithdrawalQueued(uint256 indexed queueIndex, address indexed recipient, uint256 amount, uint64 executeAfter)'
);
const WITHDRAWAL_EXECUTED = parseAbiItem(
  'event WithdrawalQueueExecuted(uint256 indexed queueIndex, address recipient, uint256 amount)'
);

const VFIDE_TRANSFER = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)'
);

const BLOCKS_PER_QUERY = 50_000n;
const MAX_TRANSACTIONS = 100;

function shortAddr(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatTimestamp(blockNumber: bigint, chainId: number): string {
  // Rough estimate: Base mainnet ~2s/block, Sepolia ~12s/block
  // We don't have exact block timestamps without a separate eth_getBlockByNumber call
  // so we return block number as reference; VaultContent can enrich if needed.
  return `Block #${blockNumber.toLocaleString()}`;
}

/**
 * useVaultTransactions
 *
 * Fetches on-chain event logs for a CardBoundVault address and returns
 * a flat, sorted list of VaultTransaction objects.
 *
 * Backlog fix (2026-05-15 Phase 3b Turn 3):
 *   components/vault/TransactionHistory was always called with no `transactions` prop
 *   → rendered empty state forever. This hook provides the real data source.
 *
 * Reads:
 *   - VFIDEToken Transfer events to/from the vault (send / receive)
 *   - CardBoundVault GuardianChanged events
 *   - CardBoundVault PaymentQueued / PaymentQueueExecuted
 *   - CardBoundVault WithdrawalQueued / WithdrawalQueueExecuted
 */
export function useVaultTransactions(vaultAddress: Address | undefined): {
  transactions: VaultTransaction[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const [transactions, setTransactions] = useState<VaultTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!vaultAddress || !isAddress(vaultAddress) || !publicClient) return;

    const tokenAddress = CONTRACT_ADDRESSES.VFIDEToken as Address | undefined;
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const latestBlock = await publicClient!.getBlockNumber();
        const fromBlock = latestBlock > BLOCKS_PER_QUERY
          ? latestBlock - BLOCKS_PER_QUERY
          : 0n;

        const txMap = new Map<string, VaultTransaction>();

        // ─── VFIDE Transfers ───────────────────────────────────────────────
        if (tokenAddress && isAddress(tokenAddress)) {
          const [inLogs, outLogs] = await Promise.all([
            publicClient!.getLogs({
              address: tokenAddress,
              event: VFIDE_TRANSFER,
              args: { to: vaultAddress },
              fromBlock,
              toBlock: latestBlock,
            }),
            publicClient!.getLogs({
              address: tokenAddress,
              event: VFIDE_TRANSFER,
              args: { from: vaultAddress },
              fromBlock,
              toBlock: latestBlock,
            }),
          ]);

          for (const log of inLogs) {
            if (!log.args || !log.transactionHash) continue;
            const key = `${log.transactionHash}-${log.logIndex}`;
            txMap.set(key, {
              id: key,
              type: 'receive',
              amount: `+${formatUnits(log.args.value ?? 0n, 18)} VFIDE`,
              from: shortAddr(log.args.from ?? ''),
              timestamp: formatTimestamp(log.blockNumber ?? 0n, chainId),
              status: 'completed',
              txHash: log.transactionHash,
              blockNumber: Number(log.blockNumber ?? 0n),
            });
          }

          for (const log of outLogs) {
            if (!log.args || !log.transactionHash) continue;
            const key = `${log.transactionHash}-${log.logIndex}`;
            txMap.set(key, {
              id: key,
              type: 'send',
              amount: `-${formatUnits(log.args.value ?? 0n, 18)} VFIDE`,
              to: shortAddr(log.args.to ?? ''),
              timestamp: formatTimestamp(log.blockNumber ?? 0n, chainId),
              status: 'completed',
              txHash: log.transactionHash,
              blockNumber: Number(log.blockNumber ?? 0n),
            });
          }
        }

        // ─── Guardian changes ──────────────────────────────────────────────
        try {
          const guardianLogs = await publicClient!.getLogs({
            address: vaultAddress,
            event: GUARDIAN_ADDED,
            fromBlock,
            toBlock: latestBlock,
          });
          for (const log of guardianLogs) {
            if (!log.transactionHash) continue;
            const key = `${log.transactionHash}-${log.logIndex}`;
            txMap.set(key, {
              id: key,
              type: log.args?.active ? 'guardian_added' : 'guardian_removed',
              to: shortAddr(log.args?.guardian ?? ''),
              timestamp: formatTimestamp(log.blockNumber ?? 0n, chainId),
              status: 'completed',
              txHash: log.transactionHash,
              blockNumber: Number(log.blockNumber ?? 0n),
            });
          }
        } catch {
          // Vault may not yet exist on-chain; swallow gracefully
        }

        // ─── Payment queue ─────────────────────────────────────────────────
        try {
          const paymentQueuedLogs = await publicClient!.getLogs({
            address: vaultAddress,
            event: PAYMENT_QUEUED,
            fromBlock,
            toBlock: latestBlock,
          });
          for (const log of paymentQueuedLogs) {
            if (!log.transactionHash) continue;
            const key = `${log.transactionHash}-${log.logIndex}`;
            txMap.set(key, {
              id: key,
              type: 'send',
              amount: `-${formatUnits(log.args?.amount ?? 0n, 18)} VFIDE`,
              to: shortAddr(log.args?.merchant ?? ''),
              timestamp: formatTimestamp(log.blockNumber ?? 0n, chainId),
              status: 'pending',
              txHash: log.transactionHash,
              blockNumber: Number(log.blockNumber ?? 0n),
            });
          }

          const paymentExecLogs = await publicClient!.getLogs({
            address: vaultAddress,
            event: PAYMENT_EXECUTED,
            fromBlock,
            toBlock: latestBlock,
          });
          for (const log of paymentExecLogs) {
            if (!log.transactionHash) continue;
            const key = `${log.transactionHash}-${log.logIndex}`;
            txMap.set(key, {
              id: key,
              type: 'send',
              amount: `-${formatUnits(log.args?.amount ?? 0n, 18)} VFIDE`,
              to: shortAddr(log.args?.recipient ?? ''),
              timestamp: formatTimestamp(log.blockNumber ?? 0n, chainId),
              status: 'completed',
              txHash: log.transactionHash,
              blockNumber: Number(log.blockNumber ?? 0n),
            });
          }
        } catch {
          // Vault may not yet exist
        }

        // ─── Withdrawal queue ──────────────────────────────────────────────
        try {
          const wQueuedLogs = await publicClient!.getLogs({
            address: vaultAddress,
            event: WITHDRAWAL_QUEUED,
            fromBlock,
            toBlock: latestBlock,
          });
          for (const log of wQueuedLogs) {
            if (!log.transactionHash) continue;
            const key = `${log.transactionHash}-${log.logIndex}`;
            txMap.set(key, {
              id: key,
              type: 'vault_withdraw',
              amount: `-${formatUnits(log.args?.amount ?? 0n, 18)} VFIDE`,
              to: shortAddr(log.args?.recipient ?? ''),
              timestamp: formatTimestamp(log.blockNumber ?? 0n, chainId),
              status: 'pending',
              txHash: log.transactionHash,
              blockNumber: Number(log.blockNumber ?? 0n),
            });
          }

          const wExecLogs = await publicClient!.getLogs({
            address: vaultAddress,
            event: WITHDRAWAL_EXECUTED,
            fromBlock,
            toBlock: latestBlock,
          });
          for (const log of wExecLogs) {
            if (!log.transactionHash) continue;
            const key = `${log.transactionHash}-${log.logIndex}`;
            // Upgrade existing pending entry to completed if present
            const existing = txMap.get(key);
            txMap.set(key, {
              ...(existing ?? {}),
              id: key,
              type: 'vault_withdraw',
              amount: `-${formatUnits(log.args?.amount ?? 0n, 18)} VFIDE`,
              to: shortAddr(log.args?.recipient ?? ''),
              timestamp: formatTimestamp(log.blockNumber ?? 0n, chainId),
              status: 'completed',
              txHash: log.transactionHash,
              blockNumber: Number(log.blockNumber ?? 0n),
            });
          }
        } catch {
          // Vault may not yet exist
        }

        if (cancelled) return;

        // Sort descending by block number, cap at MAX_TRANSACTIONS
        const sorted = [...txMap.values()]
          .sort((a, b) => (b.blockNumber ?? 0) - (a.blockNumber ?? 0))
          .slice(0, MAX_TRANSACTIONS);

        setTransactions(sorted);
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Failed to load transactions';
          setError(msg);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vaultAddress, publicClient, chainId, tick]);

  return { transactions, isLoading, error, refetch };
}
