import { Crown, Medal, ChevronUp, ChevronDown, Minus } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Tier color config aligned with the 7-tier ProofScore system per VFIDE Manual v1.0.
 * Tiers: Elite(≥8000) / Council(≥7000) / Trusted(≥5600) / Governance(≥5400)
 *        / Neutral(≥5000) / Low Trust(≥3500) / Risky(<3500)
 */
export const tierColors: Record<string, { gradient: string; text: string; glow: string; bg: string; border: string }> = {
  'ELITE':      { gradient: 'from-emerald-400 to-[#00CC6A]',   text: 'text-emerald-400',  glow: 'shadow-emerald-400/30',  bg: 'bg-emerald-400/20',  border: 'border-emerald-400/30' },
  'COUNCIL':    { gradient: 'from-violet-400 to-violet-600',   text: 'text-violet-400',   glow: 'shadow-violet-400/30',   bg: 'bg-violet-400/20',   border: 'border-violet-400/30' },
  'TRUSTED':    { gradient: 'from-emerald-500 to-green-600',   text: 'text-emerald-500',  glow: 'shadow-emerald-500/30',  bg: 'bg-emerald-500/20',  border: 'border-emerald-500/30' },
  'GOVERNANCE': { gradient: 'from-blue-400 to-blue-600',       text: 'text-blue-400',     glow: 'shadow-blue-400/30',     bg: 'bg-blue-400/20',     border: 'border-blue-400/30' },
  'NEUTRAL':    { gradient: 'from-yellow-400 to-amber-500',    text: 'text-yellow-400',   glow: 'shadow-yellow-400/30',   bg: 'bg-yellow-400/20',   border: 'border-yellow-400/30' },
  'LOW TRUST':  { gradient: 'from-orange-400 to-orange-600',   text: 'text-orange-400',   glow: 'shadow-orange-400/30',   bg: 'bg-orange-400/20',   border: 'border-orange-400/30' },
  'RISKY':      { gradient: 'from-red-400 to-red-600',         text: 'text-red-400',      glow: 'shadow-red-400/30',      bg: 'bg-red-400/20',      border: 'border-red-400/30' },
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
