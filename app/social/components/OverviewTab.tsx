'use client';

import Link from 'next/link';

interface OverviewTabProps {
  timeRange?: 'Week' | 'Month' | 'Year';
}

export function OverviewTab({ timeRange = 'Week' }: OverviewTabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-400 mb-2">{timeRange} snapshot</p>
        <h2 className="text-2xl font-bold text-white mb-2">Key Metrics</h2>
        <p className="text-gray-400">This environment is currently showing a privacy-safe snapshot of social analytics.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="bg-white/3 border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-2">Influence Score</h2>
          <p className="text-gray-400">Influence scoring is derived from verified engagement, trust activity, and payments.</p>
        </section>

        <section className="bg-white/3 border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-2">Engagement Trends</h2>
          <p className="text-gray-400">Engagement trend visualizations update as community events continue syncing into the social graph.</p>
        </section>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="bg-white/3 border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-2">Community Health</h2>
          <p className="text-gray-400">Community health insights are currently based on the latest synced conversations and trust signals.</p>
        </section>

        <section className="bg-white/3 border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-2">Insights & Recommendations</h2>
          <p className="text-gray-400">Actionable recommendations surface here as new follows, payouts, and conversations are recorded.</p>
        </section>
      </div>

      <div>
        <Link href="/social-hub" className="inline-flex items-center rounded-xl border border-cyan-500/30 px-4 py-2 font-semibold text-cyan-400 hover:bg-cyan-500/10">
          Go to Social Hub
        </Link>
      </div>
    </div>
  );
}
