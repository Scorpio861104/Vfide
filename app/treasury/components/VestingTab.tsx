'use client';

import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

export function VestingTab() {
  const vestingSchedule = {
    total: '50,000,000 VFIDE',
    vested: '8,333,333 VFIDE',
    claimed: '5,000,000 VFIDE',
    claimable: '3,333,333 VFIDE',
    vestingStart: 'June 1, 2025',
    vestingEnd: 'June 1, 2028',
    cliffEnd: 'August 1, 2025',
    biMonthlyUnlock: '2,777,777 VFIDE',
  };

  return (
    <div className="space-y-8">
      {/* Vesting Overview */}
      <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border border-purple-500/30 rounded-xl p-4 sm:p-6 md:p-8 ring-effect">
        <div className="flex items-center gap-4 mb-6">
          <Clock className="w-12 h-12 text-purple-400" />
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">Dev Reserve Vesting</h2>
            <p className="text-zinc-400">50M VFIDE locked with 60-day cliff, 36-month linear vesting (bi-monthly unlocks)</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-400">{vestingSchedule.total}</div>
            <div className="text-sm text-zinc-400">Total Allocation</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-400">{vestingSchedule.vested}</div>
            <div className="text-sm text-zinc-400">Vested</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-2xl font-bold text-zinc-100">{vestingSchedule.claimed}</div>
            <div className="text-sm text-zinc-400">Claimed</div>
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
          <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500" style={{ width: '16.67%' }} />
        </div>
        <div className="flex justify-between text-sm text-zinc-400 mt-2">
          <span>16.67% Vested</span>
          <span>6 of 36 months</span>
        </div>
      </div>
    </div>
  );
}
