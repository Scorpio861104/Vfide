'use client';

import { useReadContracts } from 'wagmi';
import { type Address, type Abi, formatEther } from 'viem';
import { AlertCircle, AlertTriangle, CheckCircle, Clock, Pause } from 'lucide-react';
import { DevReserveVestingABI } from '@/lib/abis';
import { CONTRACT_ADDRESSES, isConfiguredContractAddress } from '@/lib/contracts';

/**
 * Treasury → VestingTab — DevReserveVesting real-data view.
 *
 * Tier 2 Phase 4 Turn 2 (2026-05-17). Replaces hardcoded schedule
 * (50M VFIDE / 60-day cliff / 60-month linear — 30 bi-monthly unlocks over 5 years) with real on-chain reads
 * via `DevReserveVesting.getVestingStatus()` which returns the aggregate
 * schedule in one call.
 *
 * Tuple shape: (vestingStart, cliffEnd, vestingEnd, totalVested,
 * totalClaimedAmount, claimableNow, remaining, unlocksCompleted,
 * nextUnlockTime, nextUnlockAmount, isPaused)
 *
 * Also reads ALLOCATION + UNLOCK_AMOUNT + UNLOCK_INTERVAL + TOTAL_UNLOCKS
 * for the static schedule parameters that drive the timeline display.
 */
