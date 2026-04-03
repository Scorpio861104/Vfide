'use client';

import { AchievementsList } from '@/components/gamification/GamificationWidgets';
import { ACHIEVEMENTS, useGamification } from '@/lib/gamification';

interface AchievementsTabProps {
  userAddress?: string;
}

export function AchievementsTab({ userAddress }: AchievementsTabProps) {
  const { progress } = useGamification(userAddress);
  const unlockedCount = progress?.achievements.length ?? 0;
  const totalCount = Object.keys(ACHIEVEMENTS).length;

  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-2">Unlocked Milestones</h3>
        <p className="text-gray-400">Review earned badges and the next reward targets across the VFIDE ecosystem.</p>
        <div className="mt-4 text-sm text-cyan-300 font-semibold">
          {unlockedCount} / {totalCount} unlocked
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-white">
        <AchievementsList userAddress={userAddress ?? ''} />
      </div>
    </div>
  );
}
