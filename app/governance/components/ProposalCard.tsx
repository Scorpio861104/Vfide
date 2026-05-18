'use client';

import { Sparkles, Loader2, CheckCircle2, XCircle, AlertTriangle, Clock, Scale, ArrowRight } from 'lucide-react';
import { GOVERNANCE_QUORUM_VOTES } from '@/lib/constants';
import { Numeric } from '@/components/ui/Numeric';
import type { Proposal } from './types';
import { ProposalStatus, proposalStatusLabel } from '@/hooks/useDAO';

interface ProposalCardProps {
  proposal: Proposal;
  /** Caller's relationship to this proposal. Drives action button availability. */
  viewer?: {
    /** Caller's full address — used to determine "I am the proposer" for withdraw. */
    address?: `0x${string}`;
    /** Whether the caller is eligible to vote on this proposal. */
    isEligible?: boolean;
    /** Whether the caller has already voted on this proposal. */
    hasVoted?: boolean;
  };
  /** Whether a write is currently pending. Disables action buttons. */
  isPending?: boolean;
  onVote?: (proposalId: bigint, support: boolean) => void;
  onFinalize?: (proposalId: bigint) => void;
  onExecute?: (proposalId: bigint) => void;
  onExpire?: (proposalId: bigint) => void;
  onWithdraw?: (proposalId: bigint) => void;
  onViewDetails: (proposal: Proposal) => void;
}

