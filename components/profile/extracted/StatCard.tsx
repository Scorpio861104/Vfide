'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function StatCard({ label, value, icon, color = 'blue', animated = true }: StatCardProps) {
  const colorClasses: Record<string, string> = {
    blue: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
    green: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
    purple: 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
    orange: 'from-orange-500/20 to-yellow-500/20 border-orange-500/30',
    gold: 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30',
  };

  const iconColors: Record<string, string> = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    purple: 'text-purple-400',
    orange: 'text-orange-400',
    gold: 'text-yellow-400',
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -2 }}
      className={`bg-gradient-to-br ${colorClasses[color] || colorClasses.blue} border rounded-xl p-4 transition-all`}
    >
      <div className="flex items-center gap-3">
        <motion.div
          className="text-3xl"
          whileHover={{ scale: 1.2, rotate: [0, -10, 10, 0] }}
          transition={{ duration: 0.3 }}
        >
          {icon}
        </motion.div>
        <div>
          <p className={`text-2xl font-bold ${iconColors[color] || 'text-white'}`}>
            {typeof value === 'number' && animated ? (
              <AnimatedCounter value={value} />
            ) : (
              value
            )}
          </p>
          <p className="text-sm text-zinc-400">{label}</p>
        </div>
      </div>
    </motion.div>
  );
};
