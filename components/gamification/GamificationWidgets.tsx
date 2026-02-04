'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Zap, Award } from 'lucide-react';
import { useGamification, ACHIEVEMENTS, type AchievementId } from '@/lib/gamification';

interface UserStatsWidgetProps {
  userAddress: string;
  compact?: boolean;
}

/**
 * Display user level, XP, and progress bar
 */
export function UserStatsWidget({ userAddress, compact = false }: UserStatsWidgetProps) {
  const { progress } = useGamification(userAddress);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || !progress) {
    return null;
  }

  const xpProgress = progress.xpToNextLevel > 0 
    ? ((progress.xp - (progress.level === 1 ? 0 : progress.xp - progress.xpToNextLevel)) / 
       (progress.xp - (progress.xp - progress.xpToNextLevel) + progress.xpToNextLevel)) * 100
    : 100;

  if (compact) {
    return (
      <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2">
        <div className="flex items-center gap-1">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-bold text-zinc-100">Lv.{progress.level}</span>
        </div>
        <div className="h-4 w-16 bg-zinc-950 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${xpProgress}%` }}
            className="h-full bg-gradient-to-r from-cyan-400 to-violet-400"
          />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-700 rounded-xl p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-zinc-950" />
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-100">Level {progress.level}</div>
            <div className="text-xs text-zinc-400">{progress.xp.toLocaleString()} XP</div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-zinc-400 mb-1">Next Level</div>
          <div className="text-sm font-semibold text-cyan-400">
            {progress.xpToNextLevel > 0 ? `${progress.xpToNextLevel} XP` : 'Max'}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative h-3 bg-zinc-950 rounded-full overflow-hidden mb-4">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${xpProgress}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-400 to-violet-400"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-zinc-100 drop-shadow-lg">
            {Math.round(xpProgress)}%
          </span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-zinc-950 rounded-lg p-2 text-center">
          <div className="text-xs text-zinc-400 mb-1">Achievements</div>
          <div className="text-lg font-bold text-amber-400">{progress.achievements.length}</div>
        </div>
        <div className="bg-zinc-950 rounded-lg p-2 text-center">
          <div className="text-xs text-zinc-400 mb-1">Streak</div>
          <div className="text-lg font-bold text-orange-400">{progress.stats.currentStreak}🔥</div>
        </div>
        <div className="bg-zinc-950 rounded-lg p-2 text-center">
          <div className="text-xs text-zinc-400 mb-1">Friends</div>
          <div className="text-lg font-bold text-violet-400">{progress.stats.friendsAdded}</div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Display recent achievements with animations
 */
export function AchievementsList({ userAddress }: { userAddress: string }) {
  const { progress } = useGamification(userAddress);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || !progress) {
    return null;
  }

  const unlockedAchievements = progress.achievements.map(id => ACHIEVEMENTS[id]);
  const lockedAchievements = Object.values(ACHIEVEMENTS)
    .filter(a => !progress.achievements.includes(a.id));

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'from-amber-400 to-orange-500';
      case 'epic': return 'from-violet-400 to-violet-600';
      case 'rare': return 'from-cyan-400 to-[#0891B2]';
      default: return 'from-[#6B6B78] to-[#4A4A58]';
    }
  };

  return (
    <div className="space-y-4">
      {/* Unlocked Achievements */}
      {unlockedAchievements.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-zinc-100 mb-3 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            Unlocked ({unlockedAchievements.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {unlockedAchievements.map((achievement, index) => (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className={`relative bg-gradient-to-br ${getRarityColor(achievement.rarity)} p-[2px] rounded-xl overflow-hidden`}
              >
                <div className="bg-zinc-900 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{achievement.icon}</div>
                    <div className="flex-1">
                      <h4 className="font-bold text-zinc-100 mb-1">{achievement.name}</h4>
                      <p className="text-xs text-zinc-400 mb-2">{achievement.description}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-cyan-400 font-semibold">+{achievement.xp} XP</span>
                        <span className="text-xs text-zinc-500">•</span>
                        <span className="text-xs text-amber-400 capitalize">{achievement.rarity}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Locked Achievements */}
      {lockedAchievements.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-zinc-500 mb-3 flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Locked ({lockedAchievements.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {lockedAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 opacity-60"
              >
                <div className="flex items-start gap-3">
                  <div className="text-3xl grayscale">{achievement.icon}</div>
                  <div className="flex-1">
                    <h4 className="font-bold text-zinc-500 mb-1">{achievement.name}</h4>
                    <p className="text-xs text-zinc-600 mb-2">{achievement.description}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-600">{achievement.requirement}</span>
                      <span className="text-xs text-zinc-700">•</span>
                      <span className="text-xs text-zinc-600">+{achievement.xp} XP</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Toast notification for achievement unlocks
 */
export function AchievementUnlockNotification({ 
  achievementId, 
  onClose 
}: { 
  achievementId: AchievementId; 
  onClose: () => void;
}) {
  const achievement = ACHIEVEMENTS[achievementId];

  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 50, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.9 }}
      className="fixed top-20 right-4 z-50 max-w-sm"
    >
      <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-[2px] rounded-xl">
        <div className="bg-zinc-900 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="text-4xl animate-bounce">{achievement.icon}</div>
            <div className="flex-1">
              <div className="text-xs font-bold text-amber-400 mb-1">ACHIEVEMENT UNLOCKED!</div>
              <h4 className="font-bold text-zinc-100 mb-1">{achievement.name}</h4>
              <p className="text-xs text-zinc-400 mb-2">{achievement.description}</p>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-bold text-cyan-400">+{achievement.xp} XP</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
