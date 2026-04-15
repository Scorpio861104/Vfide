'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatUnits } from 'viem';
import { Clock3, Play, TimerReset, Wallet } from 'lucide-react';

import { GlassCard } from '@/components/ui/GlassCard';
import type { QueuedWithdrawal } from './useVaultOperations';

interface VaultQueueSectionProps {
  cardBoundMode: boolean;
  vaultAddress: `0x${string}` | null | undefined;
  queuedWithdrawals: QueuedWithdrawal[];
  activeQueuedWithdrawals: number;
  maxPerTransfer: bigint;
  dailyTransferLimit: bigint;
  remainingDailyCapacity: bigint;
  largeTransferThreshold: bigint;
  pendingQueueActionIndex: bigint | null;
  pendingQueueActionType: 'execute' | 'cancel' | null;
  spendLimitPerTransfer: string;
  setSpendLimitPerTransfer: (value: string) => void;
  spendLimitPerDay: string;
  setSpendLimitPerDay: (value: string) => void;
  largeTransferThresholdInput: string;
  setLargeTransferThresholdInput: (value: string) => void;
  isUpdatingSpendLimits: boolean;
  isUpdatingLargeTransferThreshold: boolean;
  onExecuteQueuedWithdrawal: (queueIndex: bigint) => Promise<void>;
  onCancelQueuedWithdrawal: (queueIndex: bigint) => Promise<void>;
  onSetSpendLimits: () => Promise<void>;
  onSetLargeTransferThreshold: () => Promise<void>;
}

function formatTokenAmount(value: bigint) {
  return Number(formatUnits(value, 18)).toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}

