'use client';

import { ArrowRight, TrendingUp, Clock, AlertTriangle, ExternalLink } from 'lucide-react';
import { useReadContracts, useChainId } from 'wagmi';
import { type Address, type Abi } from 'viem';
import { FeeDistributorABI } from '@/lib/abis';
import { CONTRACT_ADDRESSES, isConfiguredContractAddress } from '@/lib/contracts';

/**
 * Treasury → RevenueTab — FeeDistributor real-data view.
 *
 * Tier 2 Phase 4 Turn 2 (2026-05-17). Replaces hardcoded "{Burn 86%, Sanctum 3%,
 * Ecosystem 11%}" payee shares with the live `feeSplit()` reading from the
 * deployed FeeDistributor contract.
 *
 * Reads (all batched via useReadContracts → single Multicall round-trip):
 *   • `feeSplit()`              — current BPS split across 3 channels (daoPayrollBps, merchantPoolBps, headhunterPoolBps)
 *   • `burnAddress()`           — destination for burned fees
 *   • `sanctumFund()`           — destination for charity fund
 *   • `daoPayrollPool()`        — destination for DAO payroll
 *   • `merchantPool()`          — destination for merchant rewards
 *   • `headhunterPool()`        — destination for headhunter bounties
 *   • `lastDistributionTime()`  — Unix seconds of last distribute() call
 *   • `minDistributionAmount()` — threshold for triggering distribute()
 *
 * Sample-data correspondence:
 *   Note: burnBps and sanctumBps are NOT in FeeDistributor — they are handled upstream by
 *   ProofScoreBurnRouter.computeFees (40% burn, 10% Sanctum fixed in contract code).
 *   FeeDistributor only manages the 50% ecosystem share: DAO/merchant/headhunter.
 */

const DEFAULT_CHAIN_ID = 8453;
const EXPLORER_BY_CHAIN: Record<number, string> = {
  1: 'https://etherscan.io',
  8453: 'https://basescan.org',
  11155111: 'https://sepolia.etherscan.io',
  84532: 'https://sepolia.basescan.org',
};

function getAddressExplorerUrl(address: string, chainId: number = DEFAULT_CHAIN_ID): string {
  const base = EXPLORER_BY_CHAIN[chainId] ?? EXPLORER_BY_CHAIN[DEFAULT_CHAIN_ID];
  return `${base}/address/${address}`;
}

