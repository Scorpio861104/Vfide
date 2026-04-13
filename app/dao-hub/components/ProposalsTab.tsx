'use client';

import { useState, useEffect } from 'react';
import { Loader2, Vote } from 'lucide-react';

type Proposal = {
  id: number;
  title: string;
  description: string;
  status: string;
  votes_for: number;
  votes_against: number;
  created_at: string;
  voting_ends_at: string | null;
  proposer_address: string;
  proposer_username?: string;
};

const STATUS_COLORS: Record<string, string> = {
  active: 'text-green-400 bg-green-400/10 border-green-400/20',
  passed: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  failed: 'text-red-400 bg-red-400/10 border-red-400/20',
  pending: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
};

export function ProposalsTab() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/proposals?limit=50')
      .then((r) => r.json())
      .then((data) => setProposals(data.proposals ?? []))
      .catch(() => setError('Failed to load proposals'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Vote size={40} className="text-gray-600 mb-4" />
        <p className="text-gray-400">No proposals yet.</p>
        <p className="text-gray-500 text-sm mt-1">Be the first to submit a governance proposal.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {proposals.map((p) => {
        const total = p.votes_for + p.votes_against;
        const forPct = total > 0 ? Math.round((p.votes_for / total) * 100) : 0;
        const statusClass = STATUS_COLORS[p.status] ?? STATUS_COLORS.pending;
        return (
          <div key={p.id} className="bg-white/3 border border-white/10 rounded-xl p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm">{p.title}</p>
                <p className="text-gray-400 text-xs mt-1 line-clamp-2">{p.description}</p>
              </div>
              <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${statusClass} capitalize`}>
                {p.status}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <div className="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-cyan-400 rounded-full transition-all"
                  style={{ width: `${forPct}%` }}
                />
              </div>
              <p className="text-gray-400 text-xs whitespace-nowrap">
                {p.votes_for.toLocaleString()} for &bull; {p.votes_against.toLocaleString()} against
              </p>
            </div>
            {p.voting_ends_at && (
              <p className="text-gray-600 text-xs mt-2">
                Ends {new Date(p.voting_ends_at).toLocaleDateString()}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
