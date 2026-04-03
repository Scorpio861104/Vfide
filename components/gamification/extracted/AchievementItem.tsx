'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function AchievementItem({ achievement }: AchievementItemProps) {
  const progress = (achievement.progress / achievement.target) * 100;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-5 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-3xl md:text-4xl shrink-0">{achievement.icon}</span>
          <div className="min-w-0 flex-1">
            <h4 className="text-base md:text-lg font-bold text-gray-900 dark:text-white">
              {achievement.title}
            </h4>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
              {achievement.description}
            </p>
          </div>
        </div>
        {achievement.completed && (
          <span className="text-2xl ml-2 shrink-0">✅</span>
        )}
      </div>

      {!achievement.completed && (
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {achievement.progress} / {achievement.target}
            </span>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <p className="text-xs md:text-sm font-medium text-green-600 dark:text-green-400">
        Reward: {achievement.reward}
      </p>
    </div>
  );
}