export function RevenueTab() {
  const chainId = useChainId();
  const feeDistributorAddress = CONTRACT_ADDRESSES.FeeDistributor;
  const configured = isConfiguredContractAddress(feeDistributorAddress);

  // Batch 8 reads — single Multicall.
  const reads = configured
    ? ([
        { address: feeDistributorAddress as Address, abi: FeeDistributorABI as Abi, functionName: 'feeSplit' as const },
        { address: feeDistributorAddress as Address, abi: FeeDistributorABI as Abi, functionName: 'burnAddress' as const },
        { address: feeDistributorAddress as Address, abi: FeeDistributorABI as Abi, functionName: 'sanctumFund' as const },
        { address: feeDistributorAddress as Address, abi: FeeDistributorABI as Abi, functionName: 'daoPayrollPool' as const },
        { address: feeDistributorAddress as Address, abi: FeeDistributorABI as Abi, functionName: 'merchantPool' as const },
        { address: feeDistributorAddress as Address, abi: FeeDistributorABI as Abi, functionName: 'headhunterPool' as const },
        { address: feeDistributorAddress as Address, abi: FeeDistributorABI as Abi, functionName: 'lastDistributionTime' as const },
        { address: feeDistributorAddress as Address, abi: FeeDistributorABI as Abi, functionName: 'minDistributionAmount' as const },
      ] as const)
    : [];

  const { data, isLoading } = useReadContracts({
    contracts: reads as readonly {
      address: Address;
      abi: Abi;
      functionName: string;
      args?: readonly unknown[];
    }[],
    query: { enabled: configured },
  });

  // ── Not configured ──────────────────────────────────────────────────────
  if (!configured) {
    return (
      <div className="space-y-6">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-amber-400 font-bold mb-1">FeeDistributor not configured</h3>
            <p className="text-sm text-zinc-400">
              The FeeDistributor contract address is not configured for the current
              network. Revenue split data is unavailable.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Decode each read, defaulting to safe values if any failed.
  const decode = <T,>(idx: number, fallback: T): T => {
    const entry = data?.[idx];
    if (!entry || entry.status !== 'success') return fallback;
    return (entry.result as T) ?? fallback;
  };
  const feeSplit = decode<readonly [bigint, bigint, bigint]>(
    0,
    [0n, 0n, 0n] as const,
  );
  const burnAddress = decode<Address>(1, '0x0000000000000000000000000000000000000000');
  const sanctumFund = decode<Address>(2, '0x0000000000000000000000000000000000000000');
  const daoPayrollPool = decode<Address>(3, '0x0000000000000000000000000000000000000000');
  const merchantPool = decode<Address>(4, '0x0000000000000000000000000000000000000000');
  const headhunterPool = decode<Address>(5, '0x0000000000000000000000000000000000000000');
  const lastDistributionTime = decode<bigint>(6, 0n);
  const minDistributionAmount = decode<bigint>(7, 0n);

  const [daoPayrollBps, merchantPoolBps, headhunterPoolBps] = feeSplit;
  // Aggregate BPS for sanity; should sum to 10000 (100%) on a healthy deploy.
  // FeeDistributor manages only the ecosystem share; these three must sum to 10000.
  const totalBps = daoPayrollBps + merchantPoolBps + headhunterPoolBps;

  const payees: Array<{
    name: string;
    description: string;
    bps: bigint;
    address: Address;
    color: string;
  }> = [
    // Note: Burn (40%) and Sanctum (10%) are handled upstream by ProofScoreBurnRouter — not in FeeDistributor.
    // The split below is of the 50% ecosystem share that reaches FeeDistributor.
    { name: 'DAO Payroll', description: 'Council + operations payroll (50% of ecosystem share)', bps: daoPayrollBps, address: daoPayrollPool, color: 'bg-purple-500' },
    { name: 'Merchant Pool', description: 'Merchant rewards channel (30% of ecosystem share)', bps: merchantPoolBps, address: merchantPool, color: 'bg-cyan-500' },
    { name: 'Headhunter Pool', description: 'Referral bounties channel (20% of ecosystem share)', bps: headhunterPoolBps, address: headhunterPool, color: 'bg-emerald-500' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 rounded-xl p-4 sm:p-6 md:p-8">
        <div className="flex items-center gap-4 mb-6">
          <TrendingUp className="w-12 h-12 text-yellow-400" />
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">Fee Distribution</h2>
            <p className="text-zinc-400">
              How transfer fees flow from the burn router to designated destinations
            </p>
          </div>
        </div>
        {isLoading ? (
          <div className="text-sm text-zinc-400">Loading from FeeDistributor…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <SummaryBox
              icon={<Clock size={16} className="text-yellow-400" />}
              label="Last distribution"
              value={formatRelativeTime(lastDistributionTime)}
            />
            <SummaryBox
              label="Min trigger amount"
              value={
                <>
                  <span className="tabular-nums">{formatVFIDECompact(minDistributionAmount)}</span>
                  <span className="text-xs text-zinc-500 ml-1">VFIDE</span>
                </>
              }
            />
            <SummaryBox
              label="Sum of BPS"
              value={
                <span className={totalBps === 10000n ? 'text-green-400' : 'text-amber-400'}>
                  {totalBps.toString()} / 10000
                </span>
              }
              note={totalBps === 10000n ? 'healthy — sums to 10,000 bps (100% of ecosystem share)' : 'unhealthy — three channels must sum to 10,000 bps'}
            />
          </div>
        )}
      </div>

      {/* Flow diagram */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-zinc-100 mb-6">Fee Flow</h3>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <FlowBox title="Transfer Fees" subtitle="from ProofScoreBurnRouter" />
          <ArrowRight className="text-cyan-400" />
          <FlowBox title="FeeDistributor" subtitle="splits via feeSplit BPS" />
          <ArrowRight className="text-cyan-400" />
          <FlowBox title="5 destinations" subtitle="below" />
        </div>
      </div>

      {/* Payees */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-zinc-100 mb-6">Distribution Recipients</h3>
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-zinc-900/60 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {payees.map((payee) => {
              const pct = Number(payee.bps) / 100; // BPS → percentage
              return (
                <div key={payee.name} className="p-4 bg-zinc-900 rounded-lg">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <div className="min-w-0">
                      <div className="text-zinc-100 font-bold">{payee.name}</div>
                      <div className="text-xs text-zinc-400">{payee.description}</div>
                      {payee.address !== '0x0000000000000000000000000000000000000000' && (
                        <a
                          href={getAddressExplorerUrl(payee.address, chainId ?? DEFAULT_CHAIN_ID)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-cyan-400 hover:text-cyan-300 font-mono inline-flex items-center gap-1 mt-1 transition-colors"
                          title={payee.address}
                        >
                          {shortAddr(payee.address)} <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-cyan-400 tabular-nums">
                      {pct.toFixed(2)}%
                    </div>
                  </div>
                  <div className="w-full h-3 bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${payee.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────────────────

function FlowBox({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="p-4 bg-zinc-900 rounded-lg text-center min-w-[140px]">
      <div className="text-zinc-100 font-bold">{title}</div>
      <div className="text-xs text-zinc-400 mt-0.5">{subtitle}</div>
    </div>
  );
}

function SummaryBox({
  icon,
  label,
  value,
  note,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  note?: string;
}) {
  return (
    <div className="bg-black/30 rounded-lg p-3">
      <div className="flex items-center gap-2 text-xs text-zinc-400 uppercase tracking-wide">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-lg font-bold text-zinc-100 mt-1">{value}</div>
      {note && <div className="text-xs text-zinc-500 mt-0.5">{note}</div>}
    </div>
  );
}

// ─── Utilities ─────────────────────────────────────────────────────────────

function shortAddr(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
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

function formatRelativeTime(unixSec: bigint): string {
  if (unixSec === 0n) return 'never';
  const nowMs = Date.now();
  const thenMs = Number(unixSec) * 1000;
  const diffSec = (nowMs - thenMs) / 1000;
  if (diffSec < 60) return `${Math.floor(diffSec)}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 86400 * 30) return `${Math.floor(diffSec / 86400)}d ago`;
  try {
    return new Date(thenMs).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}
