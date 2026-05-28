'use client';

import {
  AlertTriangle,
  Shield,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { formatEther } from 'viem';
import { useEnterpriseTreasury } from '@/hooks/useEnterpriseTreasury';

/**
 * Treasury → EcosystemTab — EcosystemVault pool composition.
 *
 * Tier 2 Phase 4 Turn 2 (2026-05-17). Replaces hardcoded "{40%, 25%, 20%, 15%}"
 * allocation array with real pool balances + lifetime paid totals from
 * useEnterpriseTreasury (built Phase 4 Turn 1).
 *
 * The "Claim Rewards" cards stay as honest null-state placeholders. Real
 * claim mechanics live on /merchant and /headhunter — this tab is a
 * read-only treasury rollup.
 *
 * Fields removed compared to sample-data version:
 *   • The hardcoded percentage allocations. The real EcosystemVault uses
 *     `merchantPoolReserveBps` and `headhunterPoolReserveBps` as the
 *     allocation knobs, but the percentage doesn't sum to a clean 100%
 *     because pools accumulate independently from per-distribution shares.
 *     Showing real pool balances + lifetime paid is more honest than
 *     showing a "percentage of remaining" that depends on momentary state.
 */
export function EcosystemTab({ isConnected }: { isConnected: boolean }) {
  const {
    ecosystemVaultConfigured,
    pools,
    paidTotals,
    ecosystemFlow,
    loading,
  } = useEnterpriseTreasury();

  if (!ecosystemVaultConfigured) {
    return (
      <div className="space-y-6">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-amber-400 font-bold mb-1">EcosystemVault not configured</h3>
            <p className="text-sm text-zinc-400">
              The EcosystemVault contract address is not configured for the current
              network. Ecosystem allocation data is unavailable.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Total currently in pools (council + headhunter + merchant + operations).
  // Excludes stablecoin reserves + pending withdrawals.
  const totalInPools =
    pools.councilPool + pools.headhunterPool + pools.merchantPool + pools.operationsPool;

  return (
    <div className="space-y-8">
      {/* Ecosystem Overview */}
      <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-accent/30 rounded-xl p-4 sm:p-6 md:p-8">
        <div className="flex items-center gap-4 mb-6">
          <Users className="w-12 h-12 text-cyan-400" />
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">Ecosystem Vault</h2>
            <p className="text-zinc-400">
              Funds council salaries, merchant rewards, headhunter bounties, and operations
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {loading ? (
            <>
              <div className="bg-black/30 rounded-lg p-4 animate-pulse h-20" />
              <div className="bg-black/30 rounded-lg p-4 animate-pulse h-20" />
              <div className="bg-black/30 rounded-lg p-4 animate-pulse h-20" />
            </>
          ) : (
            <>
              <StatTile
                value={formatVFIDECompact(totalInPools)}
                label="In Pools"
                sub={`${formatEther(totalInPools)} VFIDE`}
                valueClass="text-cyan-400"
              />
              <StatTile
                value={formatVFIDECompact(ecosystemFlow.totalReceived)}
                label="Lifetime Received"
                sub={`${formatEther(ecosystemFlow.totalReceived)} VFIDE`}
                valueClass="text-zinc-100"
              />
              <StatTile
                value={formatVFIDECompact(
                  paidTotals.totalCouncilPaid +
                    paidTotals.totalExpensesPaid +
                    paidTotals.totalHeadhunterPaid +
                    paidTotals.totalMerchantBonusesPaid,
                )}
                label="Lifetime Distributed"
                sub="across all pools"
                valueClass="text-green-400"
              />
            </>
          )}
        </div>
      </div>

      {/* Pool Breakdown */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-zinc-100 mb-6">Pool Breakdown</h3>
        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-zinc-900/60 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <PoolBar
              icon={<Users size={20} className="text-cyan-400" />}
              name="Council Salaries"
              amount={pools.councilPool}
              lifetimePaid={paidTotals.totalCouncilPaid}
              totalReference={totalInPools}
            />
            <PoolBar
              icon={<Wallet size={20} className="text-cyan-400" />}
              name="Merchant Rewards"
              amount={pools.merchantPool}
              lifetimePaid={paidTotals.totalMerchantBonusesPaid}
              totalReference={totalInPools}
            />
            <PoolBar
              icon={<TrendingUp size={20} className="text-cyan-400" />}
              name="Headhunter Bounties"
              amount={pools.headhunterPool}
              lifetimePaid={paidTotals.totalHeadhunterPaid}
              totalReference={totalInPools}
            />
            <PoolBar
              icon={<Shield size={20} className="text-cyan-400" />}
              name="Operations"
              amount={pools.operationsPool}
              lifetimePaid={paidTotals.totalExpensesPaid}
              totalReference={totalInPools}
            />
          </div>
        )}
      </div>

      {/* Claim Rewards (null-state stubs — real flows live on /merchant + /headhunter) */}
      {isConnected && (
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
          <h3 className="text-xl font-bold text-zinc-100 mb-4">Your Claimable Rewards</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-zinc-900 rounded-lg">
              <div className="text-zinc-400 text-sm mb-1">Merchant Rewards</div>
              <div className="text-2xl font-bold text-cyan-400">0 VFIDE</div>
              <button
                disabled
                title="Merchant rewards are earned by transacting through /merchant. Claim is available there once you have a balance."
                className="mt-3 w-full bg-zinc-700 text-zinc-500 font-bold py-2 rounded-lg cursor-not-allowed"
              >
                No Rewards Available
              </button>
            </div>
            <div className="p-4 bg-zinc-900 rounded-lg">
              <div className="text-zinc-400 text-sm mb-1">Headhunter Bounties</div>
              <div className="text-2xl font-bold text-cyan-400">0 VFIDE</div>
              <button
                disabled
                title="Headhunter bounties are earned by referring merchants through /headhunter. Claim is available there once you have a balance."
                className="mt-3 w-full bg-zinc-700 text-zinc-500 font-bold py-2 rounded-lg cursor-not-allowed"
              >
                No Bounties Available
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────────────────

function StatTile({
  value,
  label,
  sub,
  valueClass,
}: {
  value: string;
  label: string;
  sub?: string;
  valueClass: string;
}) {
  return (
    <div className="bg-black/30 rounded-lg p-4">
      <div className={`text-3xl font-bold ${valueClass} tabular-nums`}>{value}</div>
      <div className="text-sm text-zinc-400 mt-1">{label}</div>
      {sub && (
        <div className="text-xs text-zinc-500 mt-1 truncate" title={sub}>
          {sub}
        </div>
      )}
    </div>
  );
}

function PoolBar({
  icon,
  name,
  amount,
  lifetimePaid,
  totalReference,
}: {
  icon: React.ReactNode;
  name: string;
  amount: bigint;
  lifetimePaid: bigint;
  totalReference: bigint;
}) {
  // Percentage of current-pool total. Zero when nothing in any pool.
  const sharePct =
    totalReference > 0n ? Number((amount * 10000n) / totalReference) / 100 : 0;
  const barWidth = Math.max(0, Math.min(100, sharePct));
  return (
    <div className="p-4 bg-zinc-900 rounded-lg">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          {icon}
          <span className="text-zinc-100 font-bold">{name}</span>
        </div>
        <div className="text-right">
          <div
            className="text-cyan-400 font-bold tabular-nums"
            title={`${formatEther(amount)} VFIDE`}
          >
            {formatVFIDECompact(amount)}
          </div>
          <div
            className="text-xs text-zinc-500"
            title={`Lifetime paid: ${formatEther(lifetimePaid)} VFIDE`}
          >
            +{formatVFIDECompact(lifetimePaid)} paid lifetime
          </div>
        </div>
      </div>
      <div className="w-full h-2 bg-zinc-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
          style={{ width: `${barWidth}%` }}
        />
      </div>
      <div className="text-right text-xs text-zinc-400 mt-1 tabular-nums">
        {sharePct.toFixed(1)}% of current pool total
      </div>
    </div>
  );
}

// ─── Utilities ─────────────────────────────────────────────────────────────

function formatVFIDECompact(wei: bigint): string {
  if (wei === 0n) return '0';
  const tokens = Number(wei) / 1e18;
  if (tokens >= 1_000_000_000) return `${(tokens / 1_000_000_000).toFixed(2)}B`;
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  if (tokens >= 1) return tokens.toFixed(2);
  return tokens.toFixed(4);
}
