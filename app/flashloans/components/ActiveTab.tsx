'use client';

import type { LoanSimulationState, LoanTerms } from '@/lib/flashloans/engine';

interface ServerLanePreview {
  id: string | number;
  stage?: string;
  sim_day?: number;
  due_day?: number | null;
  evidence_note?: string;
  principal?: string | number;
  drawn_amount?: string | number;
}

interface ActiveTabProps {
  terms: LoanTerms;
  simulation: LoanSimulationState;
  stageLabel: string;
  totalDue: number;
  serverLanes: ServerLanePreview[];
  serverLaneLoading: boolean;
  serverLaneError: string | null;
  onAdvanceDay: () => void;
}

function formatServerStage(stage?: string) {
  switch (stage) {
    case 'resolved-lender':
      return 'Resolved to lender';
    case 'resolved-borrower':
      return 'Resolved to borrower';
    case 'escrow-funded':
      return 'Escrow Funded';
    case 'drawn':
      return 'Borrower Drawn';
    default:
      return stage ? stage.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : 'Draft';
  }
}

export function ActiveTab({
  terms,
  simulation,
  stageLabel,
  totalDue,
  serverLanes,
  serverLaneLoading,
  serverLaneError,
  onAdvanceDay,
}: ActiveTabProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-2xl border border-white/10 bg-white/3 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-white">Active Loans</h2>
          <button
            onClick={onAdvanceDay}
            className="rounded-xl border border-cyan-500/30 bg-cyan-500/15 px-3 py-2 text-sm font-bold text-cyan-300"
          >
            Advance day
          </button>
        </div>

        {serverLaneLoading ? (
          <p className="mb-4 text-sm text-gray-400">Loading live server-backed lanes…</p>
        ) : serverLanes.length > 0 ? (
          <div className="mb-4 space-y-3">
            {serverLanes.map((lane) => (
              <div key={lane.id} className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-gray-300">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-white">Lane #{lane.id}</span>
                  <span className="text-cyan-200">{formatServerStage(lane.stage)}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-4 text-xs text-gray-400">
                  <span>Drawn: {lane.drawn_amount ?? '—'} USDC</span>
                  <span>Day: {lane.sim_day ?? 0}</span>
                  <span>Due: {lane.due_day ?? 'Pending'}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mb-4 text-sm text-gray-400">{serverLaneError ?? 'No server-backed lanes loaded yet.'}</p>
        )}

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
