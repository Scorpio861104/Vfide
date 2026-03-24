/**
 * DAILY CHECK-IN WIDGET
 *
 * Tracks governance participation streak and XP.
 * No token rewards — VFIDE is a utility token, not an investment.
 */

'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, CheckCircle2, Sparkles, Zap, Clock } from 'lucide-react';
import { safeParseInt } from '@/lib/validation';
import { useTransactionSounds } from '@/hooks/useTransactionSounds';

interface DailyCheckIn {
  day: number;
  xp: number;
  claimed: boolean;
}

export default function DailyRewardsWidget() {
  const { isConnected } = useAccount();
  const [canClaim, setCanClaim] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [streak] = useState(7);
  const [nextRewardTime, setNextRewardTime] = useState<number | null>(null);
  const [weekCheckIns, setWeekCheckIns] = useState<DailyCheckIn[]>([]);
  const { playSuccess } = useTransactionSounds();

  useEffect(() => {
    if (isConnected) {
      checkClaimStatus();
      loadWeekCheckIns();
    }
  }, [isConnected]);

  const checkClaimStatus = async () => {
    const lastClaim = localStorage.getItem('lastDailyClaim');
    if (lastClaim) {
      const lastClaimTime = safeParseInt(lastClaim, 0);
      const now = Date.now();
      const hoursUntilNext = 24 - (now - lastClaimTime) / (1000 * 60 * 60);
      if (hoursUntilNext > 0) {
        setCanClaim(false);
        setNextRewardTime(now + hoursUntilNext * 60 * 60 * 1000);
      }
    }
  };

  const loadWeekCheckIns = () => {
    const checkIns: DailyCheckIn[] = [
      { day: 1, xp: 50, claimed: true },
      { day: 2, xp: 50, claimed: true },
      { day: 3, xp: 75, claimed: true },
      { day: 4, xp: 50, claimed: true },
      { day: 5, xp: 50, claimed: true },
      { day: 6, xp: 50, claimed: true },
      { day: 7, xp: 200, claimed: false },
    ];
    setWeekCheckIns(checkIns);
  };

  const claimDailyCheckIn = async () => {
    setClaiming(true);
    setClaimError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      localStorage.setItem('lastDailyClaim', Date.now().toString());
      setCanClaim(false);
      setClaimed(true);
      playSuccess();
      setNextRewardTime(Date.now() + 24 * 60 * 60 * 1000);
    } catch {
      setClaimError('Check-in failed. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  if (!isConnected) return null;

  const todayCheckIn = weekCheckIns[streak - 1] ?? { day: streak, xp: 50, claimed: false };
  const timeUntilNext = nextRewardTime ? nextRewardTime - Date.now() : 0;
  const hoursLeft = Math.floor(timeUntilNext / (1000 * 60 * 60));
  const minutesLeft = Math.floor((timeUntilNext % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-2 border-purple-500/30 rounded-2xl p-6 overflow-hidden"
    >
      {/* Header */}
      <div className="relative flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl p-3 shadow-lg shadow-purple-500/30">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Daily Check-In</h3>
            <p className="text-sm text-zinc-400 flex items-center gap-1">
              {canClaim ? (
                <>
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  Ready to check in!
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
        <div className="text-right">
          <div className="flex items-center gap-2 text-orange-500 mb-1">
            <Flame className="w-5 h-5" />
            <span className="text-2xl font-bold">{streak}</span>
          </div>
          <div className="text-xs text-zinc-400">Day Streak</div>
        </div>
      </div>

      {/* Week Calendar */}
      <div className="grid grid-cols-7 gap-2 mb-5">
        {weekCheckIns.map((checkIn) => {
          const isToday = checkIn.day === streak;
          const isClaimed = checkIn.claimed || (isToday && claimed);
          return (
            <div
              key={checkIn.day}
              className={`relative aspect-square rounded-xl p-2 text-center transition-all ${
                isClaimed
                  ? 'bg-emerald-500/20 border border-emerald-500/50'
                  : isToday
                  ? 'bg-gradient-to-br from-purple-400/30 to-blue-500/20 border-2 border-purple-400'
                  : 'bg-zinc-800 border border-zinc-700'
              }`}
            >
              <div className="text-xs text-zinc-400 mb-1">Day {checkIn.day}</div>
              {isClaimed ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
              ) : (
                <div className="text-sm font-bold text-purple-400">+{checkIn.xp}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Today's XP */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
        <div className="text-center mb-4">
          <div className="text-sm text-zinc-400 mb-2">Today&apos;s Check-In Reward</div>
          <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-purple-500/10 border border-purple-500/30 w-fit mx-auto">
            <Zap className="w-5 h-5 text-purple-400" />
            <span className="text-2xl font-bold text-purple-400">+{todayCheckIn.xp}</span>
            <span className="text-sm text-zinc-400">Governance XP</span>
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            XP reflects participation — not a monetary return
          </p>
        </div>

        <button
          onClick={claimDailyCheckIn}
          disabled={!canClaim || claiming}
          className={`w-full py-3 rounded-xl font-bold text-white transition-all ${
            canClaim && !claiming
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/30'
              : 'bg-zinc-700 cursor-not-allowed opacity-60'
          }`}
        >
          {claiming ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Checking in...
            </span>
          ) : canClaim ? (
            <span className="flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5" />
              Check In Now
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Checked In Today
            </span>
          )}
        </button>
      </div>

      {/* Streak info */}
      <AnimatePresence>
        {claimError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center text-sm text-red-400 font-medium mb-2"
          >
            {claimError}
          </motion.div>
        )}
        {claimed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center text-sm text-emerald-400 font-semibold"
          >
            ✓ Streak maintained — {streak} day{streak !== 1 ? 's' : ''} strong!
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
