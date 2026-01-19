'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { Flame, TrendingUp, Calendar, Gift, Target, Award, Zap, AlertTriangle } from 'lucide-react';
import { useTransactionSounds } from '@/hooks/useTransactionSounds';

interface Streak {
  type: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string;
  totalDays: number;
}

// Animated counter component
function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 1,
      ease: "easeOut",
    });
    
    const unsubscribe = rounded.on("change", (v) => setDisplayValue(v));
    
    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [value, count, rounded]);

  return <span className={className}>{displayValue}</span>;
}

// Fire particle component
function FireParticle({ delay }: { delay: number }) {
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-full bg-linear-to-t from-orange-500 to-yellow-300"
      initial={{ y: 0, x: 0, opacity: 0.8, scale: 1 }}
      animate={{
        y: [-5, -25],
        x: [0, (Math.random() - 0.5) * 20],
        opacity: [0.8, 0],
        scale: [1, 0.3],
      }}
      transition={{
        duration: 1,
        delay,
        repeat: Infinity,
        ease: "easeOut",
      }}
    />
  );
}

export default function StreakTracker() {
  const { address: _address } = useAccount();
  const { playSuccess, playNotification } = useTransactionSounds();
  const [streak, _setStreak] = useState<Streak>({
    type: 'login',
    currentStreak: 5,
    longestStreak: 12,
    lastActivityDate: new Date().toISOString(),
    totalDays: 47,
  });
  const [isHovered, setIsHovered] = useState(false);
  const [showMilestoneAnimation, setShowMilestoneAnimation] = useState(false);

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
  const isStreakAtRisk = new Date(streak.lastActivityDate).toDateString() !== new Date().toDateString();

  const milestoneRewards = {
    7: { xp: 70, vfide: '35' },
    14: { xp: 140, vfide: '70' },
    30: { xp: 300, vfide: '150' },
    60: { xp: 600, vfide: '300' },
    90: { xp: 900, vfide: '450' },
  };

  const upcomingReward = milestoneRewards[nextMilestone as keyof typeof milestoneRewards];

  // Play sound on mount for high streaks
  useEffect(() => {
    if (streak.currentStreak >= 7) {
      playNotification();
    }
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative bg-linear-to-br from-[#FF6B35]/10 to-[#F7931E]/10 border border-[#FF6B35]/30 rounded-xl p-6 overflow-hidden"
    >
      {/* Animated background glow */}
      <motion.div
        animate={{
          opacity: [0.3, 0.6, 0.3],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute -top-20 -right-20 w-40 h-40 bg-linear-to-br from-orange-500/30 to-yellow-500/20 rounded-full blur-3xl pointer-events-none"
      />

      {/* Header */}
      <div className="relative flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <motion.div 
            animate={isHovered ? { 
              scale: [1, 1.1, 1],
              rotate: [0, -5, 5, 0]
            } : {}}
            transition={{ duration: 0.5, repeat: isHovered ? Infinity : 0 }}
            className="relative w-14 h-14 bg-linear-to-br from-[#FF6B35] to-[#F7931E] rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
              }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <Flame className="w-7 h-7 text-white" />
            </motion.div>
            
            {/* Fire particles */}
            {isHovered && (
              <div className="absolute inset-0 flex items-center justify-center">
                {[0, 0.2, 0.4, 0.6, 0.8].map((delay, i) => (
                  <FireParticle key={i} delay={delay} />
                ))}
              </div>
            )}
          </motion.div>
          <div>
            <h3 className="text-xl font-bold text-white">Login Streak</h3>
            <p className="text-sm text-[#A0A0A5]">Keep the fire burning!</p>
          </div>
        </div>
        <motion.div 
          className="text-right"
          animate={isStreakAtRisk ? { x: [-2, 2, -2, 2, 0] } : {}}
          transition={{ duration: 0.5, repeat: isStreakAtRisk ? Infinity : 0, repeatDelay: 2 }}
        >
          <motion.div 
            key={streak.currentStreak}
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-4xl font-bold text-transparent bg-clip-text bg-linear-to-r from-[#FF6B35] to-[#F7931E]"
          >
            <AnimatedNumber value={streak.currentStreak} />
          </motion.div>
          <div className="text-xs text-[#A0A0A5]">days</div>
        </motion.div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Current', value: streak.currentStreak, color: 'text-[#FF6B35]', icon: Flame },
          { label: 'Longest', value: streak.longestStreak, color: 'text-[#FFD700]', icon: Award },
          { label: 'Total', value: streak.totalDays, color: 'text-[#50C878]', icon: Calendar },
        ].map((stat, index) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.05, y: -2 }}
            className="bg-[#1A1A1F] border border-[#2A2A2F] rounded-xl p-3 text-center"
          >
            <stat.icon className={`w-4 h-4 mx-auto mb-1 ${stat.color}`} />
            <div className="text-xs text-[#A0A0A5] mb-1">{stat.label}</div>
            <div className={`text-xl font-bold ${stat.color}`}>
              <AnimatedNumber value={stat.value} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Progress to Next Milestone */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mb-4"
      >
        <div className="flex items-center justify-between text-sm mb-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[#A0A0A5]" />
            <span className="text-[#A0A0A5]">Next Milestone: {nextMilestone} Days</span>
          </div>
          <span className="text-white font-semibold">{streak.currentStreak} / {nextMilestone}</span>
        </div>
        <div className="relative w-full bg-[#2A2A2F] rounded-full h-3 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressToMilestone}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-linear-to-r from-[#FF6B35] to-[#F7931E] rounded-full relative"
          >
            {/* Animated glow on progress bar */}
            <motion.div
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent"
            />
          </motion.div>
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-[#A0A0A5]">{Math.round(progressToMilestone)}% complete</span>
          <span className="text-xs text-[#FF6B35]">{nextMilestone - streak.currentStreak} days to go</span>
        </div>
      </motion.div>

      {/* Upcoming Reward */}
      {upcomingReward && (
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.02 }}
          className="bg-[#1A1A1F] border border-[#2A2A2F] rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
            >
              <Gift className="w-5 h-5 text-[#FFD700]" />
            </motion.div>
            <span className="text-sm font-semibold text-white">Upcoming Reward</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-500">
              Day {nextMilestone}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <motion.div 
              whileHover={{ scale: 1.1 }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#50C878]/10 border border-[#50C878]/30"
            >
              <Zap className="w-4 h-4 text-[#50C878]" />
              <span className="text-[#50C878] font-semibold">+{upcomingReward.xp} XP</span>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.1 }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#FFD700]/10 border border-[#FFD700]/30"
            >
              <Target className="w-4 h-4 text-[#FFD700]" />
              <span className="text-[#FFD700] font-semibold">+{upcomingReward.vfide} VFIDE</span>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Warning if streak at risk */}
      <AnimatePresence>
        {isStreakAtRisk && (
          <motion.div 
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="mt-4"
          >
            <motion.div
              animate={{ 
                boxShadow: ['0 0 0 0 rgba(239, 68, 68, 0)', '0 0 0 8px rgba(239, 68, 68, 0.2)', '0 0 0 0 rgba(239, 68, 68, 0)']
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3"
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
              >
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </motion.div>
              <div>
                <p className="text-sm text-red-400 font-semibold">Your streak is at risk!</p>
                <p className="text-xs text-red-400/70">Log in today to keep it alive.</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
