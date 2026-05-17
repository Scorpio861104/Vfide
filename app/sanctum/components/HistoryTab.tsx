'use client';

import { useEffect, useState } from 'react';
import { usePublicClient, useChainId } from 'wagmi';
import { formatEther, type Address } from 'viem';
import {
  AlertTriangle,
  AlertCircle,
  Coins,
  ExternalLink,
  Heart,
  History,
  Loader2,
  PlusCircle,
} from 'lucide-react';
import { CONTRACT_ADDRESSES, isConfiguredContractAddress } from '@/lib/contracts';

/**
 * HistoryTab — recent activity from SanctumVault, scanned from events.
 *
 * Tier 2 Phase 3 Turn 3 (2026-05-17) — converted from 5 hardcoded sample rows
 * to a real on-chain event scan over the last ~30 days (1.3M blocks at
 * Base's 2s block time). Pattern mirrors `app/governance/components/HistoryTab.tsx`
 * (the Tier 1 Phase 4 Turn 4 event-scan precedent):
 *   • viem `publicClient.getLogs` with inline-typed event signatures
 *   • parallel `getBlock` calls to enrich logs with timestamps
 *   • `fromBlock = latest - SCAN_LOOKBACK_BLOCKS` (rolling window)
 *
 * Tracked event types:
 *   • `Deposit(from, token, amount, note)`                  — donations + fee inflows
 *   • `DisbursementExecuted(proposalId, charity, token, amount)` — outflows to charities
 *   • `CharityApproved(charity, name, category)`            — registry additions
 *
 * Not tracked here (kept simpler — could be added in Tier 3):
 *   • DisbursementProposed / Approved / Rejected — visible in DisbursementsTab
 *   • CharityRemoved                              — visible in CharitiesTab as state change
 *   • Emergency / ownership / module-wiring events — operational concern
 *
 * Scope limit: 30 days. For deeper history, an indexer is the right answer
 * (logged as a Tier 3 candidate in the backlog).
 */

const SCAN_LOOKBACK_BLOCKS = 1_300_000n; // ~30 days on Base (2s blocks)
const MAX_DISPLAYED_ROWS = 100;

const DEFAULT_CHAIN_ID = 8453;
const TX_EXPLORER_BY_CHAIN: Record<number, string> = {
  1: 'https://etherscan.io',
  8453: 'https://basescan.org',
  11155111: 'https://sepolia.etherscan.io',
  84532: 'https://sepolia.basescan.org',
};

function getTxExplorerUrl(txHash: string, chainId: number = DEFAULT_CHAIN_ID): string {
  const explorerBase = TX_EXPLORER_BY_CHAIN[chainId] ?? TX_EXPLORER_BY_CHAIN[DEFAULT_CHAIN_ID];
  return `${explorerBase}/tx/${txHash}`;
}

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

type EventKind = 'deposit' | 'disbursement' | 'charity-approved';

interface HistoryEntry {
  kind: EventKind;
  blockNumber: bigint;
  logIndex: number;
  txHash: `0x${string}`;
  timestamp: number; // unix ms (0 if block fetch failed)
  // Kind-specific fields (filled per kind, others undefined)
  donor?: Address;
  charity?: Address;
  charityName?: string;
  category?: string;
  amount?: bigint;
  note?: string;
  proposalId?: bigint;
}

