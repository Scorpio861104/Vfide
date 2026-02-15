/**
 * DAILY QUESTS PANEL - Enhanced
 * 
 * Gamification system for daily/weekly/monthly challenges
 * Features: Progress rings, streak calendar, animated rewards, confetti
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { 
  Flame, Gift, CheckCircle2, Lock, 
  Clock, TrendingUp, Star, Award, Calendar,
  ChevronLeft, ChevronRight, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTransactionSounds } from '@/hooks/useTransactionSounds';
import { triggerAchievement } from './AchievementToast';
import { getAuthHeaders } from '@/lib/auth/client';

interface Quest {
  id: string;
  type: 'daily' | 'weekly' | 'monthly';
  title: string;
  description: string;
  progress: number;
  target: number;
  reward: {
    vfide?: number;
    xp?: number;
    badge?: string;
  };
  completed: boolean;
  claimed: boolean;
  expiresAt: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'legendary';
  icon: string;
}

interface StreakData {
  current: number;
  longest: number;
  lastActive: number;
  nextMilestone: number;
  multiplier: number;
  history: boolean[]; // Last 30 days
}

// ==================== PROGRESS RING ====================

function ProgressRing({ progress, size = 60, strokeWidth = 4, color = '#FFD700' }: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="transparent"
          className="stroke-zinc-800"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="transparent"
          stroke={color}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
        {Math.round(progress)}%
      </div>
    </div>
  );
}

// ==================== STREAK CALENDAR ====================

function StreakCalendar({ history, onMonthChange }: { history: boolean[]; onMonthChange?: (offset: number) => void }) {
  const [monthOffset, setMonthOffset] = useState(0);
  
  const { days, monthName } = useMemo(() => {
    const today = new Date();
    const targetDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const daysInMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
    const firstDayOfWeek = targetDate.getDay();
    const monthName = targetDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    const days: (boolean | null)[] = [];
    // Padding for start of month
    for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
    // Days of month
    for (let i = 1; i <= daysInMonth; i++) {
      const dayIndex = 30 - (new Date().getDate() - i) - (monthOffset * 30);
      days.push(dayIndex >= 0 && dayIndex < history.length ? (history[dayIndex] ?? false) : false);
    }
    return { days, monthName };
  }, [history, monthOffset]);

  const navigate = (dir: number) => {
    setMonthOffset(prev => Math.min(0, Math.max(-2, prev + dir)));
    onMonthChange?.(monthOffset + dir);
  };

  return (
    <div className="bg-zinc-950 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-white font-semibold text-sm">{monthName}</span>
        <button onClick={() => navigate(1)} disabled={monthOffset >= 0} className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-zinc-400 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((active, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.01 }}
            className={`aspect-square rounded-md flex items-center justify-center text-[10px] ${
              active === null ? '' :
              active ? 'bg-linear-to-br from-orange-500 to-red-500 text-white' : 
              'bg-zinc-800 text-zinc-500'
            }`}
          >
            {active === true && <Flame className="w-3 h-3" />}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

export default function DailyQuestsPanel() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [quests, setQuests] = useState<Quest[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [streak, setStreak] = useState<StreakData>({
    current: 0,
    longest: 0,
    lastActive: Date.now(),
    nextMilestone: 7,
    multiplier: 1,
    history: Array(30).fill(false),
  });
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimedReward, setClaimedReward] = useState<Quest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { play: playSound } = useTransactionSounds();

  useEffect(() => {
    if (isConnected && address) {
      void loadQuests();
      void loadStreak();
    } else {
      setQuests([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, activeTab, address]);

  const loadQuests = async () => {
    if (!address) return;
    setIsLoading(true);
    setError(null);

    try {
      if (activeTab === 'monthly') {
        setQuests([]);
        return;
      }

      const endpoint = activeTab === 'weekly' ? '/api/quests/weekly' : '/api/quests/daily';
      const response = await fetch(`${endpoint}?userAddress=${address}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load quests');
      }

      const data = await response.json();
      const rows = activeTab === 'weekly' ? data?.challenges : data?.quests;
      const mapped: Quest[] = Array.isArray(rows)
        ? rows.map((row: Record<string, unknown>) => {
            const rewardVfide = row.rewardVfide ?? row.reward_vfide;
            const rewardXp = row.rewardXp ?? row.reward_xp;
            const expiresAt = activeTab === 'weekly'
              ? new Date(row.weekEnd ?? row.week_end ?? Date.now()).getTime()
              : new Date().setHours(23, 59, 59, 999);

            return {
              id: String(row.id),
              type: activeTab,
              title: row.title ?? 'Quest',
              description: row.description ?? '',
              progress: Number(row.progress ?? 0),
              target: Number(row.target ?? 0),
              reward: {
                vfide: rewardVfide ? Number(rewardVfide) : undefined,
                xp: rewardXp ? Number(rewardXp) : undefined,
              },
              completed: Boolean(row.completed),
              claimed: Boolean(row.claimed),
              expiresAt,
              difficulty: (row.difficulty ?? 'easy') as Quest['difficulty'],
              icon: row.icon ?? '🎯',
            };
          })
        : [];

      setQuests(mapped);
    } catch (err) {
      console.error('Failed to load quests:', err);
      setError('Unable to load quests');
      setQuests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStreak = async () => {
    if (!address) return;
    try {
      const response = await fetch(`/api/quests/streak?userAddress=${address}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) return;
      const data = await response.json();
      const streakData = data?.streak;
      if (!streakData) return;

      const current = Number(streakData.currentStreak ?? 0);
      const longest = Number(streakData.longestStreak ?? 0);
      const lastActiveDate = streakData.lastActivityDate
        ? new Date(streakData.lastActivityDate)
        : new Date();

      const today = new Date();
      const diffDays = Math.floor((today.getTime() - lastActiveDate.getTime()) / (24 * 60 * 60 * 1000));
      const history = Array(30).fill(false);
      if (diffDays >= 0 && diffDays < history.length) {
        history[history.length - 1 - diffDays] = true;
      }

      const milestones = [7, 14, 30, 60, 90, 120];
      const nextMilestone = milestones.find((m) => m > current) ?? current;

      setStreak({
        current,
        longest,
        lastActive: lastActiveDate.getTime(),
        nextMilestone,
        multiplier: current > 0 ? 1 + Math.min(current / 100, 0.5) : 1,
        history,
      });
    } catch (err) {
      console.error('Failed to load streak:', err);
    }
  };

  const claimReward = async (quest: Quest) => {
    if (!address) return;
    playSound('notification');
    setClaimedReward(quest);
    setShowClaimModal(true);
    
    try {
      const response = await fetch('/api/quests/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ questId: quest.id, userAddress: address }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to claim reward');
      }

      setQuests(prev => prev.map(q => 
        q.id === quest.id ? { ...q, claimed: true } : q
      ));
    } catch (err) {
      console.error('Failed to claim reward:', err);
      setError('Unable to claim reward');
    }

    // Trigger achievement toast
    triggerAchievement(
      'quest',
      quest.title,
      'Quest completed!',
      quest.reward,
      quest.icon,
      quest.difficulty === 'legendary' ? 'legendary' : quest.difficulty === 'hard' ? 'epic' : 'common'
    );

    setTimeout(() => setShowClaimModal(false), 3500);
  };

  const getDifficultyColor = (difficulty: Quest['difficulty']) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
      case 'medium':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/30';
      case 'hard':
        return 'bg-purple-500/10 text-purple-400 border border-purple-500/30';
      case 'legendary':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
      default:
        return 'bg-zinc-500/10 text-zinc-300 border border-zinc-500/30';
    }
  };

  const getTypeColor = (type: Quest['type']) => {
    switch (type) {
      case 'daily':
        return 'from-cyan-400 to-blue-500';
      case 'weekly':
        return 'from-purple-500 to-pink-500';
      case 'monthly':
        return 'from-amber-400 to-orange-500';
      default:
        return 'from-zinc-600 to-zinc-800';
    }
  };

  const getTimeRemaining = (expiresAt: number) => {
    const diff = expiresAt - Date.now();
    if (diff <= 0) return 'Expired';
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  const completedCount = quests.filter((q) => q.completed).length;
  const readyToClaim = quests.filter((q) => q.completed && !q.claimed).length;
  const totalXP = quests.reduce((sum, q) => sum + (q.reward.xp ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Quests</h2>
            <p className="text-sm text-zinc-400">Complete quests to earn VFIDE, XP, and badges.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <Flame className="w-4 h-4 text-orange-500" />
              {streak.current} day streak
            </div>
            <button
              onClick={() => setShowCalendar((prev) => !prev)}
              className="px-3 py-2 text-xs font-semibold rounded-lg border border-zinc-700 text-zinc-300 hover:border-amber-400 hover:text-amber-300"
            >
              {showCalendar ? 'Hide Streak' : 'View Streak'}
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-zinc-400">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Bonus: {((streak.multiplier - 1) * 100).toFixed(0)}%
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-400" />
            Next milestone: {streak.nextMilestone} days
          </div>
        </div>
        {showCalendar && (
          <div className="mt-4">
            <StreakCalendar history={streak.history} />
          </div>
        )}
      </div>

      <motion.div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          {(['daily', 'weekly', 'monthly'] as const).map((tab) => {
            const count = quests.filter((q) => q.type === tab && q.completed && !q.claimed).length;
            return (
              <motion.button
                key={tab}
                onClick={() => setActiveTab(tab)}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={`relative px-6 py-3 font-semibold capitalize transition-all ${
                  activeTab === tab
                    ? 'text-amber-400'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tab}
                {count > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-linear-to-r from-amber-400 to-orange-500 rounded-full text-[10px] font-bold text-black flex items-center justify-center"
                  >
                    {count}
                  </motion.span>
                )}
                {activeTab === tab && (
                  <motion.div
                    layoutId="questTabIndicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-amber-400 to-orange-500"
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.1 } },
        }}
      >
        {isLoading && (
          <div className="col-span-full rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-400">
            Loading quests...
          </div>
        )}
        {error && !isLoading && (
          <div className="col-span-full rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
            {error}
          </div>
        )}
        {!isLoading && !error && quests.length === 0 && (
          <div className="col-span-full rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-400">
            No {activeTab} quests available right now.
          </div>
        )}
        {!isLoading && !error && quests.length > 0 && (
          <AnimatePresence mode="popLayout">
            {quests.filter((q) => q.type === activeTab).map((quest, index) => (
              <motion.div
                key={quest.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
              >
                <QuestCard
                  quest={quest}
                  onClaim={claimReward}
                  getDifficultyColor={getDifficultyColor}
                  getTypeColor={getTypeColor}
                  getTimeRemaining={getTimeRemaining}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-zinc-900 border border-zinc-800 rounded-xl p-6"
      >
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-500" />
          Today&apos;s Progress
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<ProgressRing progress={(completedCount / Math.max(quests.length, 1)) * 100} color="#50C878" />}
            label="Completed"
            value={`${completedCount}/${quests.length}`}
            color="text-emerald-500"
            isRing
          />
          <StatCard
            icon={<Gift className="w-8 h-8" />}
            label="Rewards Ready"
            value={readyToClaim}
            color="text-amber-400"
            pulse={readyToClaim > 0}
          />
          <StatCard
            icon={<Star className="w-8 h-8" />}
            label="Total XP"
            value={`+${totalXP}`}
            color="text-purple-600"
          />
          <StatCard
            icon={<Flame className="w-8 h-8" />}
            label="Streak Bonus"
            value={`${((streak.multiplier - 1) * 100).toFixed(0)}%`}
            color="text-orange-500"
          />
        </div>
      </motion.div>

      <AnimatePresence>
        {showClaimModal && claimedReward && (
          <ClaimRewardModal reward={claimedReward} onClose={() => setShowClaimModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// Quest Card Component
function QuestCard({ 
  quest, 
  onClaim, 
  getDifficultyColor, 
  getTypeColor, 
  getTimeRemaining 
}: { 
  quest: Quest;
  onClaim: (quest: Quest) => void;
  getDifficultyColor: (difficulty: Quest['difficulty']) => string;
  getTypeColor: (type: Quest['type']) => string;
  getTimeRemaining: (expiresAt: number) => string;
}) {
  const progress = Math.min((quest.progress / quest.target) * 100, 100);
  const isLocked = quest.progress === 0 && quest.target > 10;

  return (
    <div className={`bg-zinc-900 border-2 ${quest.completed ? 'border-emerald-500' : 'border-zinc-800'} rounded-xl p-5 transition-all hover:border-amber-400/50 ${isLocked ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 bg-linear-to-br ${getTypeColor(quest.type)} rounded-lg flex items-center justify-center text-2xl`}>
            {quest.icon}
          </div>
          <div>
            <h4 className="text-lg font-bold text-white mb-1">{quest.title}</h4>
            <p className="text-sm text-zinc-400">{quest.description}</p>
          </div>
        </div>
        {isLocked && <Lock className="w-5 h-5 text-zinc-400" />}
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2 text-sm">
          <span className="text-zinc-400">Progress</span>
          <span className="font-bold text-white">{quest.progress}/{quest.target}</span>
        </div>
        <div className="w-full bg-zinc-800 rounded-full h-2">
          <div 
            className={`bg-linear-to-r ${quest.completed ? 'from-emerald-500 to-emerald-500' : 'from-blue-500 to-purple-600'} h-2 rounded-full transition-all`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Rewards */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        {quest.reward.vfide && (
          <div className="flex items-center gap-1.5 bg-amber-400/10 px-3 py-1.5 rounded-lg">
            <Gift className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold text-amber-400">{quest.reward.vfide} VFIDE</span>
          </div>
        )}
        {quest.reward.xp && (
          <div className="flex items-center gap-1.5 bg-purple-600/10 px-3 py-1.5 rounded-lg">
            <Star className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-bold text-purple-600">{quest.reward.xp} XP</span>
          </div>
        )}
        {quest.reward.badge && (
          <div className="flex items-center gap-1.5 bg-blue-500/10 px-3 py-1.5 rounded-lg">
            <Award className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-bold text-blue-500">{quest.reward.badge}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold px-2 py-1 rounded ${getDifficultyColor(quest.difficulty)}`}>
            {quest.difficulty.toUpperCase()}
          </span>
          <span className="text-xs text-zinc-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {getTimeRemaining(quest.expiresAt)}
          </span>
        </div>
        
        {quest.completed && !quest.claimed ? (
          <button 
            onClick={() => onClaim(quest)}
            className="px-4 py-2 bg-linear-to-r from-amber-400 to-orange-500 text-zinc-950 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <Gift className="w-4 h-4" />
            Claim
          </button>
        ) : quest.claimed ? (
          <div className="text-emerald-500 text-sm font-bold flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" />
            Claimed
          </div>
        ) : (
          <div className="text-zinc-400 text-sm">In Progress</div>
        )}
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ icon, label, value, color, isRing: _isRing, pulse }: { icon: React.ReactNode; label: string; value: string | number; color: string; isRing?: boolean; pulse?: boolean }) {
  return (
    <div className={`bg-zinc-950 rounded-lg p-4 ${pulse ? 'animate-pulse' : ''}`}>
      <div className={`${color} mb-2`}>
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-5 h-5' })}
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-xs text-zinc-400">{label}</div>
    </div>
  );
}

