/**
 * DAILY REWARDS WIDGET
 * 
 * Simple daily login reward system
 * One-click claim for daily VFIDE + XP
 */

'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Gift, Flame, Calendar, CheckCircle2 } from 'lucide-react';

interface DailyReward {
  day: number;
  vfide: number;
  xp: number;
  claimed: boolean;
  bonus?: boolean;
}

export default function DailyRewardsWidget() {
  const { address, isConnected } = useAccount();
  const [canClaim, setCanClaim] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [streak, setStreak] = useState(7);
  const [nextRewardTime, setNextRewardTime] = useState<number | null>(null);
  const [weekRewards, setWeekRewards] = useState<DailyReward[]>([]);

  useEffect(() => {
    if (isConnected) {
      checkClaimStatus();
      loadWeekRewards();
    }
  }, [isConnected]);

  const checkClaimStatus = async () => {
    // In production: Check API for last claim time
    const lastClaim = localStorage.getItem('lastDailyClaim');
    if (lastClaim) {
      const lastClaimTime = parseInt(lastClaim);
      const now = Date.now();
      const hoursUntilNext = 24 - ((now - lastClaimTime) / (1000 * 60 * 60));
      
      if (hoursUntilNext > 0) {
        setCanClaim(false);
        setNextRewardTime(now + (hoursUntilNext * 60 * 60 * 1000));
      }
    }
  };

  const loadWeekRewards = () => {
    const rewards: DailyReward[] = [
      { day: 1, vfide: 15, xp: 50, claimed: true },
      { day: 2, vfide: 15, xp: 50, claimed: true },
      { day: 3, vfide: 20, xp: 75, claimed: true, bonus: true },
      { day: 4, vfide: 15, xp: 50, claimed: true },
      { day: 5, vfide: 15, xp: 50, claimed: true },
      { day: 6, vfide: 15, xp: 50, claimed: true },
      { day: 7, vfide: 50, xp: 200, claimed: false, bonus: true }
    ];
    setWeekRewards(rewards);
  };

  const claimDailyReward = async () => {
    setClaiming(true);
    
    try {
      // In production: Call API to claim reward
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      localStorage.setItem('lastDailyClaim', Date.now().toString());
      setCanClaim(false);
      setNextRewardTime(Date.now() + (24 * 60 * 60 * 1000));
      
      // Trigger achievement notification
      if ((window as any).showAchievement) {
        (window as any).showAchievement({
          type: 'reward',
          title: 'Daily Reward Claimed!',
          description: `Day ${streak} streak bonus applied`,
          icon: '🎁',
          reward: { vfide: 15, xp: 50 }
        });
      }
    } catch (error) {
      console.error('Failed to claim reward:', error);
    } finally {
      setClaiming(false);
    }
  };

  if (!isConnected) return null;

  const todayReward = weekRewards[streak - 1] || weekRewards[0];
  const timeUntilNext = nextRewardTime ? nextRewardTime - Date.now() : 0;
  const hoursLeft = Math.floor(timeUntilNext / (1000 * 60 * 60));
  const minutesLeft = Math.floor((timeUntilNext % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div className="bg-gradient-to-br from-[#FFD700]/10 to-[#FFA500]/10 border-2 border-[#FFD700]/30 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-[#FFD700] to-[#FFA500] rounded-lg p-3">
            <Gift className="w-6 h-6 text-[#0A0A0B]" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Daily Reward</h3>
            <p className="text-sm text-[#A0A0A5]">
              {canClaim ? 'Ready to claim!' : `Next reward in ${hoursLeft}h ${minutesLeft}m`}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2 text-orange-500 mb-1">
            <Flame className="w-5 h-5" />
            <span className="text-2xl font-bold">{streak}</span>
          </div>
          <div className="text-xs text-[#A0A0A5]">Day Streak</div>
        </div>
      </div>

      {/* Week Calendar */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {weekRewards.map((reward, index) => (
          <div
            key={reward.day}
            className={`aspect-square rounded-lg p-2 text-center ${
              reward.claimed
                ? 'bg-[#50C878]/20 border border-[#50C878]/50'
                : reward.day === streak
                ? 'bg-[#FFD700]/20 border-2 border-[#FFD700] animate-pulse'
                : 'bg-[#2A2A2F] border border-[#3A3A3F]'
            }`}
          >
            <div className="text-xs text-[#A0A0A5] mb-1">Day {reward.day}</div>
            {reward.claimed ? (
              <CheckCircle2 className="w-5 h-5 text-[#50C878] mx-auto" />
            ) : (
              <div>
                <div className="text-sm font-bold text-[#FFD700]">{reward.vfide}</div>
                {reward.bonus && <div className="text-xs text-[#FFA500]">🌟</div>}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Today's Reward */}
      <div className="bg-[#1A1A1F] rounded-lg p-4 mb-4">
        <div className="text-center mb-3">
          <div className="text-sm text-[#A0A0A5] mb-1">Today's Reward</div>
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-[#FFD700]" />
              <span className="text-2xl font-bold text-[#FFD700]">{todayReward.vfide}</span>
              <span className="text-sm text-[#A0A0A5]">VFIDE</span>
            </div>
            <div className="text-[#2A2A2F]">|</div>
            <div className="flex items-center gap-2">
              <span className="text-xl text-[#9333EA]">✨</span>
              <span className="text-2xl font-bold text-[#9333EA]">{todayReward.xp}</span>
              <span className="text-sm text-[#A0A0A5]">XP</span>
            </div>
          </div>
          {todayReward.bonus && (
            <div className="text-xs text-[#FFA500] mt-2">🌟 Bonus Day!</div>
          )}
        </div>

        {/* Claim Button */}
        <button
          onClick={claimDailyReward}
          disabled={!canClaim || claiming}
          className={`w-full py-3 rounded-lg font-bold transition-all ${
            canClaim && !claiming
              ? 'bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-[#0A0A0B] hover:opacity-90'
              : 'bg-[#2A2A2F] text-[#6A6A6F] cursor-not-allowed'
          }`}
        >
          {claiming ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-[#0A0A0B] border-t-transparent rounded-full animate-spin" />
              Claiming...
            </span>
          ) : canClaim ? (
            'Claim Reward'
          ) : (
            `Next Reward: ${hoursLeft}h ${minutesLeft}m`
          )}
        </button>
      </div>

      {/* Streak Milestones */}
      <div className="bg-[#0A0A0B] rounded-lg p-3">
        <div className="text-xs text-[#A0A0A5] mb-2 flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          Streak Milestones
        </div>
        <div className="flex justify-between text-xs">
          <div className="text-center">
            <div className={streak >= 7 ? 'text-[#50C878]' : 'text-[#6A6A6F]'}>
              {streak >= 7 ? '✓' : '🔒'} 7 days
            </div>
            <div className="text-[#A0A0A5]">1.15x XP</div>
          </div>
          <div className="text-center">
            <div className={streak >= 30 ? 'text-[#50C878]' : 'text-[#6A6A6F]'}>
              {streak >= 30 ? '✓' : '🔒'} 30 days
            </div>
            <div className="text-[#A0A0A5]">1.5x XP</div>
          </div>
          <div className="text-center">
            <div className={streak >= 90 ? 'text-[#50C878]' : 'text-[#6A6A6F]'}>
              {streak >= 90 ? '✓' : '🔒'} 90 days
            </div>
            <div className="text-[#A0A0A5]">2x XP</div>
          </div>
          <div className="text-center">
            <div className={streak >= 365 ? 'text-[#50C878]' : 'text-[#6A6A6F]'}>
              {streak >= 365 ? '✓' : '🔒'} 365 days
            </div>
            <div className="text-[#A0A0A5]">3x XP</div>
          </div>
        </div>
      </div>
    </div>
  );
}
