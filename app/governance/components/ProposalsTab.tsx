'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
      setProposals(base.map((p, i) => ({ ...p, voted: votedFlags[i] ?? false })));
import { type Address } from 'viem';
import { AlertCircle, CheckCircle2, Loader2, Wallet, Info } from 'lucide-react';

import { exportCSV } from '@/components/export/csv-export';
import { DAOABI } from '@/lib/abis';
import { CONTRACT_ADDRESSES, isConfiguredContractAddress } from '@/lib/contracts';
import { VirtualizedList } from '@/lib/ux/performanceUtils';
import { Numeric } from '@/components/ui/Numeric';

import { useCountdown } from './useCountdown';
import type { Proposal } from './types';
import { ProposalCard } from './ProposalCard';
import {
  useDAO,
  proposalTypeLabel,
  ProposalStatus,
  type ProposalRecord,
} from '@/hooks/useDAO';
import { useProposals } from '@/hooks/useProposals';

const DAO_ADDRESS = CONTRACT_ADDRESSES.DAO;

/**
 * Map a ProposalRecord (contract-native types) into the display-oriented Proposal
 * shape. Pre-computes the time-left countdown string + truncated proposer label.
 */
function recordToProposal(r: ProposalRecord): Proposal {
  const endTimeMs = Number(r.endTime) * 1000;
  const startTimeMs = Number(r.startTime) * 1000;
  return {
    id: Number(r.id),
    type: proposalTypeLabel(r.ptype).toUpperCase(),
    title: r.description.split('\n')[0] || `Proposal #${r.id}`,
    author: `${r.proposer.slice(0, 6)}…${r.proposer.slice(-4)}`,
    timeLeft: formatTimeLeft(endTimeMs),
    endTime: endTimeMs,
    startTime: startTimeMs,
    forVotes: Number(r.forVotes),
    againstVotes: Number(r.againstVotes),
    voted: false, // updated after hasVoted batch read
    description: r.description,
    status: r.status,
    ptype: r.ptype,
    proposerAddress: r.proposer,
  };
}

function formatTimeLeft(endTimeMs: number): string {
  const diff = endTimeMs - Date.now();
  if (diff <= 0) return 'Ended';

  const totalHours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days > 0) return `${days}d ${hours}h`;
  if (totalHours > 0) return `${totalHours}h`;

  const minutes = Math.floor(diff / (1000 * 60));
  return `${Math.max(minutes, 1)}m`;
}

