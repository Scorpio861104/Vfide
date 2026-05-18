'use client';

import { Heart, PieChart, TrendingUp, Users, Wallet, AlertTriangle } from 'lucide-react';
import { useReadContract } from 'wagmi';
import { type Address, formatEther } from 'viem';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { useEnterpriseTreasury } from '@/hooks/useEnterpriseTreasury';
import { useSanctumVault } from '@/hooks/useSanctumVault';
import { FeeDistributorABI } from '@/lib/abis';
import { CONTRACT_ADDRESSES, isConfiguredContractAddress } from '@/lib/contracts';

/**
 * Treasury → OverviewTab — protocol-wide rollup.
 *
 * Tier 2 Phase 4 Turn 2 (2026-05-17). Replaces 3 hardcoded sample sections:
 *   • 4 "treasury stats" cards with arbitrary VFIDE amounts
 *   • Fee distribution breakdown (Burn 40 / Sanctum 10 / Ecosystem 50 — wrong vs real contract)
 *   • 4 "recent distributions" rows
 *
 * Real-data alternative:
 *   • The 4 stat cards now read from useEnterpriseTreasury (EcoTreasuryVault VFIDE balance
 *     + EcosystemVault current pool total) + useSanctumVault (SanctumVault balance) +
 *     EcosystemVault.operationsPool. Treasury totals come from live contracts, not invented.
 *   • Fee distribution breakdown reads `FeeDistributor.feeSplit()` — actual BPS, not invented
 *     percentages. Three big buckets (Burn / Sanctum / All Ecosystem channels combined) match
 *     the visual structure of the original card while staying honest about the underlying numbers.
 *   • "Recent Distributions" intentionally removed — would require a multi-contract event
 *     scan (FeeDistributor.Distributed + EcoTreasuryVault.Sent + SanctumVault.DisbursementExecuted)
 *     and timestamp enrichment, beyond a single rollup tab's scope. Logged in plan doc as
 *     Tier 3 indexer candidate. The link below directs to /sanctum/history + /treasury/revenue
 *     for the available per-channel histories.
 */
export function OverviewTab() {
  const enterprise = useEnterpriseTreasury();
  const sanctum = useSanctumVault();

  const feeDistributorAddress = CONTRACT_ADDRESSES.FeeDistributor;
  const feeDistributorConfigured = isConfiguredContractAddress(feeDistributorAddress);

  const { data: feeSplitRaw, isLoading: feeSplitLoading } = useReadContract({
    address: feeDistributorAddress as Address | undefined,
    abi: FeeDistributorABI,
    functionName: 'feeSplit',
    query: { enabled: feeDistributorConfigured },
  });

  // ── Not configured (nothing useful to show) ─────────────────────────────
  if (!enterprise.anyConfigured && !sanctum.configured && !feeDistributorConfigured) {
    return (
      <div className="space-y-6">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-amber-400 font-bold mb-1">Treasury contracts not configured</h3>
            <p className="text-sm text-zinc-400">
              No treasury contract addresses are configured for the current network. Overview data
              is unavailable.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Decode feeSplit tuple
  const feeSplit = feeSplitRaw as readonly [bigint, bigint, bigint, bigint, bigint] | undefined;
  const burnBps = feeSplit?.[0] ?? 0n;
  const sanctumBps = feeSplit?.[1] ?? 0n;
  const ecosystemBps = feeSplit
    ? feeSplit[2] + feeSplit[3] + feeSplit[4] // daoPayroll + merchant + headhunter
    : 0n;

  // Compute pool aggregates for the 4 stat cards
  const ecosystemPoolTotal =
    enterprise.pools.councilPool +
    enterprise.pools.headhunterPool +
    enterprise.pools.merchantPool +
    enterprise.pools.operationsPool;

  const totalTreasury =
    enterprise.vfideBalance + ecosystemPoolTotal + sanctum.vaultBalance;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0 },
  } as const;

  const loadingAny = enterprise.loading || sanctum.charitiesLoading || feeSplitLoading;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* Stats Grid — 4 cards, all read from real contracts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          variants={itemVariants}
          icon={Wallet}
          label="Total Treasury"
          value={formatVFIDECompact(totalTreasury)}
          sub={`${formatEther(totalTreasury)} VFIDE`}
          gradient="from-cyan-500/20 to-blue-500/10"
          border="border-cyan-500/20"
          text="text-cyan-400"
          live={!loadingAny}
        />
        <StatCard
          variants={itemVariants}
          icon={Heart}
          label="Sanctum (Charity)"
          value={formatVFIDECompact(sanctum.vaultBalance)}
          sub={`${formatEther(sanctum.vaultBalance)} VFIDE`}
          gradient="from-pink-500/20 to-rose-500/10"
          border="border-pink-500/20"
          text="text-pink-400"
          live={!loadingAny}
        />
        <StatCard
          variants={itemVariants}
          icon={Users}
          label="Ecosystem Vault"
          value={formatVFIDECompact(ecosystemPoolTotal)}
          sub={`${formatEther(ecosystemPoolTotal)} VFIDE in pools`}
          gradient="from-emerald-500/20 to-green-500/10"
          border="border-emerald-500/20"
          text="text-emerald-400"
          live={!loadingAny}
        />
        <StatCard
          variants={itemVariants}
          icon={TrendingUp}
          label="VFIDE Treasury (EcoTreasuryVault)"
          value={formatVFIDECompact(enterprise.vfideBalance)}
          sub={`${formatEther(enterprise.vfideBalance)} VFIDE`}
          gradient="from-amber-500/20 to-orange-500/10"
          border="border-amber-500/20"
          text="text-amber-400"
          live={!loadingAny}
        />
      </div>

      {/* Fee Distribution — real BPS from FeeDistributor */}
      <GlassCard className="p-6">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5">
            <PieChart className="w-5 h-5 text-purple-400" />
          </div>
          Fee Distribution Breakdown
        </h3>
        {!feeDistributorConfigured ? (
          <p className="text-sm text-zinc-500">
            FeeDistributor not configured — distribution split unavailable.
          </p>
        ) : feeSplitLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-zinc-900/60 rounded-2xl p-6 h-32 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeeChannelCard
              percent={bpsToPct(burnBps)}
              label="Burn"
              sub="Deflationary mechanism"
              color="text-orange-400"
              bg="from-orange-500/10 to-amber-500/5"
              border="border-orange-500/20"
            />
            <FeeChannelCard
              percent={bpsToPct(sanctumBps)}
              label="Sanctum"
              sub="Charity fund"
              color="text-pink-400"
              bg="from-pink-500/10 to-rose-500/5"
              border="border-pink-500/20"
            />
            <FeeChannelCard
              percent={bpsToPct(ecosystemBps)}
              label="Ecosystem"
              sub="DAO payroll + merchant + headhunter"
              color="text-cyan-400"
              bg="from-cyan-500/10 to-blue-500/5"
              border="border-cyan-500/20"
            />
          </div>
        )}
        <p className="text-xs text-zinc-500 mt-4 text-center">
          For per-destination BPS + destination addresses, see the{' '}
          <a href="/treasury?tab=revenue" className="text-cyan-400 hover:text-cyan-300 underline">
            Revenue
          </a>{' '}
          tab.
        </p>
      </GlassCard>

      {/* Lifetime flows summary */}
      {enterprise.ecosystemVaultConfigured && (
        <GlassCard className="p-6">
          <h3 className="text-xl font-bold text-white mb-6">Lifetime Protocol Flows</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FlowStat
              label="Received (Ecosystem)"
              amount={enterprise.ecosystemFlow.totalReceived}
              color="text-green-400"
            />
            <FlowStat
              label="Burned"
              amount={enterprise.ecosystemFlow.totalBurned}
              color="text-orange-400"
            />
            <FlowStat
              label="Distributed (all channels)"
              amount={
                enterprise.paidTotals.totalCouncilPaid +
                enterprise.paidTotals.totalExpensesPaid +
                enterprise.paidTotals.totalHeadhunterPaid +
                enterprise.paidTotals.totalMerchantBonusesPaid
              }
              color="text-cyan-400"
            />
          </div>
          <p className="text-xs text-zinc-500 mt-4">
            Recent per-channel activity is in{' '}
            <a href="/sanctum?tab=history" className="text-cyan-400 hover:text-cyan-300 underline">
              /sanctum/history
            </a>{' '}
            (charity flows) and{' '}
            <a href="/treasury?tab=revenue" className="text-cyan-400 hover:text-cyan-300 underline">
              /treasury/revenue
            </a>{' '}
            (fee splits). A unified protocol-wide event timeline is a Tier 3 indexer concern.
          </p>
        </GlassCard>
      )}
    </motion.div>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────────────────

