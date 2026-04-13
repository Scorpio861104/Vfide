'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { AlertTriangle, Loader2, Send } from 'lucide-react';

interface Lane {
  id: string | number;
  borrower_address: string;
  lender_address: string;
  principal: number;
  duration_days: number;
  stage: string;
  created_at: string;
}

const DISPUTE_STAGES = new Set(['defaulted', 'disputed', 'overdue']);

export function DisputesTab() {
  const { address } = useAccount();
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [loading, setLoading] = useState(false);
  const [disputingId, setDisputingId] = useState<string | number | null>(null);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    fetch('/api/flashloans/lanes?limit=100')
      .then((r) => r.json())
      .then((data) => setLanes((data.lanes ?? []).filter((l: Lane) => DISPUTE_STAGES.has(l.stage))))
      .finally(() => setLoading(false));
  }, [address]);

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertTriangle size={40} className="text-gray-600 mb-4" />
        <p className="text-gray-400">Connect your wallet to view disputed escrows.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={16} className="text-yellow-400" />
          <h3 className="text-white font-semibold text-sm">Disputed / Defaulted</h3>
          <span className="ml-auto text-xs text-gray-500">{lanes.length} total</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="text-cyan-400 animate-spin" />
          </div>
        ) : lanes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <AlertTriangle size={32} className="text-gray-600 mb-3" />
            <p className="text-gray-400 text-sm">No disputes.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lanes.map((l) => {
              const isBorrower = l.borrower_address.toLowerCase() === address?.toLowerCase();
              return (
                <div key={l.id} className="p-4 bg-white/3 rounded-xl border border-red-500/10">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-xs text-gray-500">{isBorrower ? 'As borrower' : 'As lender'}</p>
                      <p className="text-sm text-white font-semibold">{l.principal.toFixed(2)} VFIDE</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-xs border border-red-500/20 capitalize">{l.stage}</span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-xs text-gray-600">{new Date(l.created_at).toLocaleDateString()}</p>
                    <button
                      onClick={() => setDisputingId(l.id)}
                      className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      <Send size={10} /> Submit Appeal
                    </button>
                  </div>
                  {disputingId === l.id && (
                    <p className="mt-2 text-xs text-gray-400">Use the Appeals section to formally escalate this dispute to the SEER committee.</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
