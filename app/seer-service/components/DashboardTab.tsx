'use client';

import { useState, useEffect } from 'react';
import { Loader2, Eye } from 'lucide-react';

type Analytics = {
  total_events: number;
  allowed_events: number;
  warned_events: number;
  delayed_events: number;
  blocked_events: number;
  score_set_events: number;
  appeals_opened: number;
  appeals_resolved: number;
};

export function DashboardTab() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [window, setWindow] = useState(24);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/seer/analytics?windowHours=${window}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setError('Failed to load SEER analytics'))
      .finally(() => setLoading(false));
  }, [window]);

  const stats = data
    ? [
        { label: 'Total Events', value: data.total_events, color: 'text-cyan-400' },
        { label: 'Allowed', value: data.allowed_events, color: 'text-green-400' },
        { label: 'Warned', value: data.warned_events, color: 'text-yellow-400' },
        { label: 'Delayed', value: data.delayed_events, color: 'text-orange-400' },
        { label: 'Blocked', value: data.blocked_events, color: 'text-red-400' },
        { label: 'Score Set', value: data.score_set_events, color: 'text-purple-400' },
        { label: 'Appeals Opened', value: data.appeals_opened, color: 'text-blue-400' },
        { label: 'Appeals Resolved', value: data.appeals_resolved, color: 'text-indigo-400' },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">SEER Dashboard</h3>
        <select
          value={window}
          onChange={(e) => setWindow(Number(e.target.value))}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-gray-300 text-xs focus:outline-none"
        >
          <option value={1}>Last 1 hour</option>
          <option value={24}>Last 24 hours</option>
          <option value={168}>Last 7 days</option>
          <option value={720}>Last 30 days</option>
        </select>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="text-cyan-400 animate-spin" />
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center py-12">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-white/3 border border-white/10 rounded-xl p-4">
              <p className="text-gray-400 text-xs mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value.toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && !data && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Eye size={40} className="text-gray-600 mb-4" />
          <p className="text-gray-400">No analytics data available.</p>
        </div>
      )}
    </div>
  );
}
