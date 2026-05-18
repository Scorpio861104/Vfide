'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { CheckCircle2, Loader2, CheckCheck } from 'lucide-react';

interface SeerAnalytics {
  total_events: number;
  appeals_opened: number;
  appeals_resolved: number;
  score_set_events: number;
}

interface Ticket {
  id: string;
  subject: string;
  category: string;
  status: 'open' | 'resolved';
  createdAt: string;
}

export function ResolvedTab() {
  const { address } = useAccount();
  const [analytics, setAnalytics] = useState<SeerAnalytics | null>(null);
  const [resolved, setResolved] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const analyticsP = fetch('/api/seer/analytics?windowHours=720').then((r) => r.json()).catch(() => null);
    const ticketsP = address
      ? fetch(`/api/support/tickets?address=${address}`).then((r) => r.json()).catch(() => ({ tickets: [] }))
      : Promise.resolve({ tickets: [] });
    Promise.all([analyticsP, ticketsP])
      .then(([a, t]) => {
        setAnalytics(a);
        const all: Ticket[] = t.tickets ?? [];
        setResolved(all.filter((tk) => tk.status === 'resolved'));
      })
      .finally(() => setLoading(false));
  }, [address]);

  return (
    <div className="space-y-6">
      {analytics && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/3 border border-white/10 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Network Resolved</p>
            <p className="text-2xl font-bold text-green-400">{analytics.appeals_resolved}</p>
          </div>
          <div className="bg-white/3 border border-white/10 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Score Updates</p>
            <p className="text-2xl font-bold text-white">{analytics.score_set_events}</p>
          </div>
        </div>
      )}

      <div className="bg-white/3 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 size={16} className="text-green-400" />
          <h3 className="text-white font-semibold text-sm">My Resolved Appeals</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="text-cyan-400 animate-spin" />
          </div>
        ) : resolved.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <CheckCheck size={32} className="text-gray-600 mb-3" />
            <p className="text-gray-400 text-sm">No resolved appeals yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {resolved.map((t) => (
              <div key={t.id} className="p-3 bg-white/3 rounded-lg">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm text-white font-medium">{t.subject}</p>
                    <p className="text-xs text-gray-500 mt-0.5 capitalize">{t.category?.replace(/-/g, ' ')}</p>
                  </div>
                  <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-xs border border-green-500/20">
                    <CheckCircle2 size={10} /> Resolved
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-2">{new Date(t.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
