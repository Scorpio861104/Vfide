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
  Target, Flame, Gift, CheckCircle2, Lock, 
  Clock, TrendingUp, Star, Award, Calendar,
  ChevronLeft, ChevronRight, Sparkles, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTransactionSounds } from '@/hooks/useTransactionSounds';
import { triggerAchievement } from './AchievementToast';

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
          className="stroke-[#2A2A2F]"
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
      days.push(dayIndex >= 0 && dayIndex < history.length ? history[dayIndex] : false);
    }
    return { days, monthName };
  }, [history, monthOffset]);

  const navigate = (dir: number) => {
    setMonthOffset(prev => Math.min(0, Math.max(-2, prev + dir)));
    onMonthChange?.(monthOffset + dir);
  };

  return (
    <div className="bg-[#0A0A0B] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-[#2A2A3F] rounded-lg text-[#A0A0A5] hover:text-white">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-white font-semibold text-sm">{monthName}</span>
        <button onClick={() => navigate(1)} disabled={monthOffset >= 0} className="p-1 hover:bg-[#2A2A3F] rounded-lg text-[#A0A0A5] hover:text-white disabled:opacity-30">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-[#A0A0A5] mb-2">
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
              active ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white' : 
              'bg-[#2A2A2F] text-[#606065]'
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
  const { address: _address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [quests, setQuests] = useState<Quest[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [streak] = useState<StreakData>({
    current: 7,
    longest: 12,
    lastActive: Date.now(),
    nextMilestone: 30,
    multiplier: 1.15,
    history: Array(30).fill(false).map((_, i) => i < 7 || Math.random() > 0.4)
  });
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimedReward, setClaimedReward] = useState<Quest | null>(null);
  const { playSound } = useTransactionSounds();

  useEffect(() => {
    if (isConnected) {
      loadQuests();
    }
  }, [isConnected, activeTab]);

  const loadQuests = async () => {
    const mockQuests: Quest[] = generateMockQuests(activeTab);
    setQuests(mockQuests);
  };

  const claimReward = async (quest: Quest) => {
    playSound('notification');
    setClaimedReward(quest);
    setShowClaimModal(true);
    
    setQuests(prev => prev.map(q => 
      q.id === quest.id ? { ...q, claimed: true } : q
    ));

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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400 bg-green-400/10';
      case 'medium': return 'text-blue-400 bg-blue-400/10';
      case 'hard': return 'text-purple-400 bg-purple-400/10';
      case 'legendary': return 'text-yellow-400 bg-yellow-400/10 animate-pulse';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'daily': return 'from-blue-500 to-cyan-500';
      case 'weekly': return 'from-purple-500 to-pink-500';
      case 'monthly': return 'from-yellow-500 to-orange-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getTimeRemaining = (expiresAt: number) => {
    const now = Date.now();
    const diff = expiresAt - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d remaining`;
    }
    return `${hours}h ${minutes}m`;
  };

  const completedCount = quests.filter(q => q.completed).length;
  const totalXP = quests.filter(q => q.completed).reduce((sum, q) => sum + (q.reward.xp || 0), 0);
  const readyToClaim = quests.filter(q => q.completed && !q.claimed).length;

  if (!isConnected) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#1A1A1F] border border-[#2A2A2F] rounded-xl p-8 text-center"
      >
        <Target className="w-16 h-16 text-[#FFD700] mx-auto mb-4 opacity-50" />
        <h3 className="text-xl font-bold text-white mb-2">Connect Wallet</h3>
        <p className="text-[#A0A0A5]">Connect your wallet to see daily quests</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Streak Counter - Enhanced */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-xl p-6 relative overflow-hidden"
      >
        {/* Animated Fire Particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-orange-500/40"
              initial={{ y: '100%', x: Math.random() * 100 + '%', opacity: 0 }}
              animate={{ 
                y: [100, -20],
                opacity: [0, 0.8, 0],
                scale: [0.5, 1, 0.3]
              }}
              transition={{ 
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
                ease: 'easeOut'
              }}
            />
          ))}
        </div>

        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-4">
            <motion.div 
              className="relative"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Flame className="w-14 h-14 text-orange-500" />
              <motion.div 
                className="absolute -top-2 -right-2 w-7 h-7 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg"
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                {streak.current}
              </motion.div>
            </motion.div>
            <div>
              <h3 className="text-2xl font-bold text-white">{streak.current} Day Streak! 🔥</h3>
              <p className="text-[#A0A0A5] text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                {streak.multiplier}x XP multiplier active
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className={`p-2 rounded-lg transition-colors ${showCalendar ? 'bg-orange-500/30 text-orange-400' : 'hover:bg-[#2A2A3F] text-[#A0A0A5]'}`}
              title="View streak calendar"
            >
              <Calendar className="w-5 h-5" />
            </button>
            <div className="text-right">
              <div className="text-sm text-[#A0A0A5] mb-1">Best Streak</div>
              <div className="text-2xl font-bold text-[#FFD700] flex items-center gap-1">
                <Trophy className="w-5 h-5" />
                {streak.longest} days
              </div>
            </div>
          </div>
        </div>

        {/* Streak Calendar */}
        <AnimatePresence>
          {showCalendar && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <StreakCalendar history={streak.history} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Streak Progress */}
        <div className="space-y-2 mt-4 relative z-10">
          <div className="flex justify-between items-center text-sm">
            <span className="text-[#A0A0A5]">Next Milestone: {streak.nextMilestone} days</span>
            <span className="text-white font-bold">{streak.current}/{streak.nextMilestone}</span>
          </div>
          <div className="w-full bg-[#2A2A2F] rounded-full h-3 overflow-hidden">
            <motion.div 
              className="bg-gradient-to-r from-orange-500 to-red-500 h-3 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(streak.current / streak.nextMilestone) * 100}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between text-xs text-[#A0A0A5]">
            <span className="text-green-400">✓ 7 days: 1.15x</span>
            <span>⏳ 30 days: 1.5x</span>
            <span className="text-[#606065]">🔒 90 days: 2x</span>
          </div>
        </div>
      </motion.div>

      {/* Quest Tabs - Enhanced */}
      <div className="flex gap-2 border-b border-[#2A2A2F]">
        {(['daily', 'weekly', 'monthly'] as const).map((tab) => {
          const count = quests.filter(q => q.type === tab && q.completed && !q.claimed).length;
          return (
            <motion.button
              key={tab}
              onClick={() => setActiveTab(tab)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={`relative px-6 py-3 font-semibold capitalize transition-all ${
                activeTab === tab
                  ? 'text-[#FFD700]'
                  : 'text-[#A0A0A5] hover:text-white'
              }`}
            >
              {tab}
              {count > 0 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-[#FFD700] to-[#FFA500] rounded-full text-[10px] font-bold text-black flex items-center justify-center"
                >
                  {count}
                </motion.span>
              )}
              {activeTab === tab && (
                <motion.div
                  layoutId="questTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#FFD700] to-[#FFA500]"
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Quests Grid - Enhanced */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.1 } }
        }}
      >
        <AnimatePresence mode="popLayout">
          {quests.filter(q => q.type === activeTab).map((quest, index) => (
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
      </motion.div>

      {/* Daily Summary - Enhanced with Progress Rings */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-[#1A1A1F] border border-[#2A2A2F] rounded-xl p-6"
      >
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#50C878]" />
          Today&apos;s Progress
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard 
            icon={<ProgressRing progress={(completedCount / Math.max(quests.length, 1)) * 100} color="#50C878" />} 
            label="Completed" 
            value={`${completedCount}/${quests.length}`} 
            color="text-[#50C878]"
            isRing 
          />
          <StatCard 
            icon={<Gift className="w-8 h-8" />} 
            label="Rewards Ready" 
            value={readyToClaim}
            color="text-[#FFD700]"
            pulse={readyToClaim > 0}
          />
          <StatCard 
            icon={<Star className="w-8 h-8" />} 
            label="Total XP" 
            value={`+${totalXP}`} 
            color="text-[#9333EA]" 
          />
          <StatCard 
            icon={<Flame className="w-8 h-8" />} 
            label="Streak Bonus" 
            value={`${((streak.multiplier - 1) * 100).toFixed(0)}%`} 
            color="text-orange-500" 
          />
        </div>
      </motion.div>

      {/* Claim Modal */}
      <AnimatePresence>
        {showClaimModal && claimedReward && (
          <ClaimRewardModal reward={claimedReward} onClose={() => setShowClaimModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// Trophy icon for streak display
function Trophy({ className }: { className?: string }) {
  return <Award className={className} />;
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
  getDifficultyColor: (difficulty: string) => string;
  getTypeColor: (type: string) => string;
  getTimeRemaining: (expiresAt: number) => string;
}) {
  const progress = Math.min((quest.progress / quest.target) * 100, 100);
  const isLocked = quest.progress === 0 && quest.target > 10;

  return (
    <div className={`bg-[#1A1A1F] border-2 ${quest.completed ? 'border-[#50C878]' : 'border-[#2A2A2F]'} rounded-xl p-5 transition-all hover:border-[#FFD700]/50 ${isLocked ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 bg-linear-to-br ${getTypeColor(quest.type)} rounded-lg flex items-center justify-center text-2xl`}>
            {quest.icon}
          </div>
          <div>
            <h4 className="text-lg font-bold text-white mb-1">{quest.title}</h4>
            <p className="text-sm text-[#A0A0A5]">{quest.description}</p>
          </div>
        </div>
        {isLocked && <Lock className="w-5 h-5 text-[#A0A0A5]" />}
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2 text-sm">
          <span className="text-[#A0A0A5]">Progress</span>
          <span className="font-bold text-white">{quest.progress}/{quest.target}</span>
        </div>
        <div className="w-full bg-[#2A2A2F] rounded-full h-2">
          <div 
            className={`bg-linear-to-r ${quest.completed ? 'from-[#50C878] to-[#50C878]' : 'from-[#3B82F6] to-[#9333EA]'} h-2 rounded-full transition-all`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Rewards */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        {quest.reward.vfide && (
          <div className="flex items-center gap-1.5 bg-[#FFD700]/10 px-3 py-1.5 rounded-lg">
            <Gift className="w-4 h-4 text-[#FFD700]" />
            <span className="text-sm font-bold text-[#FFD700]">{quest.reward.vfide} VFIDE</span>
          </div>
        )}
        {quest.reward.xp && (
          <div className="flex items-center gap-1.5 bg-[#9333EA]/10 px-3 py-1.5 rounded-lg">
            <Star className="w-4 h-4 text-[#9333EA]" />
            <span className="text-sm font-bold text-[#9333EA]">{quest.reward.xp} XP</span>
          </div>
        )}
        {quest.reward.badge && (
          <div className="flex items-center gap-1.5 bg-[#3B82F6]/10 px-3 py-1.5 rounded-lg">
            <Award className="w-4 h-4 text-[#3B82F6]" />
            <span className="text-sm font-bold text-[#3B82F6]">{quest.reward.badge}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold px-2 py-1 rounded ${getDifficultyColor(quest.difficulty)}`}>
            {quest.difficulty.toUpperCase()}
          </span>
          <span className="text-xs text-[#A0A0A5] flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {getTimeRemaining(quest.expiresAt)}
          </span>
        </div>
        
        {quest.completed && !quest.claimed ? (
          <button 
            onClick={() => onClaim(quest)}
            className="px-4 py-2 bg-linear-to-r from-[#FFD700] to-[#FFA500] text-[#0A0A0B] rounded-lg font-bold text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <Gift className="w-4 h-4" />
            Claim
          </button>
        ) : quest.claimed ? (
          <div className="text-[#50C878] text-sm font-bold flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" />
            Claimed
          </div>
        ) : (
          <div className="text-[#A0A0A5] text-sm">In Progress</div>
        )}
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-[#0A0A0B] rounded-lg p-4">
      <div className={`${color} mb-2`}>
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-5 h-5' })}
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-xs text-[#A0A0A5]">{label}</div>
    </div>
  );
}

// Claim Reward Modal
function ClaimRewardModal({ reward, onClose }: { reward: Quest; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1A1A1F] border-2 border-[#FFD700] rounded-xl p-8 text-center max-w-md animate-in zoom-in-95">
        <div className="text-6xl mb-4 animate-bounce">🎉</div>
        <h2 className="text-3xl font-bold text-white mb-2">Quest Complete!</h2>
        <p className="text-[#A0A0A5] mb-6">{reward.title}</p>
        
        <div className="space-y-3 mb-6">
          {reward.reward.vfide && (
            <div className="bg-[#FFD700]/10 border border-[#FFD700] rounded-lg p-4">
              <div className="text-4xl font-bold text-[#FFD700] mb-1">+{reward.reward.vfide} VFIDE</div>
              <div className="text-sm text-[#A0A0A5]">Added to your balance</div>
            </div>
          )}
          {reward.reward.xp && (
            <div className="bg-[#9333EA]/10 border border-[#9333EA] rounded-lg p-4">
              <div className="text-4xl font-bold text-[#9333EA] mb-1">+{reward.reward.xp} XP</div>
              <div className="text-sm text-[#A0A0A5]">Experience gained</div>
            </div>
          )}
        </div>

        <button 
          onClick={onClose}
          className="w-full px-6 py-3 bg-linear-to-r from-[#FFD700] to-[#FFA500] text-[#0A0A0B] rounded-lg font-bold hover:opacity-90 transition-opacity"
        >
          Awesome!
        </button>
      </div>
    </div>
  );
}

// Generate Mock Quests
function generateMockQuests(type: 'daily' | 'weekly' | 'monthly'): Quest[] {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  
  if (type === 'daily') {
    return [
      {
        id: 'd1',
        type: 'daily',
        title: 'Daily Login',
        description: 'Log in to VFIDE today',
        progress: 1,
        target: 1,
        reward: { vfide: 15, xp: 50 },
        completed: true,
        claimed: false,
        expiresAt: now + day,
        difficulty: 'easy',
        icon: '🌅'
      },
      {
        id: 'd2',
        type: 'daily',
        title: 'First Transaction',
        description: 'Make at least 1 transaction',
        progress: 0,
        target: 1,
        reward: { vfide: 25, xp: 100 },
        completed: false,
        claimed: false,
        expiresAt: now + day,
        difficulty: 'easy',
        icon: '💸'
      },
      {
        id: 'd3',
        type: 'daily',
        title: 'Social Butterfly',
        description: 'Send 3 messages',
        progress: 2,
        target: 3,
        reward: { xp: 75 },
        completed: false,
        claimed: false,
        expiresAt: now + day,
        difficulty: 'easy',
        icon: '💬'
      },
      {
        id: 'd4',
        type: 'daily',
        title: 'Vote on Proposal',
        description: 'Cast 1 governance vote',
        progress: 0,
        target: 1,
        reward: { vfide: 30, xp: 150 },
        completed: false,
        claimed: false,
        expiresAt: now + day,
        difficulty: 'medium',
        icon: '🗳️'
      }
    ];
  }
  
  if (type === 'weekly') {
    return [
      {
        id: 'w1',
        type: 'weekly',
        title: 'Transaction Master',
        description: 'Complete 20 transactions',
        progress: 12,
        target: 20,
        reward: { vfide: 200, xp: 500 },
        completed: false,
        claimed: false,
        expiresAt: now + 5 * day,
        difficulty: 'medium',
        icon: '💰'
      },
      {
        id: 'w2',
        type: 'weekly',
        title: 'Friend Collector',
        description: 'Add 5 new friends',
        progress: 3,
        target: 5,
        reward: { vfide: 150, xp: 400 },
        completed: false,
        claimed: false,
        expiresAt: now + 5 * day,
        difficulty: 'medium',
        icon: '👥'
      },
      {
        id: 'w3',
        type: 'weekly',
        title: 'Governance Participant',
        description: 'Vote on 5 proposals',
        progress: 5,
        target: 5,
        reward: { vfide: 250, xp: 600, badge: 'Active Voter' },
        completed: true,
        claimed: false,
        expiresAt: now + 5 * day,
        difficulty: 'hard',
        icon: '⚖️'
      }
    ];
  }
  
  // Monthly quests
  return [
    {
      id: 'm1',
      type: 'monthly',
      title: 'Power User',
      description: 'Complete 100 transactions',
      progress: 67,
      target: 100,
      reward: { vfide: 1000, xp: 2500, badge: 'Power User' },
      completed: false,
      claimed: false,
      expiresAt: now + 20 * day,
      difficulty: 'hard',
      icon: '⚡'
    },
    {
      id: 'm2',
      type: 'monthly',
      title: 'ProofScore Elite',
      description: 'Reach 8000 ProofScore',
      progress: 7850,
      target: 8000,
      reward: { vfide: 1500, xp: 3000, badge: 'Elite Member' },
      completed: false,
      claimed: false,
      expiresAt: now + 20 * day,
      difficulty: 'legendary',
      icon: '👑'
    },
    {
      id: 'm3',
      type: 'monthly',
      title: 'Community Leader',
      description: 'Help 10 users resolve issues',
      progress: 4,
      target: 10,
      reward: { vfide: 2000, xp: 5000, badge: 'Community Helper' },
      completed: false,
      claimed: false,
      expiresAt: now + 20 * day,
      difficulty: 'legendary',
      icon: '🤝'
    }
  ];
}
