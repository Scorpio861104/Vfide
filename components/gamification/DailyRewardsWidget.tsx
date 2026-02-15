/**
 * DAILY REWARDS WIDGET
 * 
 * Simple daily login reward system
 * One-click claim for daily VFIDE + XP
 */

'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Flame, Calendar, CheckCircle2, Sparkles, Star, Zap, Clock } from 'lucide-react';
import { useTransactionSounds } from '@/hooks/useTransactionSounds';
import { getAuthHeaders, getAuthToken } from '@/lib/auth/client';

interface DailyReward {
  day: number;
  vfide: number;
  xp: number;
  claimed: boolean;
  bonus?: boolean;
}

export default function DailyRewardsWidget() {
  const { isConnected } = useAccount();
  const [canClaim, setCanClaim] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [streak, setStreak] = useState(0);
  const [nextRewardTime, setNextRewardTime] = useState<number | null>(null);
  const [weekRewards, setWeekRewards] = useState<DailyReward[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const { playSuccess, playNotification: _playNotification } = useTransactionSounds();

  useEffect(() => {
    if (isConnected) {
      void checkClaimStatus();
    }
  }, [isConnected]);

  const checkClaimStatus = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch('/api/gamification/daily-rewards', {
        headers: getAuthHeaders(),
      });
      if (!response.ok) return;
      const data = await response.json();

      setCanClaim(Boolean(data.canClaim));
      setStreak(Number(data.streak || 0));
      setClaimed(!data.canClaim);
      setWeekRewards(Array.isArray(data.rewards) ? data.rewards : []);
      setNextRewardTime(data.nextClaimAt ? Number(data.nextClaimAt) : null);
    } catch (error) {
      console.error('Failed to load daily reward status:', error);
    }
  };

  const claimDailyReward = async () => {
    setClaiming(true);
    
    try {
      const response = await fetch('/api/gamification/daily-rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to claim reward');
      }

      const data = await response.json();
      setCanClaim(false);
      setClaimed(true);
      setShowConfetti(true);
      playSuccess();
      setNextRewardTime(data.nextClaimAt ? Number(data.nextClaimAt) : null);
      setStreak(Number(data.streak || 0));
      setWeekRewards(Array.isArray(data.rewards) ? data.rewards : []);

      // Hide confetti after animation
      setTimeout(() => setShowConfetti(false), 3000);

      if (window.showAchievement) {
        window.showAchievement({
          type: 'reward',
          title: 'Daily Reward Claimed!',
          description: `Day ${data.streak ?? streak} streak bonus applied`,
          icon: '🎁',
          reward: data.reward || { vfide: 15, xp: 50 },
        });
      }
    } catch (error) {
      console.error('Failed to claim reward:', error);
    } finally {
      setClaiming(false);
    }
  };

  if (!isConnected) return null;

  const todayReward = weekRewards[streak - 1] ?? weekRewards[0] ?? { day: 1, vfide: 15, xp: 50, claimed: false };
  const timeUntilNext = nextRewardTime ? nextRewardTime - Date.now() : 0;
  const hoursLeft = Math.floor(timeUntilNext / (1000 * 60 * 60));
  const minutesLeft = Math.floor((timeUntilNext % (1000 * 60 * 60)) / (1000 * 60));

  // Confetti particles
  const confettiColors = ['#FFD700', '#FFA500', '#50C878', '#9333EA', '#FF6B6B'];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-linear-to-br from-amber-400/10 to-orange-500/10 border-2 border-amber-400/30 rounded-2xl p-6 overflow-hidden"
    >
      {/* Confetti animation */}
      <AnimatePresence>
        {showConfetti && (
          <>
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  y: -20,
                  x: (i * 37 + 13) % 300 - 150,
                  opacity: 1,
                  rotate: 0,
                  scale: 1
                }}
                animate={{
                  y: 400,
                  x: ((i + 5) * 41) % 300 - 150,
                  opacity: 0,
                  rotate: 360 * (i % 2 === 0 ? 1 : -1),
                  scale: 0.5
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2 + (i % 3) * 0.5, delay: (i % 10) * 0.05 }}
                className="absolute pointer-events-none"
                style={{
                  left: '50%',
                  width: 8 + (i % 3) * 4,
                  height: 8 + (i % 3) * 4,
                  backgroundColor: confettiColors[i % confettiColors.length],
                  borderRadius: i % 2 === 0 ? '50%' : '2px',
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Background glow */}
      <motion.div
        animate={{ opacity: [0.3, 0.5, 0.3], scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute -top-10 -right-10 w-32 h-32 bg-linear-to-br from-yellow-500/30 to-orange-500/20 rounded-full blur-3xl pointer-events-none"
      />

      {/* Header */}
      <div className="relative flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <motion.div 
            animate={canClaim ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
            transition={{ duration: 1.5, repeat: canClaim ? Infinity : 0 }}
            className="bg-linear-to-br from-amber-400 to-orange-500 rounded-xl p-3 shadow-lg shadow-yellow-500/30"
          >
            <Gift className="w-6 h-6 text-black" />
          </motion.div>
          <div>
            <h3 className="text-xl font-bold text-white">Daily Reward</h3>
            <p className="text-sm text-zinc-400 flex items-center gap-1">
              {canClaim ? (
                <>
                  <Sparkles className="w-3 h-3 text-yellow-500" />
                  Ready to claim!
                </>
              ) : (
                <>
                  <Clock className="w-3 h-3" />
                  Next in {hoursLeft}h {minutesLeft}m
                </>
              )}
            </p>
          </div>
        </div>
        <motion.div 
          className="text-right"
          animate={canClaim ? { y: [0, -3, 0] } : {}}
          transition={{ duration: 1, repeat: canClaim ? Infinity : 0 }}
        >
          <div className="flex items-center gap-2 text-orange-500 mb-1">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <Flame className="w-5 h-5" />
            </motion.div>
            <span className="text-2xl font-bold">{streak}</span>
          </div>
          <div className="text-xs text-zinc-400">Day Streak</div>
        </motion.div>
      </div>

      {/* Week Calendar */}
      <div className="grid grid-cols-7 gap-2 mb-5">
        {weekRewards.map((reward, index) => {
          const isToday = reward.day === streak;
          const isClaimed = reward.claimed || (isToday && claimed);
          
          return (
            <motion.div
              key={reward.day}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.05, y: -2 }}
              className={`relative aspect-square rounded-xl p-2 text-center transition-all ${
                isClaimed
                  ? 'bg-emerald-500/20 border border-emerald-500/50'
                  : isToday
                  ? 'bg-linear-to-br from-amber-400/30 to-orange-500/20 border-2 border-amber-400'
                  : 'bg-zinc-800 border border-zinc-700'
              }`}
            >
              {/* Pulsing effect for today */}
              {isToday && !isClaimed && (
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.05, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute inset-0 rounded-xl bg-linear-to-br from-amber-400/20 to-transparent pointer-events-none"
                />
              )}
              
              <div className="relative">
                <div className="text-xs text-zinc-400 mb-1">Day {reward.day}</div>
                {isClaimed ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500 }}
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                  </motion.div>
                ) : (
                  <div>
                    <div className="text-sm font-bold text-amber-400">{reward.vfide}</div>
                    {reward.bonus && (
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        <Star className="w-3 h-3 text-orange-500 mx-auto" />
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Today's Reward */}
      <motion.div 
        whileHover={{ scale: 1.01 }}
        className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4"
      >
        <div className="text-center mb-4">
          <div className="text-sm text-zinc-400 mb-2">Today&apos;s Reward</div>
          <div className="flex items-center justify-center gap-6">
            <motion.div 
              whileHover={{ scale: 1.1 }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30"
            >
              <Gift className="w-5 h-5 text-amber-400" />
              <span className="text-2xl font-bold text-amber-400">{todayReward.vfide}</span>
              <span className="text-sm text-zinc-400">VFIDE</span>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.1 }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/10 border border-purple-500/30"
            >
              <Zap className="w-5 h-5 text-purple-600" />
              <span className="text-2xl font-bold text-purple-600">{todayReward.xp}</span>
              <span className="text-sm text-zinc-400">XP</span>
            </motion.div>
          </div>
          {todayReward.bonus && (
            <motion.div
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="inline-flex items-center gap-1 mt-3 px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs"
            >
              <Star className="w-3 h-3" />
              Bonus Day!
            </motion.div>
          )}
        </div>

        {/* Claim Button */}
        <motion.button
          onClick={claimDailyReward}
          disabled={!canClaim || claiming}
          whileHover={canClaim ? { scale: 1.02 } : {}}
          whileTap={canClaim ? { scale: 0.98 } : {}}
          className={`w-full py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
            canClaim && !claiming
              ? 'bg-linear-to-r from-amber-400 to-orange-500 text-black shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
          }`}
        >
          {claiming ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-black border-t-transparent rounded-full"
              />
              Claiming...
            </>
          ) : canClaim ? (
            <>
              <Sparkles className="w-5 h-5" />
              Claim Reward
            </>
          ) : (
            <>
              <Clock className="w-4 h-4" />
              Next Reward: {hoursLeft}h {minutesLeft}m
            </>
          )}
        </motion.button>
      </motion.div>

      {/* Streak Milestones */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-zinc-950 rounded-xl p-4"
      >
        <div className="text-xs text-zinc-400 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Streak Milestones
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { days: 7, multiplier: '1.15x', unlocked: streak >= 7 },
            { days: 30, multiplier: '1.5x', unlocked: streak >= 30 },
            { days: 90, multiplier: '2x', unlocked: streak >= 90 },
            { days: 365, multiplier: '3x', unlocked: streak >= 365 },
          ].map((milestone) => (
            <motion.div 
              key={milestone.days}
              whileHover={{ scale: 1.05 }}
              className={`text-center p-2 rounded-lg transition-all ${
                milestone.unlocked 
                  ? 'bg-emerald-500/10 border border-emerald-500/30' 
                  : 'bg-zinc-900 border border-zinc-800'
              }`}
            >
              <div className={`text-xs mb-1 ${milestone.unlocked ? 'text-emerald-500' : 'text-zinc-500'}`}>
                {milestone.unlocked ? (
                  <CheckCircle2 className="w-4 h-4 mx-auto" />
                ) : (
                  `🔒`
                )}
              </div>
              <div className={`text-sm font-medium ${milestone.unlocked ? 'text-white' : 'text-gray-500'}`}>
                {milestone.days}d
              </div>
              <div className={`text-xs ${milestone.unlocked ? 'text-emerald-500' : 'text-zinc-400'}`}>
                {milestone.multiplier} XP
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
