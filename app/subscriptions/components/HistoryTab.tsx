'use client';

import { useState, useEffect } from 'react';
import { Loader2, RefreshCw, Clock } from 'lucide-react';
import { useAccount } from 'wagmi';

type Subscription = {
  id: string;
  recipient: string;
  label: string;
  amount: string;
  interval: string;
  status: string;
  nextPayment: string | null;
  createdAt: string;
};

const STATUS_CLASSES: Record<string, string> = {
  active: 'text-green-400 bg-green-400/10 border-green-400/20',
  paused: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  cancelled: 'text-red-400 bg-red-400/10 border-red-400/20',
};

export function HistoryTab() {
  const { address } = useAccount();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    setError(null);
    fetch(`/api/subscriptions?address=${address}`)
      .then((r) => r.json())
      .then((data) => setSubs(data.subscriptions ?? []))
      .catch(() => setError('Failed to load subscription history'))
      .finally(() => setLoading(false));
  }, [address]);

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Clock size={40} className="text-gray-600 mb-4" />
        <p className="text-gray-400">Connect your wallet to view subscription history.</p>
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

  if (subs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Clock size={40} className="text-gray-600 mb-4" />
        <p className="text-gray-400">No subscription history yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {subs.map((sub) => {
        const statusClass = STATUS_CLASSES[sub.status] ?? STATUS_CLASSES.cancelled;
        return (
          <div key={sub.id} className="bg-white/3 border border-white/10 rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center flex-shrink-0">
              <RefreshCw size={18} className="text-gray-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white font-semibold text-sm">{sub.label}</p>
              <p className="text-gray-400 text-xs mt-0.5 font-mono truncate">{sub.recipient}</p>
              <p className="text-gray-500 text-xs">{new Date(sub.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-white font-bold text-sm">{sub.amount} VFIDE</p>
              <p className="text-gray-500 text-xs capitalize">{sub.interval}</p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${statusClass} capitalize`}>
                {sub.status}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
