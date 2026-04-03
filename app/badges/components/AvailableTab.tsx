'use client';

import { getAllBadges } from '@/lib/badge-registry';

export function AvailableTab() {
  const upcomingBadges = getAllBadges().slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-2">Available Opportunities</h3>
        <p className="text-gray-400">Focus on the next badge milestones most likely to unlock with active use.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {upcomingBadges.map((badge) => (
          <div key={badge.name} className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <h4 className="text-lg font-semibold text-white">{badge.displayName}</h4>
            <p className="text-sm text-gray-400 mt-1">{badge.earnRequirement}</p>
            <div className="mt-3 text-sm text-cyan-300">Reward: {badge.points} points</div>
          </div>
        ))}
      </div>
    </div>
  );
}
