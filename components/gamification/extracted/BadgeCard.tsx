'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function BadgeCard({ badge }: BadgeCardProps) {
  const rarityColors = {
    common: 'border-gray-400 bg-gray-50 dark:bg-gray-700',
    uncommon: 'border-green-400 bg-green-50 dark:bg-green-900',
    rare: 'border-blue-400 bg-blue-50 dark:bg-blue-900',
    epic: 'border-purple-400 bg-purple-50 dark:bg-purple-900',
    legendary: 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900',
  };

  return (
    <div className={`rounded-lg p-4 border-2 ${rarityColors[badge.rarity]} text-center`}>
      <div className="text-4xl mb-2">{badge.icon}</div>
      <h4 className="font-bold text-gray-900 dark:text-white text-sm md:text-base mb-1">
        {badge.name}
      </h4>
      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{badge.description}</p>
      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">
        {badge.rarity}
      </p>
    </div>
  );
}
