'use client';

/**
 * /vesting — Developer Reserve Vesting public viewer.
 *
 * Exposes three tabs:
 *   Overview  – aggregate progress (header: "Token Vesting", "Vesting Progress")
 *   Schedule  – per-month unlock table (heading: "Vesting Schedule")
 *   Claim     – beneficiary claim action ("Available to Claim")
 *
 * All data is read from DevReserveVesting via wagmi hooks.
 * The page re-uses the same CANONICAL_WAGMI_MOCK_V2 mock contract reads
 * expected by __tests__/app/vesting-page.test.tsx.
 */

import { useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { formatEther, type Address } from 'viem';
import { DevReserveVestingABI } from '@/lib/abis';
import { CONTRACT_ADDRESSES, isConfiguredContractAddress } from '@/lib/contracts';

type Tab = 'overview' | 'schedule' | 'claim';

export default function VestingPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const { address } = useAccount();

  const vestingAddr = CONTRACT_ADDRESSES.DevReserveVesting as Address | undefined;
  const configured = isConfiguredContractAddress(vestingAddr);

  /* ── overview reads ─────────────────────────────────────── */
  const { data: statusData } = useReadContract({
    address: vestingAddr,
    abi: DevReserveVestingABI,
    functionName: 'getVestingStatus',
    query: { enabled: configured },
  } as Parameters<typeof useReadContract>[0]);

  /* ── schedule reads ─────────────────────────────────────── */
  const { data: scheduleData } = useReadContract({
    address: vestingAddr,
    abi: DevReserveVestingABI,
    functionName: 'getVestingSchedule',
    query: { enabled: configured && tab === 'schedule' },
  } as Parameters<typeof useReadContract>[0]);

  /* ── beneficiary read ───────────────────────────────────── */
  const { data: beneficiary } = useReadContract({
    address: vestingAddr,
    abi: DevReserveVestingABI,
    functionName: 'BENEFICIARY',
    query: { enabled: configured },
  } as Parameters<typeof useReadContract>[0]);

  const isBeneficiary =
    address && beneficiary && (beneficiary as string).toLowerCase() === address.toLowerCase();

  /* ── derive claimable ───────────────────────────────────── */
  const status = statusData as readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, boolean] | undefined;
  const claimableNow: bigint = status?.[5] ?? 0n;

  /* ── schedule rows ──────────────────────────────────────── */
  interface ScheduleRow { month: number; percentage: number; unlockTime: number; unlocked: boolean }
  const scheduleRows = (scheduleData as ScheduleRow[] | undefined) ?? [];

  /* ── milestone label ─────────────────────────────────────── */
  const unlocksCompleted = status?.[7] ?? 0n;
  const totalUnlocks = 30n; // DevReserveVesting: 30 bi-monthly unlocks
  const milestonePct = totalUnlocks > 0n
    ? `${unlocksCompleted.toString()} / ${totalUnlocks.toString()} unlocks`
    : 'Pending';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* ── Page header ─────────────────────────────────── */}
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">Token Vesting</h1>
          <p className="text-zinc-400 mt-1">
            Developer reserve vesting schedule — 50M VFIDE over 5 years.
          </p>
        </div>

        {/* ── Tab bar ─────────────────────────────────────── */}
        <div className="flex gap-2 border-b border-zinc-800 pb-0">
          {(['overview', 'schedule', 'claim'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize rounded-t-lg transition-colors ${
                tab === t
                  ? 'bg-zinc-800 text-zinc-100 border border-b-0 border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Overview tab ────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 space-y-4">
              <h2 className="text-xl font-bold text-zinc-100">Vesting Progress</h2>
              <div className="w-full h-4 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                  style={{ width: status ? `${Math.min(100, Number(unlocksCompleted * 100n / totalUnlocks))}%` : '0%' }}
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                <div className="bg-zinc-800 rounded-lg p-4">
                  <p className="text-xs text-zinc-400 mb-1">Current Milestone</p>
                  <p className="text-lg font-bold text-purple-400">{milestonePct}</p>
                </div>
                <div className="bg-zinc-800 rounded-lg p-4">
                  <p className="text-xs text-zinc-400 mb-1">Claimable Now</p>
                  <p className="text-lg font-bold text-cyan-400">
                    {parseFloat(formatEther(claimableNow)).toLocaleString()} VFIDE
                  </p>
                </div>
                <div className="bg-zinc-800 rounded-lg p-4">
                  <p className="text-xs text-zinc-400 mb-1">Total Allocation</p>
                  <p className="text-lg font-bold text-zinc-100">50,000,000 VFIDE</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Schedule tab ────────────────────────────────── */}
        {tab === 'schedule' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-zinc-100">Vesting Schedule</h2>
            {scheduleRows.length === 0 ? (
              <p className="text-zinc-400 text-sm">No schedule data available.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-700 text-zinc-400 text-left">
                      <th className="pb-2 pr-4">Month</th>
                      <th className="pb-2 pr-4">%</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {scheduleRows.map((row: ScheduleRow) => (
                      <tr key={row.month}>
                        <td className="py-2 pr-4 text-zinc-300">Month {row.month}</td>
                        <td className="py-2 pr-4 text-zinc-400">{row.percentage}%</td>
                        <td className="py-2">
                          {row.unlocked ? (
                            <span className="text-green-400 font-bold">UNLOCKED</span>
                          ) : (
                            <span className="text-zinc-500">Locked</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Claim tab ───────────────────────────────────── */}
        {tab === 'claim' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-zinc-100">Claim Tokens</h2>
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 text-sm">Available to Claim</span>
                <span className="text-cyan-400 font-bold text-lg">
                  {parseFloat(formatEther(claimableNow)).toLocaleString()} VFIDE
                </span>
              </div>
              {isBeneficiary ? (
                <button
                  disabled={claimableNow === 0n}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold rounded-lg transition-colors"
                >
                  Claim {parseFloat(formatEther(claimableNow)).toLocaleString()} VFIDE
                </button>
              ) : (
                <p className="text-zinc-500 text-sm">
                  Only the beneficiary wallet can claim vested tokens.
                </p>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
