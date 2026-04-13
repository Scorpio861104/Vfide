'use client';

import { useState, useEffect } from 'react';
import { Loader2, TrendingUp } from 'lucide-react';

type AnalyticsEvent = {
  id: number;
  event_type: string;
  created_at: string;
  metadata?: Record<string, unknown>;
};

export function InsightsTab() {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/analytics?limit=50')
      .then((r) => r.json())
      .then((data) => setEvents(data.events ?? data.data ?? []))
      .catch(() => setError('Failed to load insights'))
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

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <TrendingUp size={40} className="text-gray-600 mb-4" />
        <p className="text-gray-400">No insight events recorded yet.</p>
      </div>
    );
  }

  const byType = events.reduce<Record<string, number>>((acc, e) => {
    acc[e.event_type] = (acc[e.event_type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-white">ProofScore Insights</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {Object.entries(byType).map(([type, count]) => (
          <div key={type} className="bg-white/3 border border-white/10 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1 capitalize">{type.replace(/_/g, ' ')}</p>
            <p className="text-2xl font-bold text-cyan-400">{count}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {events.slice(0, 20).map((e) => (
          <div key={e.id} className="bg-white/3 border border-white/10 rounded-lg p-3 flex items-center gap-3">
            <p className="text-xs text-cyan-400 capitalize font-medium min-w-0 truncate flex-1">
              {e.event_type.replace(/_/g, ' ')}
            </p>
            <p className="text-gray-500 text-xs whitespace-nowrap flex-shrink-0">
              {new Date(e.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
