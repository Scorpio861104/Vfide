'use client';

import { VfideConnectButton } from '@/components/crypto/VfideConnectButton';
import { useState, useMemo } from 'react';
import { useAccount, useReadContracts } from 'wagmi';
import { Loader2, CheckCircle, AlertCircle, Trophy, ChevronRight } from 'lucide-react';
import { formatEther } from 'viem';
import { EcosystemVaultViewABI } from '@/lib/abis';
import { isConfiguredContractAddress } from '@/lib/contracts';
import { useContractAddresses } from '@/hooks/useContractAddresses';
import { useHeadhunterStats, useClaimHeadhunterReward } from '@/hooks/useHeadhunterHooks';
import { toast } from '@/lib/toast';

/**
 * Walks the last N quarters and asks previewHeadhunterReward for each so
 * the user can see which quarters they're eligible to claim. The contract
 * itself decides what's claimable based on:
 *
 *   - `quarterEnded[year][quarter]` flag (set when the quarter rolls over)
 *   - `quarterClaimed[year][quarter][caller]` (one-shot per user)
 *   - `yearPoints[year][caller] > 0` (must have earned points that year)
 *
 * We compute the (year, quarter) pairs client-side from the current period,
 * looking back 2 years. That's the maximum meaningful range — older points
 * are wiped at year rollover anyway.
 */
const LOOKBACK_QUARTERS = 8;

interface ClaimableQuarter {
  year: bigint;
  quarter: bigint;
  referrerPoints: number;
  claimed: boolean;
  quarterEnded: boolean;
  poolSnapshot: bigint;
  estimatedShare: bigint;
}

function computeLookbackPeriods(
  currentYear: bigint,
  currentQuarter: bigint,
): Array<{ year: bigint; quarter: bigint }> {
  const out: Array<{ year: bigint; quarter: bigint }> = [];
  let y = currentYear;
  let q = currentQuarter;
  for (let i = 0; i < LOOKBACK_QUARTERS; i++) {
    // Step back one quarter at a time
    if (q === 1n) {
      q = 4n;
      y = y - 1n;
    } else {
      q = q - 1n;
    }
    if (y < 1n) break;
    out.push({ year: y, quarter: q });
  }
  return out;
}