function StatCard({
  variants,
  icon: Icon,
  label,
  value,
  sub,
  gradient,
  border,
  text,
  live,
}: {
  variants: Record<string, unknown>;
  icon: typeof Wallet;
  label: string;
  value: string;
  sub: string;
  gradient: string;
  border: string;
  text: string;
  live: boolean;
}) {
  return (
    <motion.div
      variants={variants as never}
      whileHover={{ scale: 1.02, y: -4 }}
      className={`bg-gradient-to-br ${gradient} backdrop-blur-xl border ${border} rounded-2xl p-6 group`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-xl bg-gradient-to-br ${gradient}`}>
          <Icon className={`w-5 h-5 ${text}`} />
        </div>
        {live && (
          <span className="text-xs text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-white mb-1 tabular-nums" title={sub}>
        {value}
      </div>
      <div className="text-sm text-gray-400">{label}</div>
    </motion.div>
  );
}

function FeeChannelCard({
  percent,
  label,
  sub,
  color,
  bg,
  border,
}: {
  percent: string;
  label: string;
  sub: string;
  color: string;
  bg: string;
  border: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`text-center p-6 bg-gradient-to-br ${bg} border ${border} rounded-2xl`}
    >
      <div className={`text-4xl font-bold ${color} mb-2 tabular-nums`}>{percent}%</div>
      <div className="text-white font-bold">{label}</div>
      <div className="text-xs text-gray-500 mt-1">{sub}</div>
    </motion.div>
  );
}

function FlowStat({ label, amount, color }: { label: string; amount: bigint; color: string }) {
  return (
    <div className="p-4 bg-black/30 rounded-lg">
      <div
        className={`text-2xl font-bold ${color} tabular-nums`}
        title={`${formatEther(amount)} VFIDE`}
      >
        {formatVFIDECompact(amount)}
      </div>
      <div className="text-sm text-zinc-400 mt-1">{label}</div>
    </div>
  );
}

// ─── Utilities ─────────────────────────────────────────────────────────────

function bpsToPct(bps: bigint): string {
  // 10000 bps = 100%
  const pct = Number(bps) / 100;
  return pct.toFixed(2);
}

function formatVFIDECompact(wei: bigint): string {
  if (wei === 0n) return '0';
  const tokens = Number(wei) / 1e18;
  if (tokens >= 1_000_000_000) return `${(tokens / 1_000_000_000).toFixed(2)}B`;
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  if (tokens >= 1) return tokens.toFixed(2);
  return tokens.toFixed(4);
}
