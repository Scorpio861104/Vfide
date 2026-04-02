import { Crown, Medal, ChevronUp, ChevronDown, Minus } from 'lucide-react';
import { motion } from 'framer-motion';

export const tierColors: Record<string, { gradient: string; text: string; glow: string; bg: string; border: string }> = {
  'CHAMPION': { gradient: 'from-amber-400 to-orange-500', text: 'text-amber-400', glow: 'shadow-amber-400/30', bg: 'bg-amber-400/20', border: 'border-amber-400/30' },
  'GUARDIAN': { gradient: 'from-[#C0C0C0] to-[#A0A0A0]', text: 'text-zinc-400', glow: 'shadow-zinc-400/30', bg: 'bg-zinc-400/20', border: 'border-zinc-400/30' },
  'DELEGATE': { gradient: 'from-[#CD7F32] to-[#8B4513]', text: 'text-amber-600', glow: 'shadow-amber-600/30', bg: 'bg-amber-600/20', border: 'border-amber-600/30' },
  'ADVOCATE': { gradient: 'from-cyan-400 to-cyan-600', text: 'text-cyan-400', glow: 'shadow-cyan-400/30', bg: 'bg-cyan-400/20', border: 'border-cyan-400/30' },
  'MERCHANT': { gradient: 'from-emerald-500 to-[#3DA55D]', text: 'text-emerald-500', glow: 'shadow-emerald-500/30', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' },
  'NEUTRAL': { gradient: 'from-zinc-400 to-zinc-500', text: 'text-zinc-400', glow: 'shadow-zinc-400/30', bg: 'bg-zinc-400/20', border: 'border-zinc-400/30' },
};

export function getRankIcon(rank: number) {
  if (rank === 1) return <Crown className="w-6 h-6 text-amber-400" />;
  if (rank === 2) return <Medal className="w-6 h-6 text-zinc-400" />;
  if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
  return <span className="w-6 h-6 flex items-center justify-center font-bold text-zinc-400">{rank}</span>;
}

export function getChangeIndicator(change: number) {
  if (change > 0) {
    return (
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1 text-emerald-500 text-sm font-bold">
        <ChevronUp size={16} strokeWidth={3} />
        <span>{change}</span>
      </motion.div>
    );
  }
  if (change < 0) {
    return (
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1 text-red-500 text-sm font-bold">
        <ChevronDown size={16} strokeWidth={3} />
        <span>{Math.abs(change)}</span>
      </motion.div>
    );
  }
  return <Minus className="w-4 h-4 text-zinc-500" />;
}
