'use client';

import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

function formatTokenAmount(value: number) {
  if (value <= 0) {
    return '0 VFIDE';
  }

  return `${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value)} VFIDE`;
}

export function VestingTab({
  vestingBalance = 0,
  contractsReady = false,
}: {
  vestingBalance?: number;
  contractsReady?: boolean;
} = {}) {
  const TOTAL_ALLOCATION = 50_000_000;
  const vestingStart = new Date('2025-06-01T00:00:00Z');
  const cliffEnd = new Date('2025-08-01T00:00:00Z');
  const vestingEnd = new Date('2028-06-01T00:00:00Z');
  const now = new Date();

  const progressRatio = now <= cliffEnd
    ? 0
    : Math.min(1, (now.getTime() - cliffEnd.getTime()) / (vestingEnd.getTime() - cliffEnd.getTime()));

  const vestedAmount = TOTAL_ALLOCATION * progressRatio;
  const claimableAmount = contractsReady && vestingBalance > 0
    ? Math.min(vestingBalance, vestedAmount)
    : vestedAmount;
  const claimedAmount = Math.max(0, vestedAmount - claimableAmount);
  const biMonthlyUnlock = TOTAL_ALLOCATION / 18;
  const elapsedMonths = Math.max(0, Math.min(36, Math.round((now.getTime() - vestingStart.getTime()) / (1000 * 60 * 60 * 24 * 30))));

  const vestingSchedule = {
    total: formatTokenAmount(TOTAL_ALLOCATION),
    vested: formatTokenAmount(vestedAmount),
    claimed: formatTokenAmount(claimedAmount),
    claimable: formatTokenAmount(claimableAmount),
    vestingStart: vestingStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    vestingEnd: vestingEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    cliffEnd: cliffEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    biMonthlyUnlock: formatTokenAmount(biMonthlyUnlock),
    progressPercent: `${(progressRatio * 100).toFixed(2)}%`,
    elapsedMonths: `${elapsedMonths} of 36 months`,
  };

  return (
    <div className="space-y-8">
      {/* Vesting Overview */}
      <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border border-purple-500/30 rounded-xl p-4 sm:p-6 md:p-8 ring-effect">
        <div className="flex items-center gap-4 mb-6">
          <Clock className="w-12 h-12 text-purple-400" />
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">Dev Reserve Vesting</h2>
            <p className="text-zinc-400">50M VFIDE locked with a 60-day cliff and 36-month linear vesting schedule.</p>
          </div>
        </div>
        <div className="mb-4 rounded-lg border border-purple-500/20 bg-black/20 p-3 text-sm text-zinc-300">
          {contractsReady
            ? 'Live vesting balances are now blended with the published vesting schedule.'
            : 'The schedule below is calculated from the published vesting timeline until live contract addresses are restored.'}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-400">{vestingSchedule.total}</div>
            <div className="text-sm text-zinc-400">Total Allocation</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-400">{vestingSchedule.vested}</div>
            <div className="text-sm text-zinc-400">Vested to Date</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-2xl font-bold text-zinc-100">{vestingSchedule.claimed}</div>
            <div className="text-sm text-zinc-400">Estimated Claimed</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-2xl font-bold text-cyan-400">{vestingSchedule.claimable}</div>
            <div className="text-sm text-zinc-400">Claimable Now</div>
          </div>
        </div>
      </div>

      {/* Vesting Timeline */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-zinc-100 mb-6">Vesting Timeline</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <CheckCircle className="text-green-400" size={24} />
            <div>
              <div className="text-zinc-100 font-bold">Vesting Start</div>
              <div className="text-sm text-zinc-400">{vestingSchedule.vestingStart}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <CheckCircle className="text-green-400" size={24} />
            <div>
              <div className="text-zinc-100 font-bold">Cliff End</div>
              <div className="text-sm text-zinc-400">{vestingSchedule.cliffEnd}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <AlertCircle className="text-yellow-400" size={24} />
            <div>
              <div className="text-zinc-100 font-bold">Linear Vesting</div>
              <div className="text-sm text-zinc-400">{vestingSchedule.biMonthlyUnlock}/bi-monthly</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Clock className="text-zinc-400" size={24} />
            <div>
              <div className="text-zinc-100 font-bold">Vesting Complete</div>
              <div className="text-sm text-zinc-400">{vestingSchedule.vestingEnd}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-zinc-100 mb-4">Vesting Progress</h3>
        <div className="w-full h-6 bg-zinc-900 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500" style={{ width: vestingSchedule.progressPercent }} />
        </div>
        <div className="flex justify-between text-sm text-zinc-400 mt-2">
          <span>{vestingSchedule.progressPercent} vested</span>
          <span>{vestingSchedule.elapsedMonths}</span>
        </div>
      </div>
    </div>
  );
}
