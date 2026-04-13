'use client';

import { useState, useEffect } from 'react';
import { Loader2, RefreshCw, CalendarClock } from 'lucide-react';
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

export function ActiveTab() {
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
      .then((data) => setSubs((data.subscriptions ?? []).filter((s: Subscription) => s.status === 'active')))
      .catch(() => setError('Failed to load subscriptions'))
      .finally(() => setLoading(false));
  }, [address]);

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <RefreshCw size={40} className="text-gray-600 mb-4" />
        <p className="text-gray-400">Connect your wallet to view active subscriptions.</p>
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
        <CalendarClock size={40} className="text-gray-600 mb-4" />
        <p className="text-gray-400">No active subscriptions.</p>
        <p className="text-gray-500 text-sm mt-1">Create a subscription from the Create tab.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {subs.map((sub) => (
        <div key={sub.id} className="bg-white/3 border border-white/10 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <RefreshCw size={18} className="text-cyan-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white font-semibold text-sm">{sub.label}</p>
            <p className="text-gray-400 text-xs mt-0.5 font-mono truncate">{sub.recipient}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-white font-bold text-sm">{sub.amount} VFIDE</p>
            <p className="text-gray-500 text-xs capitalize">{sub.interval}</p>
            {sub.nextPayment && (
              <p className="text-gray-600 text-xs">Next: {new Date(sub.nextPayment).toLocaleDateString()}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
