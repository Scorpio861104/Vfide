'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { History, Loader2, ArrowDownLeft, ArrowUpRight, ExternalLink } from 'lucide-react';

interface Activity {
  id: number;
  type: string;
  description: string;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  purchase: 'Purchase',
  swap: 'Swap',
  transfer: 'Transfer',
  receive: 'Receive',
};

export function HistoryTab() {
  const { address } = useAccount();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    fetch(`/api/activities?userAddress=${address}&limit=50`)
      .then((r) => r.json())
      .then((d) => setActivities(d.activities ?? []))
      .finally(() => setLoading(false));
  }, [address]);

  const txActivities = activities.filter((a) =>
    ['purchase', 'swap', 'transfer', 'receive', 'buy', 'sell'].includes(a.type.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm">Purchase &amp; Swap History</h3>
        <span className="text-xs text-gray-500">{txActivities.length} transactions</span>
      </div>

      {!address ? (
        <div className="bg-white/3 border border-white/10 rounded-2xl p-8 text-center">
          <History size={28} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Connect your wallet to view history.</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={20} className="text-cyan-400 animate-spin" />
        </div>
      ) : txActivities.length === 0 ? (
        <div className="bg-white/3 border border-white/10 rounded-2xl p-8 text-center">
          <History size={28} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No purchase or swap history yet.</p>
        </div>
      ) : (
        <div className="bg-white/3 border border-white/10 rounded-2xl divide-y divide-white/5">
          {txActivities.map((a) => {
            const isIn = ['purchase', 'receive', 'buy'].includes(a.type.toLowerCase());
            return (
              <div key={a.id} className="flex items-center gap-3 p-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isIn ? 'bg-green-500/10' : 'bg-red-500/10'
                }`}>
                  {isIn
                    ? <ArrowDownLeft size={14} className="text-green-400" />
                    : <ArrowUpRight size={14} className="text-red-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">
                    {TYPE_LABELS[a.type.toLowerCase()] ?? a.type}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{a.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    {new Date(a.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
