'use client';

import { useSeerAggregatedAnalytics, useSeerSystemStats } from '@/hooks/useSeerInsights';

export function InsightsTab() {
  const { stats } = useSeerSystemStats();
  const { analytics } = useSeerAggregatedAnalytics();

  const summaryCards = [
    { label: 'Recent Score Updates', value: stats?.recentScoreUpdates ?? 0 },
    { label: 'Unique Subjects', value: stats?.uniqueSubjects ?? 0 },
    { label: 'Pending Appeals', value: stats?.pendingAppeals ?? 0 },
    { label: 'Window (hours)', value: analytics?.windowHours ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-2">Seer Insights Snapshot</h3>
        <p className="text-gray-400">Review recent scoring, appeal, and system health trends from the analytics window.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-sm text-gray-400">{card.label}</div>
            <div className="text-2xl font-bold text-white mt-1">{card.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
