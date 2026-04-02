'use client';

import { motion } from 'framer-motion';
import { Award, Shield, Sparkles } from 'lucide-react';

import { type LeaderboardEntry } from '@/hooks/useLeaderboard';
import { getChangeIndicator, getRankIcon, tierColors } from './leaderboard-config';

export function _LeaderboardRow({ entry, index }: { entry: LeaderboardEntry; index: number }) {
  const tierStyle = tierColors[entry.tier] ?? tierColors['NEUTRAL']
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
      className={`
        border-b border-white/5 last:border-0
        ${entry.rank <= 3 ? 'bg-gradient-to-r from-amber-400/5 to-transparent' : ''}
      `}
    >
      <div className="md:hidden flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8">{getRankIcon(entry.rank)}</div>
          <div>
            <div className="font-mono text-sm text-zinc-100">
              {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
            </div>
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${tierStyle?.text ?? 'text-cyan-400'}`}>
              {entry.tier}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-cyan-400">{entry.score.toLocaleString()}</div>
          {getChangeIndicator(entry.change)}
        </div>
      </div>

      <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 items-center">
        <div className="col-span-1 flex items-center gap-2">
          {getRankIcon(entry.rank)}
        </div>
        
        <div className="col-span-4 flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${tierColors[entry.tier]?.gradient?.split(' ')[0]?.replace('from-[', '')?.replace(']', '') ?? '#00F0FF'}20, transparent)` }}
          >
            <Shield className={`w-5 h-5 ${tierStyle?.text ?? ''}`} />
          </div>
          <span className="font-mono text-zinc-100">
            {entry.address.slice(0, 8)}...{entry.address.slice(-6)}
          </span>
        </div>
        
        <div className="col-span-2 text-center">
          <span className="text-xl font-bold text-cyan-400">{entry.score.toLocaleString()}</span>
        </div>
        
        <div className="col-span-2 text-center">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${tierStyle?.text ?? ''}`}
            style={{ background: `linear-gradient(135deg, ${tierColors[entry.tier]?.gradient?.split(' ')[0]?.replace('from-[', '')?.replace(']', '') ?? '#00F0FF'}20, transparent)` }}
          >
            <Sparkles size={12} />
            {entry.tier}
          </span>
        </div>
        
        <div className="col-span-2 flex items-center justify-center gap-2">
          <Award className="w-4 h-4 text-zinc-400" />
          <span className="text-zinc-100 font-medium">{entry.badges}</span>
        </div>
        
        <div className="col-span-1 flex justify-center">
          {getChangeIndicator(entry.change)}
        </div>
      </div>
    </motion.div>
  )
}