export function HistoryTab() {
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const sanctumAddress = CONTRACT_ADDRESSES.SanctumVault;
  const configured = isConfiguredContractAddress(sanctumAddress);

  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [state, setState] = useState<LoadState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!publicClient || !configured) {
      setEntries([]);
      setState('idle');
      return;
    }

    let cancelled = false;

    const load = async () => {
      setState('loading');
      setErrorMessage(null);
      try {
        const latestBlock = await publicClient.getBlockNumber();
        const fromBlock =
          latestBlock > SCAN_LOOKBACK_BLOCKS ? latestBlock - SCAN_LOOKBACK_BLOCKS : 0n;

        // Query the 3 event types in parallel. viem accepts inline event
        // signatures so we don't have to pull the whole SanctumVaultABI just
        // to filter individual events.
        const [depositLogs, executedLogs, charityApprovedLogs] = await Promise.all([
          publicClient.getLogs({
            address: sanctumAddress as Address,
            event: {
              type: 'event',
              name: 'Deposit',
              inputs: [
                { type: 'address', name: 'from', indexed: true },
                { type: 'address', name: 'token', indexed: true },
                { type: 'uint256', name: 'amount', indexed: false },
                { type: 'string', name: 'note', indexed: false },
              ],
            },
            fromBlock,
            toBlock: latestBlock,
          }),
          publicClient.getLogs({
            address: sanctumAddress as Address,
            event: {
              type: 'event',
              name: 'DisbursementExecuted',
              inputs: [
                { type: 'uint256', name: 'proposalId', indexed: true },
                { type: 'address', name: 'charity', indexed: true },
                { type: 'address', name: 'token', indexed: false },
                { type: 'uint256', name: 'amount', indexed: false },
              ],
            },
            fromBlock,
            toBlock: latestBlock,
          }),
          publicClient.getLogs({
            address: sanctumAddress as Address,
            event: {
              type: 'event',
              name: 'CharityApproved',
              inputs: [
                { type: 'address', name: 'charity', indexed: true },
                { type: 'string', name: 'name', indexed: false },
                { type: 'string', name: 'category', indexed: false },
              ],
            },
            fromBlock,
            toBlock: latestBlock,
          }),
        ]);

        // Build raw entries (without timestamps yet).
        const raw: HistoryEntry[] = [];
        for (const log of depositLogs) {
          const args = log.args as {
            from?: Address;
            token?: Address;
            amount?: bigint;
            note?: string;
          };
          raw.push({
            kind: 'deposit',
            blockNumber: log.blockNumber,
            logIndex: log.logIndex,
            txHash: log.transactionHash,
            timestamp: 0,
            donor: args.from,
            amount: args.amount,
            note: args.note,
          });
        }
        for (const log of executedLogs) {
          const args = log.args as {
            proposalId?: bigint;
            charity?: Address;
            amount?: bigint;
          };
          raw.push({
            kind: 'disbursement',
            blockNumber: log.blockNumber,
            logIndex: log.logIndex,
            txHash: log.transactionHash,
            timestamp: 0,
            proposalId: args.proposalId,
            charity: args.charity,
            amount: args.amount,
          });
        }
        for (const log of charityApprovedLogs) {
          const args = log.args as {
            charity?: Address;
            name?: string;
            category?: string;
          };
          raw.push({
            kind: 'charity-approved',
            blockNumber: log.blockNumber,
            logIndex: log.logIndex,
            txHash: log.transactionHash,
            timestamp: 0,
            charity: args.charity,
            charityName: args.name,
            category: args.category,
          });
        }

        // Sort newest first by (block, logIndex) before timestamp enrichment.
        raw.sort((a, b) => {
          if (a.blockNumber !== b.blockNumber) {
            return Number(b.blockNumber - a.blockNumber);
          }
          return b.logIndex - a.logIndex;
        });

        // Cap before enrichment (block fetches are the expensive step).
        const capped = raw.slice(0, MAX_DISPLAYED_ROWS);

        // Enrich with block timestamps. Batch by unique block number to
        // avoid duplicate RPC calls.
        const uniqueBlocks = Array.from(new Set(capped.map((e) => e.blockNumber)));
        const blockTimestamps = new Map<bigint, number>();
        await Promise.all(
          uniqueBlocks.map(async (bn) => {
            try {
              const block = await publicClient.getBlock({ blockNumber: bn });
              blockTimestamps.set(bn, Number(block.timestamp) * 1000);
            } catch {
              // Leave entry timestamps at 0 if block fetch fails.
            }
          }),
        );

        const enriched = capped.map((e) => ({
          ...e,
          timestamp: blockTimestamps.get(e.blockNumber) ?? 0,
        }));

        if (!cancelled) {
          setEntries(enriched);
          setState('ready');
        }
      } catch (e) {
        if (!cancelled) {
          setErrorMessage(e instanceof Error ? e.message : 'Failed to load event history');
          setState('error');
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [publicClient, configured, sanctumAddress]);

  // ── Not configured ──────────────────────────────────────────────────────
  if (!configured) {
    return (
      <div className="space-y-6">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-amber-400 font-bold mb-1">SanctumVault not configured</h3>
            <p className="text-sm text-zinc-400">
              The SanctumVault contract address is not configured for the current network. History
              is unavailable.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────
  if (state === 'loading' || state === 'idle') {
    return (
      <div className="space-y-6">
        <Header />
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-12 text-center">
          <Loader2 className="w-6 h-6 text-zinc-500 mx-auto animate-spin" />
          <p className="text-sm text-zinc-500 mt-3">Scanning recent events…</p>
        </div>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <div className="space-y-6">
        <Header />
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h3 className="text-red-400 font-bold mb-1">Failed to load history</h3>
            <p className="text-sm text-zinc-400 break-words">{errorMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Empty ───────────────────────────────────────────────────────────────
  if (entries.length === 0) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-12 text-center">
          <History className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-zinc-300 mb-2">No recent activity</h3>
          <p className="text-sm text-zinc-500 max-w-md mx-auto">
            No donations, disbursements, or charity approvals in the last 30 days.
          </p>
        </div>
      </div>
    );
  }

  // ── Data ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <Header />

      <div className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-900">
                <th className="text-left text-zinc-400 text-sm font-medium px-6 py-4">Type</th>
                <th className="text-left text-zinc-400 text-sm font-medium px-6 py-4">Details</th>
                <th className="text-right text-zinc-400 text-sm font-medium px-6 py-4">Amount</th>
                <th className="text-left text-zinc-400 text-sm font-medium px-6 py-4">When</th>
                <th className="text-left text-zinc-400 text-sm font-medium px-6 py-4">Tx</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-700">
              {entries.map((e) => (
                <tr
                  key={`${e.txHash}-${e.logIndex}`}
                  className="hover:bg-zinc-900/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <KindBadge kind={e.kind} />
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-100">
                    <DetailsCell entry={e} />
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    <AmountCell entry={e} />
                  </td>
                  <td className="px-6 py-4 text-zinc-400 text-sm whitespace-nowrap">
                    {e.timestamp > 0 ? formatTimestamp(e.timestamp) : `Block ${e.blockNumber.toString()}`}
                  </td>
                  <td className="px-6 py-4">
                    <a
                      href={getTxExplorerUrl(e.txHash, chainId ?? DEFAULT_CHAIN_ID)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 text-xs font-mono inline-flex items-center gap-1 transition-colors"
                    >
                      {shortHash(e.txHash)}
                      <ExternalLink size={10} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {entries.length >= MAX_DISPLAYED_ROWS && (
        <p className="text-xs text-zinc-500 text-center">
          Showing the most recent {MAX_DISPLAYED_ROWS} events from the last 30 days.
          {' '}For deeper history, query SanctumVault events directly via a block explorer.
        </p>
      )}
    </div>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────────────────

function Header() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-100">Recent Activity</h2>
      <p className="text-sm text-zinc-400 mt-1">
        SanctumVault donations, executed disbursements, and charity approvals from the last 30 days.
      </p>
    </div>
  );
}

function KindBadge({ kind }: { kind: EventKind }) {
  if (kind === 'disbursement') {
    return (
      <span className="px-2 py-1 rounded text-xs font-bold bg-green-500/20 text-green-400 inline-flex items-center gap-1">
        <Coins size={10} /> DISBURSEMENT
      </span>
    );
  }
  if (kind === 'deposit') {
    return (
      <span className="px-2 py-1 rounded text-xs font-bold bg-pink-500/20 text-pink-400 inline-flex items-center gap-1">
        <Heart size={10} /> DEPOSIT
      </span>
    );
  }
  return (
    <span className="px-2 py-1 rounded text-xs font-bold bg-cyan-500/20 text-cyan-400 inline-flex items-center gap-1">
      <PlusCircle size={10} /> CHARITY ADDED
    </span>
  );
}

function DetailsCell({ entry }: { entry: HistoryEntry }) {
  if (entry.kind === 'disbursement') {
    return (
      <span>
        To <a
          href={`/sanctum/charities/${entry.charity}`}
          className="text-cyan-400 hover:text-cyan-300 font-mono text-xs transition-colors"
        >
          {shortAddr(entry.charity ?? '')}
        </a>{' '}
        <span className="text-zinc-500 text-xs">· Proposal #{entry.proposalId?.toString() ?? '?'}</span>
      </span>
    );
  }
  if (entry.kind === 'deposit') {
    return (
      <span>
        From <span className="font-mono text-xs text-zinc-300">{shortAddr(entry.donor ?? '')}</span>
        {entry.note && entry.note.length > 0 && (
          <span className="text-zinc-500 text-xs ml-2">· {truncate(entry.note, 40)}</span>
        )}
      </span>
    );
  }
  // charity-approved
  return (
    <span>
      <span className="text-zinc-100 font-medium">{entry.charityName || '(unnamed)'}</span>{' '}
      <span className="text-zinc-500 text-xs">· {entry.category || 'uncategorized'}</span>{' '}
      <a
        href={`/sanctum/charities/${entry.charity}`}
        className="text-cyan-400 hover:text-cyan-300 font-mono text-xs transition-colors"
      >
        {shortAddr(entry.charity ?? '')}
      </a>
    </span>
  );
}

function AmountCell({ entry }: { entry: HistoryEntry }) {
  if (entry.kind === 'charity-approved' || entry.amount === undefined) {
    return <span className="text-zinc-500 text-xs">—</span>;
  }
  const sign = entry.kind === 'disbursement' ? '-' : '+';
  const color = entry.kind === 'disbursement' ? 'text-red-400' : 'text-green-400';
  return (
    <span className={`${color} tabular-nums`} title={`${formatEther(entry.amount)} VFIDE`}>
      {sign}
      {formatVFIDECompact(entry.amount)}
    </span>
  );
}

// ─── Utilities ─────────────────────────────────────────────────────────────

function shortAddr(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function shortHash(hash: string): string {
  if (!hash || hash.length < 12) return hash;
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return `${s.slice(0, n - 1)}…`;
}

function formatVFIDECompact(wei: bigint): string {
  if (wei === 0n) return '0';
  const tokens = Number(wei) / 1e18;
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  if (tokens >= 1) return tokens.toFixed(2);
  return tokens.toFixed(4);
}

function formatTimestamp(ms: number): string {
  if (ms === 0) return '—';
  try {
    return new Date(ms).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}