export function VestingTab() {
  const devVaultAddress = CONTRACT_ADDRESSES.DevReserveVesting;
  const configured = isConfiguredContractAddress(devVaultAddress);

  const reads = configured
    ? ([
        { address: devVaultAddress as Address, abi: DevReserveVestingABI as Abi, functionName: 'getVestingStatus' as const },
        { address: devVaultAddress as Address, abi: DevReserveVestingABI as Abi, functionName: 'ALLOCATION' as const },
        { address: devVaultAddress as Address, abi: DevReserveVestingABI as Abi, functionName: 'UNLOCK_AMOUNT' as const },
        { address: devVaultAddress as Address, abi: DevReserveVestingABI as Abi, functionName: 'UNLOCK_INTERVAL' as const },
        { address: devVaultAddress as Address, abi: DevReserveVestingABI as Abi, functionName: 'TOTAL_UNLOCKS' as const },
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

  if (!configured) {
    return (
      <div className="space-y-6">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-amber-400 font-bold mb-1">DevReserveVesting not configured</h3>
            <p className="text-sm text-zinc-400">
              The DevReserveVesting contract address is not configured for the current
              network. Vesting schedule data is unavailable.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border border-purple-500/30 rounded-xl p-6 animate-pulse h-40" />
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6 animate-pulse h-48" />
      </div>
    );
  }

  // Decode getVestingStatus tuple
  const statusEntry = data?.[0];
  if (!statusEntry || statusEntry.status !== 'success') {
    return (
      <div className="space-y-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-red-400 font-bold mb-1">Vesting read failed</h3>
            <p className="text-sm text-zinc-400">
              The vesting status read from the DevReserveVesting contract reverted or returned
              unexpected data. The contract may not be properly initialized.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const status = statusEntry.result as readonly [
    bigint, bigint, bigint, // vestingStart, cliffEnd, vestingEnd  (uint64s, widened to bigint by viem)
    bigint, bigint, bigint, // totalVested, totalClaimedAmount, claimableNow
    bigint,                 // remaining
    bigint, bigint, bigint, // unlocksCompleted, nextUnlockTime, nextUnlockAmount
    boolean,                // isPaused
  ];
  const [
    vestingStart, cliffEnd, vestingEnd,
    totalVested, totalClaimedAmount, claimableNow,
    remaining, unlocksCompleted, nextUnlockTime, _nextUnlockAmount,
    isPaused,
  ] = status;
  void _nextUnlockAmount;

  const decode = <T,>(idx: number, fallback: T): T => {
    const e = data?.[idx];
    if (!e || e.status !== 'success') return fallback;
    return (e.result as T) ?? fallback;
  };
  const allocation = decode<bigint>(1, 0n);
  const unlockAmount = decode<bigint>(2, 0n);
  const unlockInterval = decode<bigint>(3, 0n);
  const totalUnlocks = decode<bigint>(4, 0n);

  // Derived display values
  const totalAllocation = allocation > 0n ? allocation : totalVested + remaining;
  const vestedPct =
    totalAllocation > 0n ? Number((totalVested * 10000n) / totalAllocation) / 100 : 0;
  const nowSec = BigInt(Math.floor(Date.now() / 1000));
  const cliffPassed = cliffEnd > 0n && nowSec >= cliffEnd;
  const vestingComplete = vestingEnd > 0n && nowSec >= vestingEnd;

  return (
    <div className="space-y-8">
      {/* Overview */}
      <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border border-purple-500/30 rounded-xl p-4 sm:p-6 md:p-8">
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <Clock className="w-12 h-12 text-purple-400" />
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-zinc-100">Dev Reserve Vesting</h2>
            <p className="text-zinc-400">
              {formatVFIDECompact(totalAllocation)} VFIDE locked ·{' '}
              {totalUnlocks > 0n ? `${totalUnlocks.toString()} unlocks` : 'schedule pending'} ·{' '}
              {formatInterval(unlockInterval)} cadence
            </p>
          </div>
          {isPaused && (
            <span className="px-3 py-1 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-full text-xs font-bold inline-flex items-center gap-1">
              <Pause size={12} /> Claims paused
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatTile
            value={formatVFIDECompact(totalAllocation)}
            label="Total Allocation"
            sub={`${formatEther(totalAllocation)} VFIDE`}
            valueClass="text-purple-400"
          />
          <StatTile
            value={formatVFIDECompact(totalVested)}
            label="Vested"
            sub={`${vestedPct.toFixed(1)}% of allocation`}
            valueClass="text-green-400"
          />
          <StatTile
            value={formatVFIDECompact(totalClaimedAmount)}
            label="Claimed"
            sub={`${formatEther(totalClaimedAmount)} VFIDE`}
            valueClass="text-zinc-100"
          />
          <StatTile
            value={formatVFIDECompact(claimableNow)}
            label="Claimable Now"
            sub={claimableNow > 0n ? 'beneficiary can claim' : 'nothing to claim'}
            valueClass="text-cyan-400"
          />
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-zinc-100 mb-6">Vesting Timeline</h3>
        <div className="space-y-4">
          <TimelineRow
            icon={
              <CheckCircle
                className={vestingStart > 0n && nowSec >= vestingStart ? 'text-green-400' : 'text-zinc-500'}
                size={24}
              />
            }
            title="Vesting Start"
            sub={formatDate(vestingStart)}
          />
          <TimelineRow
            icon={
              <CheckCircle
                className={cliffPassed ? 'text-green-400' : 'text-zinc-500'}
                size={24}
              />
            }
            title="Cliff End"
            sub={formatDate(cliffEnd)}
          />
          <TimelineRow
            icon={<AlertCircle className={vestingComplete ? 'text-zinc-500' : 'text-yellow-400'} size={24} />}
            title="Linear Unlocks"
            sub={
              unlockAmount > 0n && unlockInterval > 0n
                ? `${formatVFIDECompact(unlockAmount)} VFIDE per ${formatInterval(unlockInterval)} · ${unlocksCompleted.toString()}/${totalUnlocks.toString()} unlocks completed`
                : 'schedule not configured'
            }
          />
          <TimelineRow
            icon={
              <Clock
                className={vestingComplete ? 'text-green-400' : 'text-zinc-400'}
                size={24}
              />
            }
            title="Vesting Complete"
            sub={formatDate(vestingEnd)}
          />
          {!vestingComplete && nextUnlockTime > 0n && (
            <TimelineRow
              icon={<Clock className="text-cyan-400" size={24} />}
              title="Next Unlock"
              sub={`${formatDate(nextUnlockTime)} (${formatRelativeFuture(nextUnlockTime, nowSec)})`}
            />
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-zinc-100 mb-4">Vesting Progress</h3>
        <div className="w-full h-6 bg-zinc-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all"
            style={{ width: `${Math.min(100, Math.max(0, vestedPct)).toFixed(2)}%` }}
          />
        </div>
        <div className="flex justify-between text-sm text-zinc-400 mt-2 tabular-nums">
          <span>{vestedPct.toFixed(2)}% Vested</span>
          <span>
            {unlocksCompleted.toString()} of {totalUnlocks.toString()} unlocks
          </span>
        </div>
      </div>
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
      <div className={`text-2xl font-bold ${valueClass} tabular-nums`}>{value}</div>
      <div className="text-sm text-zinc-400 mt-1">{label}</div>
      {sub && (
        <div className="text-xs text-zinc-500 mt-0.5 truncate" title={sub}>
          {sub}
        </div>
      )}
    </div>
  );
}

function TimelineRow({
  icon,
  title,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div className="min-w-0">
        <div className="text-zinc-100 font-bold">{title}</div>
        <div className="text-sm text-zinc-400">{sub}</div>
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

function formatDate(unixSec: bigint): string {
  if (unixSec === 0n) return 'not set';
  try {
    return new Date(Number(unixSec) * 1000).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return 'invalid';
  }
}

function formatInterval(secs: bigint): string {
  if (secs === 0n) return 'unset';
  const sec = Number(secs);
  const days = Math.floor(sec / 86400);
  if (days >= 60) return `~${Math.round(days / 30)} months`;
  if (days >= 1) return `${days} days`;
  return `${sec}s`;
}

function formatRelativeFuture(unlockSec: bigint, nowSec: bigint): string {
  if (unlockSec <= nowSec) return 'unlocking now';
  const diff = Number(unlockSec - nowSec);
  if (diff < 3600) return `in ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `in ${Math.floor(diff / 3600)}h`;
  return `in ${Math.floor(diff / 86400)}d`;
}
