'use client';

import { Sparkles } from 'lucide-react';
import { GOVERNANCE_QUORUM_VOTES } from '@/lib/constants';
import type { Proposal } from './types';

interface ProposalCardProps {
  proposal: Proposal;
  onVote?: (proposalId: bigint, support: boolean) => void;
  onFinalize?: (proposalId: bigint) => void;
  onViewDetails: (proposal: Proposal) => void;
}

export function ProposalCard({ proposal: prop, onVote, onFinalize, onViewDetails }: ProposalCardProps) {
  const total = prop.forVotes + prop.againstVotes;
  const forPercent = total > 0 ? Math.round((prop.forVotes / total) * 100) : 0;

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 hover:border-cyan-400 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="inline-block px-3 py-1 bg-cyan-400/20 border border-cyan-400 rounded text-cyan-400 text-sm font-bold mb-2">{prop.type}</div>
          <h3 className="text-xl font-bold text-zinc-100 mb-2">{prop.title}</h3>
          <p className="text-zinc-400 text-sm">Proposed by {prop.author} • Ends in {prop.timeLeft}</p>
        </div>
        <div className="text-right"><div className="text-2xl font-bold text-zinc-100">#{prop.id}</div></div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-emerald-500">FOR: {prop.forVotes.toLocaleString()} votes ({forPercent}%)</span>
          <span className="text-red-600">AGAINST: {prop.againstVotes.toLocaleString()} votes ({100 - forPercent}%)</span>
        </div>
        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500" style={{ width: `${forPercent}%` }} />
        </div>

        <div className="mt-3 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-400">Quorum Progress</span>
            <span className={total >= GOVERNANCE_QUORUM_VOTES ? 'text-emerald-500' : 'text-amber-400'}>
              {total.toLocaleString()} / {GOVERNANCE_QUORUM_VOTES.toLocaleString()}{' '}
              {total >= GOVERNANCE_QUORUM_VOTES ? '✓' : `(${Math.round((total / GOVERNANCE_QUORUM_VOTES) * 100)}%)`}
            </span>
          </div>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className={`h-full transition-all ${total >= GOVERNANCE_QUORUM_VOTES ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-400 to-orange-500'}`}
              style={{ width: `${Math.min(100, (total / GOVERNANCE_QUORUM_VOTES) * 100)}%` }} />
          </div>
          {total >= GOVERNANCE_QUORUM_VOTES && (
            <div className="text-xs text-emerald-500 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Quorum reached!</div>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={() => onVote?.(BigInt(prop.id), true)} className="flex-1 px-4 py-2 bg-emerald-500 text-zinc-900 rounded-lg font-bold hover:bg-emerald-500/90">Vote FOR</button>
        <button onClick={() => onVote?.(BigInt(prop.id), false)} className="flex-1 px-4 py-2 bg-red-600 text-zinc-100 rounded-lg font-bold hover:bg-red-600/90">Vote AGAINST</button>
        {onFinalize && Date.now() > prop.endTime && (
          <button onClick={() => onFinalize(BigInt(prop.id))} className="px-4 py-2 bg-purple-500 text-white rounded-lg font-bold hover:bg-purple-600">Finalize</button>
        )}
        <button onClick={() => onViewDetails(prop)} className="px-4 py-2 bg-zinc-900 border border-zinc-700 text-zinc-400 rounded-lg hover:text-cyan-400 hover:border-cyan-400">View Details</button>
      </div>
    </div>
  );
}
