'use client';

import { useState, useEffect as _useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Flame, TrendingUp as _TrendingUp, Calendar as _Calendar, Gift, Target, Award } from 'lucide-react';

interface Streak {
  type: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string;
  totalDays: number;
}

export default function StreakTracker() {
  const { address: _address } = useAccount();
  const [streak, _setStreak] = useState<Streak>({
    type: 'login',
    currentStreak: 5,
    longestStreak: 12,
    lastActivityDate: new Date().toISOString(),
    totalDays: 47,
  });

  const getNextMilestone = () => {
    const { currentStreak } = streak;
    if (currentStreak < 7) return 7;
    if (currentStreak < 14) return 14;
    if (currentStreak < 30) return 30;
    if (currentStreak < 60) return 60;
    if (currentStreak < 90) return 90;
    return 100;
  };

  const nextMilestone = getNextMilestone();
  const progressToMilestone = (streak.currentStreak / nextMilestone) * 100;

  const milestoneRewards = {
    7: { xp: 70, vfide: '35' },
    14: { xp: 140, vfide: '70' },
    30: { xp: 300, vfide: '150' },
    60: { xp: 600, vfide: '300' },
    90: { xp: 900, vfide: '450' },
  };

  const upcomingReward = milestoneRewards[nextMilestone as keyof typeof milestoneRewards];

  return (
    <div className="bg-gradient-to-br from-[#FF6B35]/10 to-[#F7931E]/10 border border-[#FF6B35]/30 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-[#FF6B35] to-[#F7931E] rounded-full flex items-center justify-center">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Login Streak</h3>
            <p className="text-sm text-[#A0A0A5]">Keep the fire burning!</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-[#FF6B35]">{streak.currentStreak}</div>
          <div className="text-xs text-[#A0A0A5]">days</div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-[#1A1A1F] rounded-lg p-3 text-center">
          <div className="text-xs text-[#A0A0A5] mb-1">Current</div>
          <div className="text-xl font-bold text-[#FF6B35]">{streak.currentStreak}</div>
        </div>
        <div className="bg-[#1A1A1F] rounded-lg p-3 text-center">
          <div className="text-xs text-[#A0A0A5] mb-1">Longest</div>
          <div className="text-xl font-bold text-[#FFD700]">{streak.longestStreak}</div>
        </div>
        <div className="bg-[#1A1A1F] rounded-lg p-3 text-center">
          <div className="text-xs text-[#A0A0A5] mb-1">Total</div>
          <div className="text-xl font-bold text-[#50C878]">{streak.totalDays}</div>
        </div>
      </div>

      {/* Progress to Next Milestone */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-[#A0A0A5]">Next Milestone: {nextMilestone} Days</span>
          <span className="text-white font-semibold">{streak.currentStreak} / {nextMilestone}</span>
        </div>
        <div className="w-full bg-[#2A2A2F] rounded-full h-2 mb-2">
          <div
            className="bg-gradient-to-r from-[#FF6B35] to-[#F7931E] h-2 rounded-full transition-all"
            style={{ width: `${progressToMilestone}%` }}
          />
        </div>
      </div>

      {/* Upcoming Reward */}
      {upcomingReward && (
        <div className="bg-[#1A1A1F] rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="w-4 h-4 text-[#FFD700]" />
            <span className="text-sm font-semibold text-white">Upcoming Reward</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-[#50C878]">
              <Award className="w-4 h-4" />
              <span>+{upcomingReward.xp} XP</span>
            </div>
            <div className="flex items-center gap-1 text-[#FFD700]">
              <Target className="w-4 h-4" />
              <span>+{upcomingReward.vfide} VFIDE</span>
            </div>
          </div>
        </div>
      )}

      {/* Warning if streak at risk */}
      {new Date(streak.lastActivityDate).toDateString() !== new Date().toDateString() && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-400 font-semibold">
            ⚠️ Your streak is at risk! Log in today to keep it alive.
          </p>
        </div>
      )}
    </div>
  );
}
