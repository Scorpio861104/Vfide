'use client';

import { useCountdown } from './useCountdown';
import type { Proposal } from './types';

interface ProposalDetailModalProps {
  proposal: Proposal;
  onClose: () => void;
}

export function ProposalDetailModal({ proposal, onClose }: ProposalDetailModalProps) {
  const total = Math.max(proposal.forVotes + proposal.againstVotes, 1);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-zinc-700 flex items-center justify-between">
          <div>
            <div className="inline-block px-3 py-1 bg-cyan-400/20 border border-cyan-400 rounded text-cyan-400 text-sm font-bold mb-2">{proposal.type}</div>
            <h2 className="text-2xl font-bold text-zinc-100">#{proposal.id}: {proposal.title}</h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-cyan-400 text-2xl">✕</button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <div className="text-zinc-400 text-sm mb-1">Proposed by</div>
            <div className="text-zinc-100 font-mono">{proposal.author}</div>
          </div>

          <div>
            <div className="text-zinc-400 text-sm mb-1">Time Remaining</div>
            <ProposalCountdown endTime={proposal.endTime} />
          </div>

          <div>
            <div className="text-zinc-400 text-sm mb-2">Description</div>
            <div className="text-zinc-100 bg-zinc-900 p-4 rounded-lg">{proposal.description}</div>
          </div>

          <div>
            <div className="text-zinc-400 text-sm mb-2">Voting Results</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-emerald-500">FOR: {proposal.forVotes.toLocaleString()} votes</span>
                <span className="text-red-600">AGAINST: {proposal.againstVotes.toLocaleString()} votes</span>
              </div>
              <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${(proposal.forVotes / total) * 100}%` }} />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button className="flex-1 px-6 py-3 bg-emerald-500 text-zinc-900 rounded-lg font-bold hover:bg-emerald-500/90">Vote FOR</button>
            <button className="flex-1 px-6 py-3 bg-red-600 text-zinc-100 rounded-lg font-bold hover:bg-red-600/90">Vote AGAINST</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProposalCountdown({ endTime }: { endTime: number }) {
  const timeLeft = useCountdown(endTime);
  return <div className="text-cyan-400 font-bold text-lg">{timeLeft}</div>;
}
