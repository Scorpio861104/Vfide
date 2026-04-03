'use client';

interface GrowthTabProps {
  timeRange?: 'Week' | 'Month' | 'Year';
}

export function GrowthTab({ timeRange = 'Week' }: GrowthTabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-400 mb-2">{timeRange} growth</p>
        <h2 className="text-xl font-bold text-white mb-4">Insights & Recommendations</h2>
        <p className="text-gray-400">Growth guidance is temporarily unavailable while background analytics backfills complete.</p>
      </div>
    </div>
  );
}
