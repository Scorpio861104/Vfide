'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  Banknote,
  ChevronRight,
  Gift,
  Lock,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  Vote,
  Zap,
} from 'lucide-react';

import { ProofScoreRing } from '@/components/ui/ProofScoreRing';

import { RecentActivitySection } from './RecentActivity';
import { GlassCard, QuickAction, containerVariants, ecosystemLoadout, itemVariants } from './shared';

export function OverviewTab({ proofscore, feeRate }: { proofscore: number; feeRate: number }) {
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
      <motion.div variants={itemVariants}>
        <GlassCard className="p-6" hover={false}>
          <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-white">
            <Zap className="text-amber-400" size={24} />
            Quick Actions
          </h2>
          <p className="mb-5 text-sm text-white/50">Jump straight into your most-used flows.</p>
          <div className="grid grid-cols-3 gap-4 md:grid-cols-6">
            <QuickAction icon={ArrowUpRight} label="Send" href="/pay" variant="primary" />
            <QuickAction icon={Shield} label="Vault" href="/vault" />
            <QuickAction icon={Lock} label="Escrow" href="/escrow" />
            <QuickAction icon={Banknote} label="Payroll" href="/payroll" />
            <QuickAction icon={Vote} label="Governance" href="/governance" />
            <QuickAction icon={Gift} label="Rewards" href="/rewards" />
          </div>
        </GlassCard>
      </motion.div>

      <motion.div variants={itemVariants}>
        <GlassCard className="p-6" hover={false}>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-xl font-bold text-white">
              <Sparkles className="text-cyan-300" size={22} />
              Ecosystem Loadout
            </h2>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300/80">Fully loaded</span>
          </div>
          <p className="mb-5 text-sm text-white/50">
            Every core system is online and ready—move between vaults, governance, escrow, and credit in a single flow.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {ecosystemLoadout.map((item) => (
              <Link key={item.label} href={item.href}>
                <div className="group h-full rounded-2xl border border-white/10 bg-white/5 p-4 transition-all hover:border-white/25 hover:bg-white/10">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-white/10 p-2 text-cyan-200 transition-colors group-hover:text-cyan-100">
                      <item.icon size={18} />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-white">{item.label}</div>
                      <div className="mt-1 text-xs text-white/50">{item.description}</div>
                    </div>
                    <ChevronRight className="mt-1 text-white/40 transition-transform group-hover:translate-x-1" size={16} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div variants={itemVariants}>
          <GlassCard className="p-6" hover={false}>
            <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-white">
              <TrendingUp className="text-cyan-400" size={24} />
              Your ProofScore
            </h2>
            <div className="flex flex-col items-center py-6">
              <ProofScoreRing score={proofscore} size="lg" />
              <div className="mt-6 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.5 }}
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-4 py-2"
                >
                  <span className="font-bold text-emerald-400">{feeRate.toFixed(2)}% transfer fee</span>
                </motion.div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <GlassCard className="p-6" hover={false}>
            <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-white">
              <Star className="text-amber-400" size={24} />
              Score Breakdown
            </h2>
            <div className="space-y-4">
              {[
                { label: 'Transaction Volume', value: 2500, max: 3000, color: 'cyan' },
                { label: 'Account Age', value: 1200, max: 2000, color: 'emerald' },
                { label: 'Badge Bonuses', value: 800, max: 1500, color: 'amber' },
                { label: 'Governance Participation', value: 500, max: 1000, color: 'purple' },
                { label: 'Community Endorsements', value: 300, max: 500, color: 'pink' },
              ].map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="space-y-2"
                >
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">{item.label}</span>
                    <span className="font-medium text-white">
                      {item.value.toLocaleString()} / {item.max.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.value / item.max) * 100}%` }}
                      transition={{ duration: 1, delay: index * 0.1 }}
                      className={`h-full rounded-full bg-gradient-to-r ${
                        item.color === 'cyan'
                          ? 'from-cyan-500 to-cyan-400'
                          : item.color === 'emerald'
                            ? 'from-emerald-500 to-emerald-400'
                            : item.color === 'amber'
                              ? 'from-amber-500 to-amber-400'
                              : item.color === 'purple'
                                ? 'from-purple-500 to-purple-400'
                                : 'from-pink-500 to-pink-400'
                      }`}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="mt-6 border-t border-white/10 pt-6">
              <div className="flex items-center justify-between">
                <span className="text-white/60">Total ProofScore</span>
                <span className="text-2xl font-bold text-cyan-400">{proofscore}</span>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      <motion.div variants={itemVariants}>
        <RecentActivitySection />
      </motion.div>
    </motion.div>
  );
}
