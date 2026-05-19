'use client';

export const dynamic = 'force-dynamic';

import { motion } from 'framer-motion';
import { Activity, Shield, Sliders, Star } from 'lucide-react';
import { useAccount } from 'wagmi';

import { Footer } from '@/components/layout/Footer';
import { ProofScoreSimulator } from '@/components/proofscore/ProofScoreSimulator';
import { Numeric } from '@/components/ui/Numeric';
import { ProofScoreRing } from '@/components/ui/ProofScoreRing';
import { useProofScore } from '@/hooks/useProofScore';

const TIERS = [
  { range: '0–3,499',      label: 'Risky',      note: 'Start building trust through activity and secure behaviour.',                               color: 'border-red-500/30    bg-red-500/5',     dot: 'bg-red-400'    },
  { range: '3,500–4,999',  label: 'Low Trust',  note: 'Consistent usage helps you cross into the Neutral band.',                                  color: 'border-orange-500/30 bg-orange-500/5',  dot: 'bg-orange-400' },
  { range: '5,000–5,399',  label: 'Neutral',    note: 'New-user default. Governance access opens just above.',                                    color: 'border-yellow-500/30 bg-yellow-500/5',  dot: 'bg-yellow-400' },
  { range: '5,400–5,599',  label: 'Governance', note: 'Unlocks on-chain voting for proposals.',                                                   color: 'border-blue-500/30   bg-blue-500/5',    dot: 'bg-blue-400'   },
  { range: '5,600–6,999',  label: 'Trusted',    note: 'Merchant registration and lower transfer fees available.',                                 color: 'border-emerald-500/30 bg-emerald-500/5', dot: 'bg-emerald-400' },
  { range: '7,000–7,999',  label: 'Council',    note: 'Eligible for council election. Unlocks ability to endorse others (≥7,000) and mentor (≥7,200).', color: 'border-purple-500/30 bg-purple-500/5',  dot: 'bg-purple-400' },
  { range: '8,000–10,000', label: 'Elite',      note: 'Minimum fee (0.25%). Highest reputation tier in the protocol.',                           color: 'border-amber-500/30  bg-amber-500/5',   dot: 'bg-amber-400'  },
];

function getTierLabel(score: number): string {
  if (score >= 8000) return 'Elite';
  if (score >= 7000) return 'Council';
  if (score >= 5600) return 'Trusted';
  if (score >= 5400) return 'Governance';
  if (score >= 5000) return 'Neutral';
  if (score >= 3500) return 'Low Trust';
  return 'Risky';
}

export default function ProofScorePage() {
  const { isConnected } = useAccount();
  const { score, burnFee, isLoading } = useProofScore();

  return (
    <div className="relative min-h-screen bg-zinc-950 md:pt-[3.5rem]">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
        <div className="grid-pattern absolute inset-0 opacity-[0.03]" />
      </div>

      <div className="relative container mx-auto max-w-5xl px-4 py-8 space-y-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-3">
            <span className="badge-live"><span className="badge-live-dot" />On-Chain Reputation</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-cyan-400 via-amber-400 to-violet-400 bg-clip-text text-transparent">
              ProofScore
            </span>
          </h1>
          <p className="text-white/50 text-lg">Your on-chain reputation. Understand what affects it, simulate any score, and learn how to improve.</p>
        </motion.div>

        {/* Live score card (wallet connected) */}
        {isConnected && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="glass-card-premium p-6 flex flex-col sm:flex-row items-center gap-6">
            <div className="flex-shrink-0">
              {isLoading ? (
                <div className="w-32 h-32 rounded-full bg-white/5 animate-pulse" />
              ) : (
                <ProofScoreRing score={score} size="lg" />
              )}
            </div>
            <div className="text-center sm:text-left flex-1">
              <div className="text-sm text-cyan-300 font-semibold uppercase tracking-widest mb-1 flex items-center gap-2">
                <Activity size={14} />Your Live Score
              </div>
              <div className="mb-1">
                <Numeric value={isLoading ? null : score} format="score" size="5xl" weight={700} className="text-white" flush />
              </div>
              <div className="text-lg font-bold text-cyan-400 mb-3">{isLoading ? '—' : getTierLabel(score)}</div>
              <div className="flex items-center gap-4 text-sm text-white/50">
                <span className="flex items-center gap-1">
                  <Star size={12} className="text-amber-400" />Transfer fee:{' '}
                  <Numeric value={isLoading ? null : burnFee} format="percent" precision={2} size="sm" weight={600} tone="positive" />
                </span>
              </div>
            </div>
            <div className="hidden sm:flex flex-col gap-2 text-right">
              <div className="analytics-card px-4 py-2 text-right">
                <div className="text-xs text-white/40 mb-1">Tier</div>
                <div className="text-base font-bold text-violet-400">{isLoading ? '—' : getTierLabel(score)}</div>
              </div>
              <div className="analytics-card px-4 py-2 text-right">
                <div className="text-xs text-white/40 mb-1">Status</div>
                <div className="text-base font-bold text-emerald-400">Active</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tier reference table */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="flex items-center gap-2 mb-4">
            <Shield size={18} className="text-cyan-400" />
            <h2 className="text-xl font-bold text-white">Tier Overview</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {TIERS.map((tier, i) => (
              <motion.div key={tier.range}
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + i * 0.04 }}
                className={`rounded-2xl border p-4 transition-all hover:scale-[1.02] ${tier.color}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${tier.dot}`} />
                  <div className="text-xs text-white/40 font-mono">{tier.range}</div>
                </div>
                <h3 className="text-base font-bold text-white">{tier.label}</h3>
                <p className="text-xs text-white/50 mt-1 leading-relaxed">{tier.note}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Simulator + tips */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center gap-2 mb-4">
            <Sliders size={18} className="text-violet-400" />
            <h2 className="text-xl font-bold text-white">Simulator &amp; Tips</h2>
          </div>
          <div className="glass-card-premium p-0 overflow-hidden">
            <ProofScoreSimulator />
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
