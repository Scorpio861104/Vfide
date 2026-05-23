'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  Banknote,
  ExternalLink,
  Flame,
  LifeBuoy,
  Shield,
  TrendingDown,
  TrendingUp
} from 'lucide-react';
import { formatEther } from 'viem';
import { useEnterpriseTreasury } from '@/hooks/useEnterpriseTreasury';

/**
 * FinanceTab — protocol treasury overview.
 *
 * Tier 2 Phase 4 Turn 1 (2026-05-17) — converted from hardcoded sample data
 * ($11.25M / 3 token types / hardcoded asset list) to real on-chain reads via
 * `useEnterpriseTreasury`. Reads come from three contracts:
 *
 *   • EcoTreasuryVault.getTreasurySummary() → currentBalance, totalIn, totalOut, netPosition
 *   • EcosystemVault.{councilPool, headhunterPool, merchantPool, operationsPool, ...}
 *   • VFIDEToken.totalSupply() → ratio displays
 *
 * The two "DAO Only" buttons (Send VFIDE / Rescue Tokens) now deep-link into
 * the governance CreateTab with the right template pre-selected via the
 * Phase 3 Turn 1 URL-param protocol. Anyone can navigate there; the DAO
 * eligibility check is enforced inside the DAO contract.
 *
 * Removed compared to the sample-data version:
 *   • The hardcoded "$11.25M" headline. There is no on-chain USD price oracle
 *     wired up — showing a fake USD total is misleading. The headline now
 *     shows the actual VFIDE balance with a hover-tooltip for the precise wei
 *     value, plus the net position (in/out).
 *   • The "USDC: $2.5M / ETH: $1.75M" hardcoded rows. EcoTreasuryVault supports
 *     multi-token reads via `getMultiTokenBalances(tokens[])`, but querying
 *     specific tokens requires the operator to choose which tokens to display.
 *     Backlogged as a Tier 3 followup — needs an "operator token list" config
 *     surface or an env-var allowlist.
 */
