'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <motion.div 
      className={`rounded-lg p-4 md:p-6 bg-gradient-to-br ${color} text-white shadow-lg`}
      whileHover={{ scale: 1.03, y: -2 }}
      transition={{ type: 'spring', stiffness: 400 }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs md:text-sm font-medium opacity-90 mb-1 md:mb-2">{label}</p>
          <p className="text-2xl md:text-3xl font-bold">{value}</p>
        </div>
        <motion.span 
          className="text-3xl md:text-4xl opacity-80"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
        >
          {icon}
        </motion.span>
      </div>
    </motion.div>
  );
}
