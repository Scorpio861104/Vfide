'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Clock, Loader2, AlertTriangle, FileSearch } from 'lucide-react';

interface SeerAnalytics {
  total_events: number;
  appeals_opened: number;
  appeals_resolved: number;
  warned_events: number;
  blocked_events: number;
}

interface Ticket {
  id: string;
  subject: string;
  category: string;
  status: 'open' | 'resolved';
  createdAt: string;
  messages: { id: string; sender: string; content: string; timestamp: string }[];
}

export function ActiveTab() {
  const { address } = useAccount();
  const [analytics, setAnalytics] = useState<SeerAnalytics | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
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
        setTickets(all.filter((tk) => tk.status === 'open'));
      })
      .finally(() => setLoading(false));
  }, [address]);

  return (
    <div className="space-y-6">
      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-white/3 border border-white/10 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Appeals Opened</p>
            <p className="text-2xl font-bold text-yellow-400">{analytics.appeals_opened}</p>
          </div>
          <div className="bg-white/3 border border-white/10 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Under Review</p>
            <p className="text-2xl font-bold text-white">{analytics.appeals_opened - analytics.appeals_resolved}</p>
          </div>
          <div className="bg-white/3 border border-white/10 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Flagged Events</p>
            <p className="text-2xl font-bold text-red-400">{analytics.warned_events + analytics.blocked_events}</p>
          </div>
        </div>
      )}

      <div className="bg-white/3 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={16} className="text-yellow-400" />
          <h3 className="text-white font-semibold text-sm">My Open Appeals</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="text-cyan-400 animate-spin" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <FileSearch size={32} className="text-gray-600 mb-3" />
            <p className="text-gray-400 text-sm">No open appeals.</p>
            <p className="text-gray-500 text-xs mt-1">Use the Submit tab to raise a new appeal.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => (
              <div key={t.id} className="p-3 bg-white/3 rounded-lg">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm text-white font-medium">{t.subject}</p>
                    <p className="text-xs text-gray-500 mt-0.5 capitalize">{t.category?.replace(/-/g, ' ')}</p>
                  </div>
                  <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 text-xs border border-yellow-500/20">
                    <AlertTriangle size={10} /> Open
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
