'use client';

import { UserStatsWidget } from '@/components/gamification/GamificationWidgets';
import { ACHIEVEMENTS, useGamification } from '@/lib/gamification';

interface StatsTabProps {
  userAddress?: string;
}

export function StatsTab({ userAddress }: StatsTabProps) {
  const { progress } = useGamification(userAddress);

  const categoryBreakdown = Object.values(ACHIEVEMENTS).reduce<Record<string, number>>((acc, achievement) => {
    const category = achievement.category || 'other';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/3 p-6">
          <h3 className="text-xl font-bold text-white mb-2">Your Progress</h3>
          <div className="text-3xl font-bold text-cyan-300">Level {progress?.level ?? 0}</div>
          <p className="text-sm text-gray-400 mt-2">XP: {progress?.xp ?? 0} · To next level: {progress?.xpToNextLevel ?? 0}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/3 p-6">
          <h3 className="text-xl font-bold text-white mb-2">Category Breakdown</h3>
          <div className="space-y-2 text-sm text-gray-300">
            {Object.entries(categoryBreakdown).map(([category, count]) => (
              <div key={category} className="flex items-center justify-between">
                <span className="capitalize">{category}</span>
                <span>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-white">
        <UserStatsWidget userAddress={userAddress ?? ''} />
      </div>
    </div>
  );
}
