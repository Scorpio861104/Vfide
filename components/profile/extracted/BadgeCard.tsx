'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function BadgeCard({ badge }: BadgeCardProps) {
  const rarityStyles = {
    legendary: 'from-yellow-500/20 to-orange-500/20 border-yellow-500/50 shadow-yellow-500/20',
    epic: 'from-purple-500/20 to-pink-500/20 border-purple-500/50 shadow-purple-500/20',
    rare: 'from-blue-500/20 to-cyan-500/20 border-blue-500/50 shadow-blue-500/20',
    common: 'from-gray-500/10 to-gray-600/10 border-gray-500/30'
  };

  const rarityTextColors = {
    legendary: 'text-yellow-400',
    epic: 'text-purple-400',
    rare: 'text-blue-400',
    common: 'text-gray-400'
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.03, y: -5 }}
      className={`bg-gradient-to-br ${rarityStyles[badge.rarity]} border rounded-xl p-5 shadow-lg cursor-pointer transition-all`}
    >
      <div className="text-center">
        <motion.div 
          className="text-5xl mb-3"
          whileHover={{ rotate: [0, -10, 10, 0], scale: 1.2 }}
          transition={{ duration: 0.3 }}
        >
          {badge.icon}
        </motion.div>
        <h3 className="font-bold text-white text-lg mb-1">{badge.name}</h3>
        <p className="text-sm text-zinc-400 mb-3">{badge.description}</p>
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${rarityTextColors[badge.rarity]} bg-black/20`}>
          {formatRarityLabel(badge.rarity)}
        </span>
        <p className="text-xs text-zinc-500 mt-2">
          Earned {formatTimeAgo(badge.earnedDate)}
        </p>
      </div>
    </motion.div>
  );
};