export function FinanceTab() {
  const {
    ecoTreasuryConfigured,
    ecosystemVaultConfigured,
    anyConfigured,
    treasurySummary,
    vfideBalance,
    pools,
    paidTotals,
    ecosystemFlow,
    loading,
  } = useEnterpriseTreasury();

  // ── Not configured ──────────────────────────────────────────────────────
  if (!anyConfigured) {
    return (
      <div className="space-y-6">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-amber-400 font-bold mb-1">Treasury contracts not configured</h3>
            <p className="text-sm text-zinc-400">
              Neither EcoTreasuryVault nor EcosystemVault has an address configured for the current
              network. Treasury data is unavailable.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-8">
        <div className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 rounded-xl p-6">
          <div className="flex items-center gap-4 mb-6">
            <TrendingUp className="w-12 h-12 text-yellow-400" />
            <div>
              <h2 className="text-2xl font-bold text-zinc-100">Treasury Finance</h2>
              <p className="text-zinc-400">Loading from chain…</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-black/30 rounded-lg p-4 animate-pulse h-20" />
            ))}
          </div>
        </div>
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6 animate-pulse h-48" />
      </div>
    );
  }

  // ── Data ────────────────────────────────────────────────────────────────
  const liveBalance = treasurySummary?.currentBalance ?? vfideBalance;
  const totalIn = treasurySummary?.totalIn ?? 0n;
  const totalOut = treasurySummary?.totalOut ?? 0n;
  const netPosition = treasurySummary?.netPosition ?? 0n;
  const isNetPositive = netPosition >= 0n;

  return (
    <div className="space-y-8">
      {/* Finance Overview */}
      <div className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 rounded-xl p-4 sm:p-6 md:p-8">
        <div className="flex items-center gap-4 mb-6">
          <TrendingUp className="w-12 h-12 text-yellow-400" />
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">Treasury Finance</h2>
            <p className="text-zinc-400">
              Protocol treasury — on-chain VFIDE position and ecosystem flow
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            icon={<TrendingUp className="w-5 h-5 text-yellow-400" />}
            value={formatVFIDECompact(liveBalance)}
            label="Current VFIDE balance"
            sub={`${formatEther(liveBalance)} VFIDE`}
          />
          <StatCard
            icon={<Flame className="w-5 h-5 text-orange-400" />}
            value={formatVFIDECompact(ecosystemFlow.totalBurned)}
            label="Lifetime burned"
            sub={`${formatEther(ecosystemFlow.totalBurned)} VFIDE`}
          />
          <StatCard
            icon={
              isNetPositive ? (
                <TrendingUp className="w-5 h-5 text-green-400" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-400" />
              )
            }
            value={`${isNetPositive ? '+' : '−'}${formatVFIDECompact(isNetPositive ? netPosition : -netPosition)}`}
            valueClass={isNetPositive ? 'text-green-400' : 'text-red-400'}
            label="Net position"
            sub={`${formatEther(totalIn)} in / ${formatEther(totalOut)} out`}
          />
        </div>
      </div>

      {/* EcosystemVault pool composition */}
      {ecosystemVaultConfigured && (
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
          <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
            <h3 className="text-xl font-bold text-zinc-100">Ecosystem Pool Composition</h3>
            <div className="text-xs text-zinc-500">
              From EcosystemVault · current pool balances
            </div>
          </div>
          <div className="space-y-3">
            <PoolRow label="Council pool" amount={pools.councilPool} paidLifetime={paidTotals.totalCouncilPaid} />
            <PoolRow label="Headhunter pool" amount={pools.headhunterPool} paidLifetime={paidTotals.totalHeadhunterPaid} />
            <PoolRow label="Merchant pool" amount={pools.merchantPool} paidLifetime={paidTotals.totalMerchantBonusesPaid} />
            <PoolRow label="Operations pool" amount={pools.operationsPool} paidLifetime={paidTotals.totalExpensesPaid} />
            <PoolRow
              label="Stablecoin reserves"
              amount={pools.stablecoinReserves}
              paidLifetime={undefined}
              note="USDC-denominated"
            />
            <PoolRow
              label="Pending withdrawals"
              amount={pools.pendingWithdrawTotal}
              paidLifetime={undefined}
              note="Queued claims"
              dimWhenZero
            />
          </div>
        </div>
      )}

      {/* Lifetime flow */}
      {ecosystemVaultConfigured && ecosystemFlow.totalReceived > 0n && (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6">
          <h3 className="text-xl font-bold text-zinc-100 mb-4">Lifetime Ecosystem Flow</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-black/30 rounded-lg">
              <div className="text-2xl font-bold text-green-400" title={`${formatEther(ecosystemFlow.totalReceived)} VFIDE`}>
                {formatVFIDECompact(ecosystemFlow.totalReceived)}
              </div>
              <div className="text-sm text-zinc-400 mt-1">Total received (lifetime)</div>
            </div>
            <div className="p-4 bg-black/30 rounded-lg">
              <div className="text-2xl font-bold text-orange-400" title={`${formatEther(ecosystemFlow.totalBurned)} VFIDE`}>
                {formatVFIDECompact(ecosystemFlow.totalBurned)}
              </div>
              <div className="text-sm text-zinc-400 mt-1">Total burned (lifetime)</div>
            </div>
          </div>
        </div>
      )}

      {/* Treasury actions — wire to DAO templates */}
      {ecoTreasuryConfigured && (
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
          <h3 className="text-xl font-bold text-zinc-100 mb-6">Treasury Operations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ActionCard
              icon={<Banknote className="text-yellow-400 mb-3" size={24} />}
              title="Send VFIDE"
              description="DAO-approved disbursement from treasury"
              href="/governance?template=sendVFIDE"
              cta="Draft DAO proposal"
            />
            <ActionCard
              icon={<LifeBuoy className="text-purple-400 mb-3" size={24} />}
              title="Rescue Tokens"
              description="Recover ERC-20 tokens accidentally sent to treasury"
              href="/governance?template=rescueToken"
              cta="Draft DAO proposal"
            />
          </div>
        </div>
      )}

      {/* DAO control disclosure */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-300">
          All treasury writes (transfers, rescue, module wiring) are gated by DAO governance. Use
          the action cards above or visit{' '}
          <Link href="/governance" className="underline hover:text-blue-200">
            /governance
          </Link>{' '}
          to draft a proposal.
        </p>
      </div>
    </div>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────────────────

function StatCard({
  icon,
  value,
  label,
  sub,
  valueClass = 'text-yellow-400',
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-black/30 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">{icon}</div>
      <div className={`text-3xl font-bold tabular-nums ${valueClass}`}>{value}</div>
      <div className="text-sm text-zinc-400 mt-1">{label}</div>
      {sub && <div className="text-xs text-zinc-500 mt-1 truncate" title={sub}>{sub}</div>}
    </div>
  );
}

function PoolRow({
  label,
  amount,
  paidLifetime,
  note,
  dimWhenZero,
}: {
  label: string;
  amount: bigint;
  paidLifetime: bigint | undefined;
  note?: string;
  dimWhenZero?: boolean;
}) {
  const isZero = amount === 0n && (paidLifetime ?? 0n) === 0n;
  return (
    <div
      className={`flex items-center justify-between p-4 bg-zinc-900 rounded-lg gap-3 ${
        dimWhenZero && isZero ? 'opacity-60' : ''
      }`}
    >
      <div className="min-w-0">
        <div className="text-zinc-100 font-bold">{label}</div>
        {note && <div className="text-xs text-zinc-500 mt-0.5">{note}</div>}
      </div>
      <div className="text-right">
        <div className="text-cyan-400 font-bold tabular-nums" title={`${formatEther(amount)} VFIDE`}>
          {formatVFIDECompact(amount)}
        </div>
        {paidLifetime !== undefined && (
          <div className="text-xs text-zinc-500 mt-0.5" title={`Lifetime paid: ${formatEther(paidLifetime)} VFIDE`}>
            +{formatVFIDECompact(paidLifetime)} paid
          </div>
        )}
      </div>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  description,
  href,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="p-4 bg-zinc-900 rounded-lg flex flex-col">
      {icon}
      <div className="text-zinc-100 font-bold mb-1">{title}</div>
      <div className="text-xs text-zinc-400 mb-3 flex-1">{description}</div>
      <Link
        href={href}
        className="w-full bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-300 border border-yellow-500/30 font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
      >
        {cta} <ExternalLink size={12} />
      </Link>
    </div>
  );
}

// ─── Utilities ─────────────────────────────────────────────────────────────

function formatVFIDECompact(wei: bigint): string {
  if (wei === 0n) return '0';
  const negative = wei < 0n;
  const abs = negative ? -wei : wei;
  const tokens = Number(abs) / 1e18;
  let out: string;
  if (tokens >= 1_000_000_000) out = `${(tokens / 1_000_000_000).toFixed(2)}B`;
  else if (tokens >= 1_000_000) out = `${(tokens / 1_000_000).toFixed(1)}M`;
  else if (tokens >= 1_000) out = `${(tokens / 1_000).toFixed(1)}K`;
  else if (tokens >= 1) out = tokens.toFixed(2);
  else out = tokens.toFixed(4);
  return negative ? `-${out}` : out;
}
