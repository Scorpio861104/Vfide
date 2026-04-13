'use client';

import { useState, useEffect } from 'react';
import { Loader2, LayoutDashboard } from 'lucide-react';

type Proposal = {
  id: number;
  status: string;
  votes_for: number;
  votes_against: number;
};

export function OverviewTab() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/proposals?limit=100')
      .then((r) => r.json())
      .then((data) => setProposals(data.proposals ?? []))
      .catch(() => setError('Failed to load overview'))
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

  const total = proposals.length;
  const active = proposals.filter((p) => p.status === 'active').length;
  const passed = proposals.filter((p) => p.status === 'passed').length;
  const failed = proposals.filter((p) => p.status === 'failed').length;
  const totalVotesFor = proposals.reduce((s, p) => s + (p.votes_for ?? 0), 0);
  const totalVotesAgainst = proposals.reduce((s, p) => s + (p.votes_against ?? 0), 0);

  const stats = [
    { label: 'Total Proposals', value: total, color: 'text-cyan-400' },
    { label: 'Active', value: active, color: 'text-green-400' },
    { label: 'Passed', value: passed, color: 'text-blue-400' },
    { label: 'Failed', value: failed, color: 'text-red-400' },
    { label: 'Total Votes For', value: totalVotesFor.toLocaleString(), color: 'text-purple-400' },
    { label: 'Total Votes Against', value: totalVotesAgainst.toLocaleString(), color: 'text-orange-400' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white/3 border border-white/10 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>
      {total === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <LayoutDashboard size={32} className="text-gray-600 mb-3" />
          <p className="text-gray-400 text-sm">No governance activity yet.</p>
        </div>
      )}
    </div>
  );
}
