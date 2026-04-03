'use client';

interface EngagementTabProps {
  timeRange?: 'Week' | 'Month' | 'Year';
}

export function EngagementTab({ timeRange = 'Week' }: EngagementTabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-400 mb-2">{timeRange} engagement</p>
        <h2 className="text-xl font-bold text-white mb-4">Engagement Trends</h2>
        <p className="text-gray-400">Detailed post, message, and reaction analytics are not available right now.</p>
      </div>

      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Community Health</h2>
        <p className="text-gray-400">Sentiment and retention signals will populate here when telemetry is enabled.</p>
      </div>
    </div>
  );
}
