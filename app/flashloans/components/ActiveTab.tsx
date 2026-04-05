'use client';

import type { LoanSimulationState, LoanTerms } from '@/lib/flashloans/engine';

interface ActiveTabProps {
  terms: LoanTerms;
  simulation: LoanSimulationState;
  stageLabel: string;
  totalDue: number;
}

export function ActiveTab({ terms, simulation, stageLabel, totalDue }: ActiveTabProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-2xl border border-white/10 bg-white/3 p-6">
        <h2 className="mb-4 text-xl font-bold text-white">Active Loans</h2>
        <div className="space-y-3 text-sm text-gray-300">
          <div className="flex items-center justify-between"><span>Current Stage</span><span className="font-semibold text-cyan-200">{stageLabel}</span></div>
          <div className="flex items-center justify-between"><span>Evidence Notes</span><span>{simulation.evidenceNote || 'Pending'}</span></div>
          <div className="flex items-center justify-between"><span>Sim Day</span><span>{simulation.simDay}</span></div>
          <div className="flex items-center justify-between"><span>Due Day</span><span>{simulation.dueDay ?? 'Pending draw'}</span></div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/3 p-6">
        <h2 className="mb-4 text-xl font-bold text-white">Lane Snapshot</h2>
        <div className="space-y-3 text-sm text-gray-300">
          <div className="flex items-center justify-between"><span>Principal</span><span>{terms.principal} USDC</span></div>
          <div className="flex items-center justify-between"><span>Interest</span><span>{terms.interestBps} bps</span></div>
          <div className="flex items-center justify-between"><span>Collateral</span><span>{terms.collateralPct}%</span></div>
          <div className="flex items-center justify-between"><span>Total Due</span><span>{totalDue.toFixed(2)} USDC</span></div>
          <div className="flex items-center justify-between"><span>Lane Status</span><span className="font-semibold text-white">{simulation.dueDay === null ? 'Awaiting draw' : 'Timer armed'}</span></div>
        </div>
      </div>
    </div>
  );
}
