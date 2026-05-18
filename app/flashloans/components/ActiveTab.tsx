'use client';

import { useState, useEffect } from 'react';
import { Loader2, Zap } from 'lucide-react';
import { useAccount } from 'wagmi';

type Lane = {
  id: number;
  borrower_address: string;
  lender_address: string;
  principal: string;
  duration_days: number;
  interest_bps: number;
  stage: string;
  created_at: string;
  due_day: number | null;
  sim_day: number;
};

const ACTIVE_STAGES = new Set(['proposed', 'funded', 'drawn', 'overdue']);

export function ActiveTab() {
  const { address } = useAccount();
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    setError(null);
    fetch('/api/flashloans/lanes')
      .then((r) => r.json())
      .then((data) => setLanes((data.lanes ?? []).filter((l: Lane) => ACTIVE_STAGES.has(l.stage))))
      .catch(() => setError('Failed to load active lanes'))
      .finally(() => setLoading(false));
  }, [address]);

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Zap size={40} className="text-gray-600 mb-4" />
        <p className="text-gray-400">Connect your wallet to view active flash loans.</p>
      </div>
    );
  }

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

  if (lanes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Zap size={40} className="text-gray-600 mb-4" />
        <p className="text-gray-400">No active flash loans.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {lanes.map((lane) => (
        <div key={lane.id} className="bg-white/3 border border-white/10 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Zap size={18} className="text-cyan-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white font-semibold text-sm">Lane #{lane.id}</p>
            <p className="text-gray-400 text-xs font-mono truncate">Lender: {lane.lender_address}</p>
            <p className="text-gray-500 text-xs">{lane.duration_days}d &bull; {lane.interest_bps / 100}% interest</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-white font-bold text-sm">{lane.principal} VFIDE</p>
            <p className="text-cyan-400 text-xs capitalize">{lane.stage}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