function statusBadge(status?: ProposalStatus): { bg: string; text: string; Icon: typeof Clock } {
  switch (status) {
    case ProposalStatus.Active:
      return { bg: 'bg-cyan-500/10 border-cyan-500/30', text: 'text-cyan-300', Icon: Sparkles };
    case ProposalStatus.Ended:
      return { bg: 'bg-zinc-500/10 border-zinc-500/30', text: 'text-zinc-300', Icon: Clock };
    case ProposalStatus.Succeeded:
      return { bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-300', Icon: CheckCircle2 };
    case ProposalStatus.Defeated:
      return { bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-300', Icon: XCircle };
    case ProposalStatus.Queued:
      return { bg: 'bg-purple-500/10 border-purple-500/30', text: 'text-purple-300', Icon: ArrowRight };
    case ProposalStatus.Executed:
      return { bg: 'bg-emerald-600/10 border-emerald-600/30', text: 'text-emerald-200', Icon: CheckCircle2 };
    case ProposalStatus.Expired:
      return { bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-300', Icon: AlertTriangle };
    default:
      return { bg: 'bg-zinc-500/10 border-zinc-500/30', text: 'text-zinc-400', Icon: Scale };
  }
}

export function ProposalCard({
  proposal: prop,
  viewer,
  isPending = false,
  onVote,
  onFinalize,
  onExecute,
  onExpire,
  onWithdraw,
  onViewDetails,
}: ProposalCardProps) {
  const total = prop.forVotes + prop.againstVotes;
  const forPercent = total > 0 ? Math.round((prop.forVotes / total) * 100) : 0;
  const quorumReached = total >= GOVERNANCE_QUORUM_VOTES;
  const status = prop.status;
  const badge = statusBadge(status);
  const StatusIcon = badge.Icon;

  // Action availability — mirrors contract state machine
  const isActive = status === ProposalStatus.Active;
  const isSucceeded = status === ProposalStatus.Succeeded;
  const isQueued = status === ProposalStatus.Queued;
  // Withdraw is only valid before voting opens (contract: block.timestamp < p.start).
  // If startTime is missing we conservatively disallow.
  const isPendingStart =
    prop.startTime !== undefined && Date.now() < prop.startTime && !isQueued && status !== ProposalStatus.Executed;
  const isProposer =
    !!viewer?.address &&
    !!prop.proposerAddress &&
    viewer.address.toLowerCase() === prop.proposerAddress.toLowerCase();

  const canVote = isActive && !viewer?.hasVoted && (viewer?.isEligible ?? true) && !!onVote;
  const canFinalize = isActive && Date.now() > prop.endTime && !!onFinalize;
  const canExecute = isQueued && !!onExecute;
  const canExpire = isQueued && !!onExpire;
  const canWithdraw = isPendingStart && isProposer && !!onWithdraw;

  const voteButtonReason = (): string | null => {
    if (!isActive) return null;
    if (viewer?.hasVoted) return 'You already voted on this proposal';
    if (viewer?.isEligible === false) return 'You are not eligible to vote';
    return null;
  };
  const disabledReason = voteButtonReason();

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 hover:border-cyan-400 transition-colors">
      <div className="flex items-start justify-between mb-4 gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <div className="inline-block px-3 py-1 bg-cyan-400/20 border border-cyan-400 rounded text-cyan-400 text-sm font-bold">
              {prop.type}
            </div>
            {status !== undefined && (
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${badge.bg} ${badge.text}`}>
                <StatusIcon size={10} />
                {proposalStatusLabel(status)}
              </div>
            )}
            {viewer?.hasVoted && isActive && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border bg-cyan-500/10 border-cyan-500/30 text-cyan-200">
                <CheckCircle2 size={10} /> You voted
              </div>
            )}
          </div>
          <h3 className="text-xl font-bold text-zinc-100 mb-2">{prop.title}</h3>
          <p className="text-zinc-400 text-sm">Proposed by {prop.author} • Ends in {prop.timeLeft}</p>
        </div>
        <div className="text-right text-zinc-100 text-2xl font-bold shrink-0">
          #<Numeric value={prop.id} format="integer" size="2xl" weight={700} className="text-zinc-100" />
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-emerald-500">
            FOR: <Numeric value={prop.forVotes} format="integer" size="sm" weight={600} className="text-emerald-500" /> votes
            {' '}(<Numeric value={forPercent} format="integer" size="sm" weight={500} className="text-emerald-500" />%)
          </span>
          <span className="text-red-600">
            AGAINST: <Numeric value={prop.againstVotes} format="integer" size="sm" weight={600} className="text-red-600" /> votes
            {' '}(<Numeric value={100 - forPercent} format="integer" size="sm" weight={500} className="text-red-600" />%)
          </span>
        </div>
        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500" style={{ width: `${forPercent}%` }} />
        </div>

        <div className="mt-3 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-400">Quorum Progress</span>
            <span className={quorumReached ? 'text-emerald-500' : 'text-amber-400'}>
              <Numeric value={total} format="integer" size="xs" weight={500} className={quorumReached ? 'text-emerald-500' : 'text-amber-400'} />
              {' / '}
              <Numeric value={GOVERNANCE_QUORUM_VOTES} format="integer" size="xs" weight={500} className={quorumReached ? 'text-emerald-500' : 'text-amber-400'} />
              {' '}
              {quorumReached ? '✓' : <>(<Numeric value={Math.round((total / GOVERNANCE_QUORUM_VOTES) * 100)} format="integer" size="xs" weight={500} className="text-amber-400" />%)</>}
            </span>
          </div>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className={`h-full transition-all ${quorumReached ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-400 to-orange-500'}`}
              style={{ width: `${Math.min(100, (total / GOVERNANCE_QUORUM_VOTES) * 100)}%` }} />
          </div>
          {quorumReached && (
            <div className="text-xs text-emerald-500 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Quorum reached!</div>
          )}
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        {/* Vote buttons — only when proposal is Active */}
        {isActive && (
          <>
            <button
              onClick={() => canVote && onVote!(BigInt(prop.id), true)}
              disabled={!canVote || isPending}
              title={disabledReason ?? undefined}
              className="flex-1 min-w-[120px] px-4 py-2 bg-emerald-500 text-zinc-900 rounded-lg font-bold hover:bg-emerald-500/90 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-500 inline-flex items-center justify-center gap-1.5"
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
              Vote FOR
            </button>
            <button
              onClick={() => canVote && onVote!(BigInt(prop.id), false)}
              disabled={!canVote || isPending}
              title={disabledReason ?? undefined}
              className="flex-1 min-w-[120px] px-4 py-2 bg-red-600 text-zinc-100 rounded-lg font-bold hover:bg-red-600/90 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-600 inline-flex items-center justify-center gap-1.5"
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
              Vote AGAINST
            </button>
          </>
        )}

        {canFinalize && (
          <button
            onClick={() => onFinalize!(BigInt(prop.id))}
            disabled={isPending}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg font-bold hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Scale size={14} />}
            Finalize
          </button>
        )}

        {canExecute && (
          <button
            onClick={() => onExecute!(BigInt(prop.id))}
            disabled={isPending}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
            Execute
          </button>
        )}

        {canExpire && (
          <button
            onClick={() => onExpire!(BigInt(prop.id))}
            disabled={isPending}
            className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Clock size={14} />}
            Expire
          </button>
        )}

        {canWithdraw && (
          <button
            onClick={() => onWithdraw!(BigInt(prop.id))}
            disabled={isPending}
            className="px-4 py-2 bg-zinc-700 text-zinc-200 rounded-lg font-bold hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
            Withdraw
          </button>
        )}

        {isSucceeded && (
          <div className="px-3 py-2 bg-emerald-500/5 border border-emerald-500/20 text-emerald-300 text-xs rounded-lg inline-flex items-center gap-1.5">
            <CheckCircle2 size={12} />
            <span>Awaiting timelock queue</span>
          </div>
        )}

        <button
          onClick={() => onViewDetails(prop)}
          className="px-4 py-2 bg-zinc-900 border border-zinc-700 text-zinc-400 rounded-lg hover:text-cyan-400 hover:border-cyan-400 transition-colors"
        >
          View Details
        </button>
      </div>

      {disabledReason && isActive && (
        <p className="text-xs text-zinc-500 mt-2">{disabledReason}.</p>
      )}
    </div>
  );
}