function formatTimeRemaining(seconds: number) {
  if (seconds <= 0) {
    return 'Ready now';
  }

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${Math.max(1, minutes)}m`;
}

export function VaultQueueSection({
  cardBoundMode,
  vaultAddress,
  queuedWithdrawals,
  activeQueuedWithdrawals,
  maxPerTransfer,
  dailyTransferLimit,
  remainingDailyCapacity,
  largeTransferThreshold,
  pendingQueueActionIndex,
  pendingQueueActionType,
  spendLimitPerTransfer,
  setSpendLimitPerTransfer,
  spendLimitPerDay,
  setSpendLimitPerDay,
  largeTransferThresholdInput,
  setLargeTransferThresholdInput,
  isUpdatingSpendLimits,
  isUpdatingLargeTransferThreshold,
  onExecuteQueuedWithdrawal,
  onCancelQueuedWithdrawal,
  onSetSpendLimits,
  onSetLargeTransferThreshold,
}: VaultQueueSectionProps) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const capacityUsed = useMemo(() => {
    if (dailyTransferLimit <= 0n) {
      return 0n;
    }
    return dailyTransferLimit > remainingDailyCapacity
      ? dailyTransferLimit - remainingDailyCapacity
      : 0n;
  }, [dailyTransferLimit, remainingDailyCapacity]);

  if (!cardBoundMode || !vaultAddress) {
    return null;
  }

  return (
    <section className="py-8 relative z-10">
      <div className="container mx-auto px-4 max-w-6xl">
        <GlassCard className="p-6" hover={false} gradient="cyan">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Clock3 className="text-cyan-400" size={22} />
                  Queued Withdrawals
                </h2>
                <p className="text-sm text-white/60 mt-2">
                  Large CardBound withdrawals wait out the on-chain delay before execution.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-white/40">Active Queue</div>
                  <div className="mt-1 text-lg font-semibold text-white">{activeQueuedWithdrawals}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-white/40">Daily Capacity Left</div>
                  <div className="mt-1 text-lg font-semibold text-white">{formatTokenAmount(remainingDailyCapacity)} VFIDE</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-white/40">Daily Capacity Used</div>
                  <div className="mt-1 text-lg font-semibold text-white">{formatTokenAmount(capacityUsed)} VFIDE</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-sm font-semibold text-white">Spend Limits</div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-white/50">Current Per Transfer</div>
                    <div className="mt-1 text-white font-medium">{formatTokenAmount(maxPerTransfer)} VFIDE</div>
                  </div>
                  <div>
                    <div className="text-white/50">Current Daily Limit</div>
                    <div className="mt-1 text-white font-medium">{formatTokenAmount(dailyTransferLimit)} VFIDE</div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="number"
                    min="0"
                    value={spendLimitPerTransfer}
                    onChange={(event) => setSpendLimitPerTransfer(event.target.value)}
                    placeholder="Per-transfer VFIDE"
                    className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                  />
                  <input
                    type="number"
                    min="0"
                    value={spendLimitPerDay}
                    onChange={(event) => setSpendLimitPerDay(event.target.value)}
                    placeholder="Daily VFIDE"
                    className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onSetSpendLimits()}
                  disabled={isUpdatingSpendLimits || !spendLimitPerTransfer || !spendLimitPerDay}
                  className="mt-3 inline-flex items-center justify-center rounded-xl bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isUpdatingSpendLimits ? 'Updating Spend Limits...' : 'Update Spend Limits'}
                </button>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-sm font-semibold text-white">Large Transfer Queue Threshold</div>
                <div className="mt-3 text-sm text-white/60">
                  Transfers at or above this threshold are queued for the seven-day review window.
                </div>
                <div className="mt-3 text-sm">
                  <span className="text-white/50">Current Threshold</span>
                  <div className="mt-1 text-white font-medium">{formatTokenAmount(largeTransferThreshold)} VFIDE</div>
                </div>
                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                  <input
                    type="number"
                    min="0"
                    value={largeTransferThresholdInput}
                    onChange={(event) => setLargeTransferThresholdInput(event.target.value)}
                    placeholder="Queue threshold VFIDE"
                    className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => onSetLargeTransferThreshold()}
                    disabled={isUpdatingLargeTransferThreshold || largeTransferThresholdInput === ''}
                    className="inline-flex items-center justify-center rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white/80 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isUpdatingLargeTransferThreshold ? 'Updating Threshold...' : 'Update Threshold'}
                  </button>
                </div>
              </div>
            </div>

            {queuedWithdrawals.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-5 py-6 text-sm text-white/60">
                No delayed withdrawals are currently queued.
              </div>
            ) : (
              <div className="space-y-3">
                {queuedWithdrawals.map((item) => {
                  const secondsRemaining = Number(item.executeAfter) - now;
                  const isReady = secondsRemaining <= 0;
                  const isPendingAction = pendingQueueActionIndex === item.index;

                  return (
                    <div
                      key={item.index.toString()}
                      className="rounded-2xl border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-cyan-300">
                              Queue #{item.index.toString()}
                            </span>
                            <span className={`rounded-full px-2 py-1 ${isReady ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
                              {isReady ? 'Ready' : formatTimeRemaining(secondsRemaining)}
                            </span>
                          </div>
                          <div className="text-lg font-semibold text-white">{formatTokenAmount(item.amount)} VFIDE</div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-white/50">
                            <Wallet size={14} />
                            <span>Queued transfer awaiting the seven-day review window.</span>
                            <span>•</span>
                            <span>Execute after {new Date(Number(item.executeAfter) * 1000).toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            type="button"
                            onClick={() => onExecuteQueuedWithdrawal(item.index)}
                            disabled={!isReady || isPendingAction}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Play size={16} />
                            {isPendingAction && pendingQueueActionType === 'execute' ? 'Executing...' : 'Execute'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onCancelQueuedWithdrawal(item.index)}
                            disabled={isPendingAction}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white/80 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <TimerReset size={16} />
                            {isPendingAction && pendingQueueActionType === 'cancel' ? 'Cancelling...' : 'Cancel'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </section>
  );
}