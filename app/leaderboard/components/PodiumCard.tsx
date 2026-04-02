'use client';

import { motion } from 'framer-motion';
import { Crown, Medal, Star } from 'lucide-react';

import { GlassCard } from '@/components/ui/GlassCard';
import { type LeaderboardEntry } from '@/hooks/useLeaderboard';

export function _PodiumCard({ 
  entry, 
  place, 
  delay 
}: { 
  entry: LeaderboardEntry
  place: 1 | 2 | 3
  delay: number 
}) {
  const heights = { 1: 'h-52', 2: 'h-44', 3: 'h-40' }
  const colors = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' }
  const Icon = place === 1 ? Crown : Medal

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 100 }}
      className={`relative ${place === 1 ? 'order-2 -mt-4' : place === 2 ? 'order-1 mt-8' : 'order-3 mt-8'}`}
    >
      <GlassCard 
        className={`p-6 text-center border-2 ${heights[place]}`}
        glow={colors[place]}
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: delay + 0.2, type: "spring" }}
          className="absolute -top-6 left-1/2 -translate-x-1/2"
        >
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ 
              background: `linear-gradient(135deg, ${colors[place]}40, ${colors[place]}20)`,
              boxShadow: `0 0 30px ${colors[place]}40`
            }}
          >
            <Icon className="w-6 h-6" style={{ color: colors[place] }} />
          </div>
        </motion.div>

        <div 
          className="text-4xl font-black mt-4 mb-2"
          style={{ color: colors[place] }}
        >
          {place === 1 ? '1st' : place === 2 ? '2nd' : '3rd'}
        </div>

        <div className="font-mono text-sm text-zinc-400 mb-3">
          {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
        </div>

        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: delay + 0.3, type: "spring" as const }}
          className="text-2xl font-bold mb-2"
          style={{ color: colors[place] }}
        >
          {entry.score.toLocaleString()}
        </motion.div>

        <div className="flex items-center justify-center gap-1 text-xs text-zinc-400">
          <Star className="w-3 h-3" style={{ color: colors[place] }} />
          <span>{entry.badges} badges</span>
        </div>
      </GlassCard>
    </motion.div>
  )
}
