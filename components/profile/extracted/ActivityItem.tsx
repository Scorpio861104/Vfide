'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function ActivityItem({ activity, index = 0 }: ActivityItemProps) {
  const getActivityIcon = (type: string): string => {
    const icons: Record<string, string> = {
      vote: '🗳️',
      transaction: '💰',
      badge: '🏆',
      proposal: '📝',
      merchant: '🏪',
    };
    return icons[type] || '📌';
  };

  const getActivityColor = (type: string): string => {
    const colors: Record<string, string> = {
      vote: 'from-purple-500/20 to-purple-600/20',
      transaction: 'from-green-500/20 to-green-600/20',
      badge: 'from-yellow-500/20 to-yellow-600/20',
      proposal: 'from-blue-500/20 to-blue-600/20',
      merchant: 'from-orange-500/20 to-orange-600/20',
    };
    return colors[type] || 'from-gray-500/20 to-gray-600/20';
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ x: 5 }}
      className={`flex items-center gap-3 p-4 bg-gradient-to-r ${getActivityColor(activity.type)} rounded-xl transition-all cursor-pointer`}
    >
      <motion.div 
        className="text-2xl"
        whileHover={{ scale: 1.2 }}
      >
        {getActivityIcon(activity.type)}
      </motion.div>
      <div className="flex-1">
        <p className="text-sm font-medium text-white">{activity.title}</p>
        <p className="text-xs text-zinc-400">{formatTimeAgo(activity.timestamp)}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-zinc-400" />
    </motion.div>
  );
};