export function ClaimsTab() {
  const { address, isConnected } = useAccount();
  const { EcosystemVault, EcosystemVaultView } = useContractAddresses();
  // EcosystemVaultView is preferred for views; falls back to the main vault
  // address since the view contract is just a thin facade with the same fns.
  const viewAddress = EcosystemVaultView || EcosystemVault;
  const stats = useHeadhunterStats();
  const { claimReward, isPending } = useClaimHeadhunterReward();
  const [claiming, setClaiming] = useState<string | null>(null);

  const periods = useMemo(() => {
    if (!stats.currentYearNumber || !stats.currentQuarterNumber) return [];
    return computeLookbackPeriods(stats.currentYearNumber, stats.currentQuarterNumber);
  }, [stats.currentYearNumber, stats.currentQuarterNumber]);

  // Batch fetch previewHeadhunterReward for every (year, quarter) pair.
  // useReadContracts groups them into one multicall under the hood, so
  // the 8 reads cost 1 RPC round-trip on chains that support it.
  const previewConfigured =
    isConfiguredContractAddress(viewAddress) && !!address && periods.length > 0;
  const { data: previewData, isLoading: previewLoading } = useReadContracts({
    contracts: periods.map((p) => ({
      address: viewAddress,
      abi: EcosystemVaultViewABI as any,
      functionName: 'previewHeadhunterReward',
      // abi-parity-ok: previewHeadhunterReward(uint256 year, uint256 quarter, address user) — 3 args, statically present
      args: [p.year, p.quarter, address ?? '0x0000000000000000000000000000000000000000'] as const,
    })),
    query: { enabled: previewConfigured },
  });

  // Compose into ClaimableQuarter, filter to those the user actually cares about.
  const claimable: ClaimableQuarter[] = useMemo(() => {
    if (!previewData) return [];
    const rows: ClaimableQuarter[] = [];
    previewData.forEach((res, i) => {
      if (res.status !== 'success' || !res.result) return;
      const tuple = res.result as readonly [bigint, boolean, boolean, bigint];
      const [referrerPoints, claimedFlag, quarterEnded, poolSnapshot] = tuple;
      const points = Number(referrerPoints);
      // Skip quarters where caller had no points at all — these would always
      // revert with ECO_NotEligible if the user pressed Claim.
      if (points === 0) return;
      const period = periods[i];
      if (!period) return;
      rows.push({
        year: period.year,
        quarter: period.quarter,
        referrerPoints: points,
        claimed: claimedFlag,
        quarterEnded,
        poolSnapshot,
        // Without knowing totalYearPoints we can't compute the true share
        // client-side. The on-chain calculation does (pool * userPoints /
        // totalYearPoints), so we show pool * userPoints as an upper-bound
        // signal and label it as such in the UI to set expectations.
        estimatedShare: 0n,
      });
    });
    return rows;
  }, [previewData, periods]);

  const handleClaim = async (q: ClaimableQuarter) => {
    const key = `${q.year}-${q.quarter}`;
    setClaiming(key);
    try {
      await claimReward(q.year, q.quarter);
      toast.success(`Claim submitted for Q${q.quarter} ${q.year}.`);
    } catch (err) {
      // Map common revert paths to friendlier messages. The custom errors
      // live in the contract; viem surfaces them through err.shortMessage.
      const msg = err instanceof Error ? err.message : 'Claim failed';
      if (msg.includes('ECO_TooEarly')) {
        toast.error(`Q${q.quarter} ${q.year} hasn't ended yet on-chain.`);
      } else if (msg.includes('ECO_AlreadyExecuted')) {
        toast.error(`You've already claimed Q${q.quarter} ${q.year}.`);
      } else if (msg.includes('ECO_NotEligible')) {
        toast.error(`No referral points for Q${q.quarter} ${q.year}.`);
      } else if (msg.includes('ECO_InsufficientFunds')) {
        toast.error(`The Q${q.quarter} ${q.year} pool is empty.`);
      } else if (msg.includes('rejected') || msg.includes('denied')) {
        toast.info('Transaction cancelled.');
      } else {
        toast.error('Claim failed: ' + msg.slice(0, 80));
      }
    } finally {
      setClaiming(null);
    }
  };

  if (!isConnected) {
    return (
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-white mb-2">Quarterly Claims</h2>
        <p className="text-zinc-400">
          Connect your wallet to view and claim your share of past headhunter quarters.
        </p>
          <div className="mt-6 flex justify-center">
            <VfideConnectButton size="md" />
          </div>
      </div>
    );
  }

  if (!isConfiguredContractAddress(viewAddress)) {
    return (
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-white mb-2">Quarterly Claims</h2>
        <p className="text-zinc-400">
          The headhunter contract is not deployed on this network yet.
        </p>
      </div>
    );
  }

  const loading = stats.isLoading || previewLoading;

  return (
    <div className="space-y-6">
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-2">
        <h2 className="text-2xl font-bold text-white">Quarterly Claims</h2>
        <p className="text-zinc-400">
          Each ended quarter pays a pro-rata share of that quarter&apos;s pool to every referrer who
          earned points that year. Claims are one-shot per quarter.
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-accent" size={32} aria-hidden="true" />
        </div>
      )}

      {!loading && claimable.length === 0 && (
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 text-center">
          <Trophy className="mx-auto text-zinc-600 mb-3" size={40} aria-hidden="true" />
          <p className="text-zinc-400">
            No claimable quarters yet. Earn referral points and wait for the quarter to end.
          </p>
        </div>
      )}

      {!loading && claimable.length > 0 && (
        <div className="space-y-3">
          {claimable.map((q) => {
            const key = `${q.year}-${q.quarter}`;
            const isClaiming = claiming === key;
            // The button enables only when the quarter has ended on-chain
            // AND the user hasn't already claimed it. We surface the same
            // conditions visually so users aren't confused by a disabled
            // button without explanation.
            const canClaim = q.quarterEnded && !q.claimed && q.poolSnapshot > 0n;
            return (
              <div
                key={key}
                className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-lg font-bold text-white">
                    Q{q.quarter.toString()} {q.year.toString()}
                  </div>
                  <div className="text-sm text-zinc-400 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    <span>
                      Points:{' '}
                      <span className="font-mono text-accent">{q.referrerPoints}</span>
                    </span>
                    <span>
                      Pool:{' '}
                      <span className="font-mono text-zinc-300">
                        {q.poolSnapshot === 0n ? '—' : `${formatEther(q.poolSnapshot)} VFIDE`}
                      </span>
                    </span>
                    <span>
                      Status:{' '}
                      {q.claimed ? (
                        <span className="text-emerald-400 inline-flex items-center gap-1">
                          <CheckCircle size={12} aria-hidden="true" /> Claimed
                        </span>
                      ) : q.quarterEnded ? (
                        <span className="text-accent">Eligible</span>
                      ) : (
                        <span className="text-amber-400">Quarter in progress</span>
                      )}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleClaim(q)}
                  disabled={!canClaim || isClaiming || isPending}
                  aria-label={`Claim Q${q.quarter} ${q.year} reward`}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-light disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 text-sm font-bold transition-colors"
                >
                  {isClaiming ? (
                    <Loader2 className="animate-spin" size={14} aria-hidden="true" />
                  ) : (
                    <ChevronRight size={14} aria-hidden="true" />
                  )}
                  {q.claimed ? 'Claimed' : 'Claim'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex gap-3 text-sm">
        <AlertCircle className="text-amber-400 shrink-0 mt-0.5" size={16} aria-hidden="true" />
        <p className="text-zinc-300">
          Your actual share depends on the year&apos;s total points across all referrers, which is
          computed at claim time. Eligibility here means the quarter ended and you earned points;
          the exact payout shows on the transaction receipt.
        </p>
      </div>
    </div>
  );
}