// Claim Reward Modal
function ClaimRewardModal({ reward, onClose }: { reward: Quest; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border-2 border-amber-400 rounded-xl p-8 text-center max-w-md animate-in zoom-in-95"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="text-6xl mb-4 animate-bounce">🎉</div>
        <h2 className="text-3xl font-bold text-white mb-2">Quest Complete!</h2>
        <p className="text-sm text-zinc-400 mb-6">You&apos;ve earned new rewards.</p>
        <div className="space-y-2 mb-6">
          {reward.reward.vfide && (
            <div className="flex items-center justify-center gap-2 text-amber-400 font-semibold">
              <Gift className="w-4 h-4" /> {reward.reward.vfide} VFIDE
            </div>
          )}
          {reward.reward.xp && (
            <div className="flex items-center justify-center gap-2 text-purple-400 font-semibold">
              <Star className="w-4 h-4" /> {reward.reward.xp} XP
            </div>
          )}
          {reward.reward.badge && (
            <div className="flex items-center justify-center gap-2 text-cyan-400 font-semibold">
              <Award className="w-4 h-4" /> {reward.reward.badge}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-full px-4 py-2 rounded-lg bg-amber-400 text-zinc-950 font-semibold hover:bg-amber-300"
        >
          Close
        </button>
      </div>
    </div>
  );
}
