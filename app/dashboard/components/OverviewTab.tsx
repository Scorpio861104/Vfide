'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useReadContract } from 'wagmi';
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
import { CONTRACT_ADDRESSES, SeerABI, isConfiguredContractAddress } from '@/lib/contracts';

import { RecentActivitySection } from './RecentActivity';
import { GlassCard, QuickAction, containerVariants, ecosystemLoadout, itemVariants } from './shared';

export function OverviewTab({
  proofscore,
  feeRate,
  address,
}: {
  proofscore: number;
  feeRate: number;
  address?: `0x${string}`;
}) {
  const hasSeer = isConfiguredContractAddress(CONTRACT_ADDRESSES.Seer);

  const { data: breakdown } = useReadContract({
    address: CONTRACT_ADDRESSES.Seer,
    abi: SeerABI,
    functionName: 'getScoreBreakdown',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && hasSeer,
    },
  });

  // breakdown: [daoSetScore, onChainScore, finalScore, daoWeight, onChainWeight, hasVault]
  const bd = breakdown as readonly [bigint, bigint, bigint, bigint, bigint, boolean] | undefined;
  const daoSetScore = bd ? Number(bd[0]) : null;
  const onChainScore = bd ? Number(bd[1]) : null;
  const daoWeight = bd ? Number(bd[3]) : 30;
  const onChainWeight = bd ? Number(bd[4]) : 70;
  const hasVault = bd ? Boolean(bd[5]) : null;

  const breakdownRows = [
    {
      label: `DAO Score (${daoWeight}% weight)`,
      value: daoSetScore ?? proofscore,
      max: 10000,
      color: 'cyan' as const,
    },
    {
      label: `On-Chain Score (${onChainWeight}% weight)`,
      value: onChainScore ?? proofscore,
      max: 10000,
      color: 'emerald' as const,
    },
  ];

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
              {breakdownRows.map((item, index) => (
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
                          : 'from-emerald-500 to-emerald-400'
                      }`}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
            {hasVault !== null && (
              <div className="mt-4 flex items-center gap-2">
                <Shield size={14} className={hasVault ? 'text-emerald-400' : 'text-gray-500'} />
                <span className={`text-xs ${hasVault ? 'text-emerald-400' : 'text-gray-500'}`}>
                  {hasVault ? 'Vault active — score bonus applied' : 'No vault detected'}
                </span>
              </div>
            )}
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
