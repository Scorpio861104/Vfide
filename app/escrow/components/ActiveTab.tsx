'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Lock, Loader2, Clock } from 'lucide-react';

interface Lane {
  id: string | number;
  borrower_address: string;
  lender_address: string;
  principal: number;
  duration_days: number;
  interest_bps: number;
  stage: string;
  created_at: string;
}

const ACTIVE_STAGES = new Set(['draft', 'offered', 'funded', 'active']);

export function ActiveTab() {
  const { address } = useAccount();
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    fetch('/api/flashloans/lanes?limit=100')
      .then((r) => r.json())
      .then((data) => setLanes((data.lanes ?? []).filter((l: Lane) => ACTIVE_STAGES.has(l.stage))))
      .finally(() => setLoading(false));
  }, [address]);

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Lock size={40} className="text-gray-600 mb-4" />
        <p className="text-gray-400">Connect your wallet to view active escrows.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lock size={16} className="text-cyan-400" />
          <h3 className="text-white font-semibold text-sm">Active Escrows</h3>
          <span className="ml-auto text-xs text-gray-500">{lanes.length} total</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="text-cyan-400 animate-spin" />
          </div>
        ) : lanes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Clock size={32} className="text-gray-600 mb-3" />
            <p className="text-gray-400 text-sm">No active escrows.</p>
            <p className="text-gray-500 text-xs mt-1">Create one using the Create tab.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lanes.map((l) => {
              const isBorrower = l.borrower_address.toLowerCase() === address?.toLowerCase();
              const interestPct = (l.interest_bps / 100).toFixed(2);
              return (
                <div key={l.id} className="p-4 bg-white/3 rounded-xl">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-xs text-gray-500">{isBorrower ? 'You are borrower' : 'You are lender'}</p>
                      <p className="text-sm text-white font-semibold">{l.principal.toFixed(2)} VFIDE</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-xs border border-blue-500/20 capitalize">{l.stage}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{l.duration_days}d duration</span>
                    <span>{interestPct}% interest</span>
                    <span>{new Date(l.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
