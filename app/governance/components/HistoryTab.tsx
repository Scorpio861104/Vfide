'use client';

/**
 * HistoryTab — the user's voting history.
 *
 * Source of truth is the DAO contract's Voted(uint256 id, address voter,
 * bool support) event. We query past events filtered by the connected
 * wallet's address and enrich each entry with the proposal's title and
 * final status by reading getProposalDetails().
 *
 * Previous implementation displayed 8 hardcoded fake votes regardless of
 * the user's actual on-chain activity, which was misleading.
 */

import { useEffect, useMemo, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { Loader2, AlertCircle } from 'lucide-react';

import { exportCSV } from '@/components/export/csv-export';
import { DAOABI } from '@/lib/abis';
import { CONTRACT_ADDRESSES, isConfiguredContractAddress } from '@/lib/contracts';

const DAO_ADDRESS = CONTRACT_ADDRESSES.DAO;

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

interface VoteHistoryEntry {
  proposalId: bigint;
  voter: `0x${string}`;
  support: boolean;
  blockNumber: bigint;
  txHash: `0x${string}`;
  timestamp: number;        // unix ms
  // Enriched from getProposalDetails
  title?: string;
  status?: 'passed' | 'rejected' | 'pending';
  votingPower?: bigint;     // votes_for + votes_against at finalization
}

// How far back to scan. ~1 month at 2s block time = 1.3M blocks. We cap to
// avoid expensive RPC calls; the user can use the explorer for older votes.
const SCAN_LOOKBACK_BLOCKS = 1_300_000n;

export function HistoryTab({ searchQuery = '' }: { searchQuery?: string }) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const isAvailable = isConfiguredContractAddress(DAO_ADDRESS);
  const [entries, setEntries] = useState<VoteHistoryEntry[]>([]);
  const [state, setState] = useState<LoadState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!address || !publicClient || !isAvailable) {
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
        const fromBlock = latestBlock > SCAN_LOOKBACK_BLOCKS
          ? latestBlock - SCAN_LOOKBACK_BLOCKS
          : 0n;

        // Read all Voted events filtered by the user's address. viem accepts
        // a typed event signature; we declare it inline to avoid pulling in
        // the whole ABI just to filter one event.
        const logs = await publicClient.getLogs({
          address: DAO_ADDRESS,
          event: {
            type: 'event',
            name: 'Voted',
            inputs: [
              { type: 'uint256', name: 'id', indexed: false },
              { type: 'address', name: 'voter', indexed: false },
              { type: 'bool', name: 'support', indexed: false },
            ],
          },
          fromBlock,
          toBlock: latestBlock,
        });

        // Filter to the user's votes only (the event isn't indexed on
        // voter, so we filter client-side).
        const userLogs = logs.filter(
          (l) => (l.args as { voter?: string })?.voter?.toLowerCase() === address.toLowerCase(),
        );

        // Resolve block timestamps and proposal details in parallel.
        const enriched = await Promise.all(
          userLogs.map(async (log) => {
            const args = log.args as { id?: bigint; voter?: `0x${string}`; support?: boolean };
            if (args.id === undefined || args.voter === undefined || args.support === undefined) {
              return null;
            }

            let timestamp = 0;
            try {
              const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
              timestamp = Number(block.timestamp) * 1000;
            } catch {
              // ignore — fall back to 0
            }

            let title: string | undefined;
            let status: VoteHistoryEntry['status'];
            let votingPower: bigint | undefined;
            try {
              const details = (await publicClient.readContract({
                address: DAO_ADDRESS,
                abi: DAOABI,
                functionName: 'getProposalDetails',
                args: [args.id],
              })) as readonly [
                `0x${string}`, number, `0x${string}`, bigint, string,
                bigint, bigint, bigint, bigint, boolean, boolean,
              ];
              title = details[4];
              const votesFor = details[5];
              const votesAgainst = details[6];
              const endTime = details[8];
              const executed = details[9];
              const cancelled = details[10];
              votingPower = votesFor + votesAgainst;

              if (cancelled) status = 'rejected';
              else if (Number(endTime) * 1000 > Date.now()) status = 'pending';
              else if (executed || votesFor > votesAgainst) status = 'passed';
              else status = 'rejected';
            } catch {
              // Proposal may have been pruned; leave fields undefined
            }

            const entry: VoteHistoryEntry = {
              proposalId: args.id,
              voter: args.voter,
              support: args.support,
              blockNumber: log.blockNumber,
              txHash: log.transactionHash,
              timestamp,
              title,
              status,
              votingPower,
            };
            return entry;
          }),
        );

        const finalEntries = enriched
          .filter((e): e is VoteHistoryEntry => e !== null)
          .sort((a, b) => Number(b.blockNumber - a.blockNumber));

        if (!cancelled) {
          setEntries(finalEntries);
          setState('ready');
        }
      } catch (err) {
        if (!cancelled) {
          setEntries([]);
          setState('error');
          setErrorMessage(
            err instanceof Error
              ? err.message
              : 'Failed to load voting history from the network.',
          );
        }
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [address, publicClient, isAvailable]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        (e.title ?? '').toLowerCase().includes(q) ||
        e.proposalId.toString().includes(q),
    );
  }, [entries, searchQuery]);

  return (
    <section className="py-8">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <h2 className="text-2xl font-bold text-zinc-100">
              Your Voting History {state === 'ready' && `(${filtered.length})`}
            </h2>
            {state === 'ready' && filtered.length > 0 && (
              <button
                onClick={() => {
                  exportCSV({
                    filename: 'voting-history',
                    headers: ['Proposal ID', 'Title', 'Vote', 'Date', 'Status', 'Tx Hash'],
                    rows: filtered.map((e) => [
                      e.proposalId.toString(),
                      e.title ?? '(proposal pruned)',
                      e.support ? 'FOR' : 'AGAINST',
                      e.timestamp ? new Date(e.timestamp).toISOString() : '',
                      e.status ?? 'unknown',
                      e.txHash,
                    ]),
                  });
                }}
                className="px-4 py-2 bg-zinc-900 border border-zinc-700 text-cyan-400 rounded-lg font-bold hover:border-cyan-400"
              >
                📊 Export CSV
              </button>
            )}
          </div>

          {!isAvailable && (
            <EmptyState
              title="DAO not yet deployed"
              message="The on-chain DAO address isn't configured for this build. Voting history will appear here after the protocol is live."
            />
          )}

          {isAvailable && !address && (
            <EmptyState
              title="Connect a wallet to see your votes"
              message="Voting history is keyed to your wallet address. Connect to view yours."
            />
          )}

          {isAvailable && address && state === 'loading' && (
            <div className="flex items-center justify-center gap-3 py-12 text-zinc-400">
              <Loader2 size={20} className="animate-spin" />
              <span>Loading votes from the network…</span>
            </div>
          )}

          {isAvailable && address && state === 'error' && (
            <EmptyState
              title="Could not load voting history"
              message={errorMessage ?? 'Network error while fetching events.'}
              tone="error"
            />
          )}

          {isAvailable && address && state === 'ready' && filtered.length === 0 && (
            <EmptyState
              title="No votes yet"
              message={
                searchQuery.trim()
                  ? 'No votes match your search.'
                  : "You haven't voted on any proposals yet. Head to the Proposals tab to cast your first vote."
              }
            />
          )}

          <div className="space-y-3">
            {filtered.map((entry) => (
              <VoteRow key={entry.txHash} entry={entry} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function VoteRow({ entry }: { entry: VoteHistoryEntry }) {
  const dateText = entry.timestamp
    ? new Date(entry.timestamp).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : `Block ${entry.blockNumber}`;

  const resultLabel =
    entry.status === 'passed'
      ? 'Passed ✓'
      : entry.status === 'rejected'
      ? 'Rejected ✗'
      : entry.status === 'pending'
      ? 'Pending'
      : 'Unknown';

  const resultColor =
    entry.status === 'passed'
      ? 'text-emerald-500'
      : entry.status === 'rejected'
      ? 'text-red-600'
      : 'text-orange-500';

  return (
    <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg hover:border hover:border-zinc-700">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1 flex-wrap">
          <span className="text-zinc-400 text-sm font-mono">#{entry.proposalId.toString()}</span>
          <span className="text-zinc-100 font-bold truncate">
            {entry.title ?? <em className="text-zinc-500">Proposal details unavailable</em>}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <span className={entry.support ? 'text-emerald-500' : 'text-red-600'}>
            Voted {entry.support ? 'FOR' : 'AGAINST'}
          </span>
          <span className="text-zinc-400">{dateText}</span>
          {entry.votingPower !== undefined && (
            <span className="text-zinc-400">
              Final tally: {entry.votingPower.toString()} votes
            </span>
          )}
        </div>
      </div>
      <div className="text-right">
        <div className={`font-bold ${resultColor}`}>{resultLabel}</div>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  message,
  tone = 'neutral',
}: {
  title: string;
  message: string;
  tone?: 'neutral' | 'error';
}) {
  const Icon = tone === 'error' ? AlertCircle : null;
  return (
    <div className="text-center py-12">
      {Icon && <Icon size={32} className="mx-auto text-red-400 mb-3" />}
      <div className="text-zinc-100 font-semibold mb-1">{title}</div>
      <div className="text-zinc-400 text-sm max-w-md mx-auto">{message}</div>
    </div>
  );
}