export function ProposalsTab({
  searchQuery = '',
  onCreateProposal,
}: {
  searchQuery?: string;
  onCreateProposal?: () => void;
}) {
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const isAvailable = isConfiguredContractAddress(DAO_ADDRESS);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [showAllProposals, setShowAllProposals] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const dao = useDAO();
  const { proposals: records, isLoading: proposalsLoading, refetch: refetchList } = useProposals({ mode: 'active' });

  // Decorate proposals with viewer-specific hasVoted by batched read
  const [proposals, setProposals] = useState<Proposal[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function decorate() {
      // Map to display shape
      const base = records.map(recordToProposal);
      if (!address || !publicClient || !isAvailable || base.length === 0) {
        if (!cancelled) setProposals(base);
        return;
      }
      // Batched hasVoted read — one call per proposal, ran in parallel
      const votedFlags = await Promise.all(
        base.map(async (p) => {
          try {
            const r = await publicClient.readContract({
              address: DAO_ADDRESS as Address,
              abi: DAOABI,
              functionName: 'hasVoted',
              args: [BigInt(p.id), address],
            });
            return r as boolean;
          } catch {
            return false;
          }
        })
      );
      if (cancelled) return;
      setProposals(base.map((p, i) => ({ ...p, voted: votedFlags[i] })));
    }
    void decorate();
    return () => {
      cancelled = true;
    };
  }, [records, address, publicClient, isAvailable]);

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      const matchesSearch =
        searchQuery === '' ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toString().includes(searchQuery);
      const matchesType = filterType === 'all' || p.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [searchQuery, filterType, proposals]);

  const shouldVirtualize = filteredProposals.length > 8;
  const usePerformanceMode = shouldVirtualize && !showAllProposals;

  useEffect(() => {
    if (!shouldVirtualize) {
      setShowAllProposals(false);
    }
  }, [shouldVirtualize]);

  // ── Action handlers ───────────────────────────────────────────────────────
  const runAction = useCallback(
    async (fn: () => Promise<unknown>, successMessage: string) => {
      setActionError(null);
      setActionMessage(null);
      try {
        await fn();
        setActionMessage(successMessage);
        await refetchList();
      } catch (e: any) {
        setActionError(e?.shortMessage || e?.message || 'Action failed.');
      }
    },
    [refetchList]
  );

  const handleVote = (id: bigint, support: boolean) =>
    runAction(() => dao.vote(id, support), `Vote cast on proposal #${id}.`);
  const handleFinalize = (id: bigint) =>
    runAction(() => dao.finalize(id), `Proposal #${id} finalized.`);
  const handleExecute = (id: bigint) =>
    runAction(() => dao.executeTimelockTx(id), `Proposal #${id} executed.`);
  const handleExpire = (id: bigint) =>
    runAction(() => dao.expireQueuedProposal(id), `Queued proposal #${id} expired.`);
  const handleWithdraw = (id: bigint) =>
    runAction(() => dao.withdrawProposal(id), `Proposal #${id} withdrawn.`);

  const viewer = useMemo(
    () => ({
      address: address as Address | undefined,
      isEligible: dao.isEligible,
      // hasVoted is per-proposal — passed through prop.voted on the card
    }),
    [address, dao.isEligible]
  );

  if (!isAvailable) {
    return (
      <section className="py-8">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-8 text-center">
            <AlertCircle className="mx-auto text-amber-400 mb-3" size={28} />
            <p className="text-zinc-100 font-semibold">DAO is not configured for this environment.</p>
            <p className="text-zinc-400 text-sm mt-1">Set NEXT_PUBLIC_DAO_ADDRESS to interact with governance.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8">
      <div className="container mx-auto px-3 sm:px-4 space-y-4">
        {/* Eligibility banner — shows when wallet is connected */}
        {address && (
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 flex items-center gap-3 flex-wrap">
            <Wallet className="text-cyan-400 shrink-0" size={18} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-zinc-100">
                <span className="text-zinc-400">Voting power:</span>{' '}
                <Numeric value={Number(dao.votingPower)} format="integer" className="text-zinc-100" weight={600} />
                {!dao.isEligible && (
                  <span className="ml-3 text-amber-400 text-xs">
                    <Info size={10} className="inline" /> Not currently eligible — ProofScore below minimum
                  </span>
                )}
                {dao.cooldownActive && (
                  <span className="ml-3 text-amber-400 text-xs">
                    <Info size={10} className="inline" /> Proposal cooldown active
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Action feedback */}
        {actionError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
            <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-300">{actionError}</p>
          </div>
        )}
        {actionMessage && !actionError && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-start gap-2">
            <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 shrink-0" />
            <p className="text-sm text-emerald-300">{actionMessage}</p>
          </div>
        )}

        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-zinc-100">
                Active Proposals ({filteredProposals.length})
                {proposalsLoading && (
                  <Loader2 size={16} className="inline ml-2 text-cyan-400 animate-spin" />
                )}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    exportCSV({
                      filename: 'proposals',
                      headers: ['ID', 'Type', 'Title', 'For Votes', 'Against Votes'],
                      rows: filteredProposals.map((p) => [p.id, p.type, p.title, p.forVotes, p.againstVotes]),
                    });
                  }}
                  className="px-4 py-2 bg-zinc-900 border border-zinc-700 text-cyan-400 rounded-lg font-bold hover:border-cyan-400 transition-colors"
                >
                  📊 Export CSV
                </button>
                <button
                  onClick={() => onCreateProposal?.()}
                  disabled={!onCreateProposal}
                  className="px-6 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-zinc-900 rounded-lg font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  Create Proposal
                </button>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {['all', 'GENERIC', 'FINANCIAL', 'PROTOCOL CHANGE', 'SECURITY ACTION'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-all ${
                    filterType === type ? 'bg-cyan-400 text-zinc-900' : 'bg-zinc-900 text-zinc-400 hover:text-cyan-400'
                  }`}
                >
                  {type === 'all' ? 'All' : type}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {filteredProposals.length === 0 ? (
              <div className="text-center py-12 text-zinc-400">
                {proposalsLoading ? 'Loading proposals…' : 'No active proposals found.'}
              </div>
            ) : usePerformanceMode ? (
              <>
                <div className="rounded-lg border border-cyan-400/30 bg-cyan-400/5 px-3 py-2 text-sm text-cyan-100">
                  Performance mode active — large proposal sets are windowed for smoother scrolling.
                </div>
                <VirtualizedList
                  items={filteredProposals}
                  itemHeight={360}
                  containerHeight={Math.min(filteredProposals.length * 360, 840)}
                  className="pr-2"
                  keyExtractor={(prop) => String(prop.id)}
                  renderItem={(prop) => (
                    <div className="h-full pb-4">
                      <ProposalCard
                        proposal={prop}
                        viewer={{ ...viewer, hasVoted: prop.voted }}
                        isPending={dao.isWritePending}
                        onVote={handleVote}
                        onFinalize={handleFinalize}
                        onExecute={handleExecute}
                        onExpire={handleExpire}
                        onWithdraw={handleWithdraw}
                        onViewDetails={(p) => setSelectedProposal(p)}
                      />
                    </div>
                  )}
                />
              </>
            ) : (
              filteredProposals.map((prop) => (
                <ProposalCard
                  key={prop.id}
                  proposal={prop}
                  viewer={{ ...viewer, hasVoted: prop.voted }}
                  isPending={dao.isWritePending}
                  onVote={handleVote}
                  onFinalize={handleFinalize}
                  onExecute={handleExecute}
                  onExpire={handleExpire}
                  onWithdraw={handleWithdraw}
                  onViewDetails={(p) => setSelectedProposal(p)}
                />
              ))
            )}
          </div>

          {shouldVirtualize ? (
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAllProposals((prev) => !prev)}
                className="text-sm text-cyan-400 hover:underline"
              >
                {usePerformanceMode ? 'Show full proposal list' : 'Use performance mode'}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {selectedProposal ? (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedProposal(null)}>
          <div
            className="bg-zinc-800 border border-zinc-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-zinc-700 flex items-center justify-between">
              <div>
                <div className="inline-block px-3 py-1 bg-cyan-400/20 border border-cyan-400 rounded text-cyan-400 text-sm font-bold mb-2">
                  {selectedProposal.type}
                </div>
                <h2 className="text-2xl font-bold text-zinc-100">
                  #{selectedProposal.id}: {selectedProposal.title}
                </h2>
              </div>
              <button onClick={() => setSelectedProposal(null)} className="text-zinc-400 hover:text-cyan-400 text-2xl">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <div className="text-zinc-400 text-sm mb-1">Proposed by</div>
                <div className="text-zinc-100 font-mono">{selectedProposal.author}</div>
              </div>

              <div>
                <div className="text-zinc-400 text-sm mb-1">Time Remaining</div>
                <ProposalCountdown endTime={selectedProposal.endTime} />
              </div>

              <div>
                <div className="text-zinc-400 text-sm mb-2">Description</div>
                <div className="text-zinc-100 bg-zinc-900 p-4 rounded-lg whitespace-pre-wrap">{selectedProposal.description}</div>
              </div>

              <div>
                <div className="text-zinc-400 text-sm mb-2">Voting Results</div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-emerald-500">
                      FOR: <Numeric value={selectedProposal.forVotes} format="integer" weight={600} className="text-emerald-500" /> votes
                    </span>
                    <span className="text-red-600">
                      AGAINST: <Numeric value={selectedProposal.againstVotes} format="integer" weight={600} className="text-red-600" /> votes
                    </span>
                  </div>
                  <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${(selectedProposal.forVotes / Math.max(selectedProposal.forVotes + selectedProposal.againstVotes, 1)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Modal vote buttons — only when proposal is Active and viewer can vote */}
              {selectedProposal.status === ProposalStatus.Active && (
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      handleVote(BigInt(selectedProposal.id), true);
                      setSelectedProposal(null);
                    }}
                    disabled={selectedProposal.voted || !dao.isEligible || dao.isWritePending}
                    title={selectedProposal.voted ? 'You already voted' : !dao.isEligible ? 'Not eligible to vote' : undefined}
                    className="flex-1 px-6 py-3 bg-emerald-500 text-zinc-900 rounded-lg font-bold hover:bg-emerald-500/90 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Vote FOR
                  </button>
                  <button
                    onClick={() => {
                      handleVote(BigInt(selectedProposal.id), false);
                      setSelectedProposal(null);
                    }}
                    disabled={selectedProposal.voted || !dao.isEligible || dao.isWritePending}
                    title={selectedProposal.voted ? 'You already voted' : !dao.isEligible ? 'Not eligible to vote' : undefined}
                    className="flex-1 px-6 py-3 bg-red-600 text-zinc-100 rounded-lg font-bold hover:bg-red-600/90 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Vote AGAINST
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ProposalCountdown({ endTime }: { endTime: number }) {
  const timeLeft = useCountdown(endTime);
  return <div className="text-cyan-400 font-bold text-lg">{timeLeft}</div>;
}
