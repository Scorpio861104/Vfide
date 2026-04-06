'use client';

import type { LoanAction, LoanSimulationState, LoanTerms } from '@/lib/flashloans/engine';

interface BorrowTabProps {
  terms: LoanTerms;
  simulation: LoanSimulationState;
  stageLabel: string;
  evidenceNote: string;
  lenderAddress: string;
  arbiterAddress: string;
  onPrincipalChange: (value: number) => void;
  onDurationDaysChange: (value: number) => void;
  onInterestBpsChange: (value: number) => void;
  onCollateralPctChange: (value: number) => void;
  onLenderAddressChange: (value: string) => void;
  onArbiterAddressChange: (value: string) => void;
  onDrawnAmountChange: (value: number) => void;
  onEvidenceNoteChange: (value: string) => void;
  onCreateServerLane: () => void;
  actionButtons: Array<{ label: string; action: LoanAction }>;
  canPerformAction: (action: LoanAction) => boolean;
  onAction: (action: LoanAction) => void;
  onReset: () => void;
}

export function BorrowTab({
  terms,
  simulation,
  stageLabel,
  evidenceNote,
  lenderAddress,
  arbiterAddress,
  onPrincipalChange,
  onDurationDaysChange,
  onInterestBpsChange,
  onCollateralPctChange,
  onLenderAddressChange,
  onArbiterAddressChange,
  onDrawnAmountChange,
  onEvidenceNoteChange,
  onCreateServerLane,
  actionButtons,
  canPerformAction,
  onAction,
  onReset,
}: BorrowTabProps) {
  return (
    <div className="space-y-6 rounded-2xl border border-white/10 bg-white/3 p-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div>
          <label htmlFor="lender-address" className="mb-2 block text-sm font-semibold text-white">Lender address</label>
          <input
            id="lender-address"
            type="text"
            value={lenderAddress}
            onChange={(event) => onLenderAddressChange(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
          />
        </div>
        <div>
          <label htmlFor="arbiter-address" className="mb-2 block text-sm font-semibold text-white">Arbiter address</label>
          <input
            id="arbiter-address"
            type="text"
            value={arbiterAddress}
            onChange={(event) => onArbiterAddressChange(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
          />
        </div>
        <div>
          <label htmlFor="principal" className="mb-2 block text-sm font-semibold text-white">Principal (USDC)</label>
          <input
            id="principal"
            type="number"
            value={terms.principal}
            onChange={(event) => onPrincipalChange(Number(event.target.value) || 0)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
          />
        </div>
        <div>
          <label htmlFor="duration-days" className="mb-2 block text-sm font-semibold text-white">Duration (days)</label>
          <input
            id="duration-days"
            type="number"
            value={terms.durationDays}
            onChange={(event) => onDurationDaysChange(Number(event.target.value) || 0)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
          />
        </div>
        <div>
          <label htmlFor="interest-bps" className="mb-2 block text-sm font-semibold text-white">Interest (bps)</label>
          <input
            id="interest-bps"
            type="number"
            value={terms.interestBps}
            onChange={(event) => onInterestBpsChange(Number(event.target.value) || 0)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
          />
        </div>
        <div>
          <label htmlFor="collateral-pct" className="mb-2 block text-sm font-semibold text-white">Collateral (%)</label>
          <input
            id="collateral-pct"
            type="number"
            value={terms.collateralPct}
            onChange={(event) => onCollateralPctChange(Number(event.target.value) || 0)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="drawn-amount" className="mb-2 block text-sm font-semibold text-white">Drawn Amount (USDC)</label>
          <input
            id="drawn-amount"
            type="number"
            value={terms.drawnAmount}
            onChange={(event) => onDrawnAmountChange(Number(event.target.value) || 0)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-white">Current Stage</label>
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/15 px-4 py-3 font-bold text-cyan-200">
            {stageLabel}
          </div>
        </div>
      </div>

      <textarea
        value={evidenceNote}
        onChange={(event) => onEvidenceNoteChange(event.target.value)}
        placeholder="Attach borrower/lender evidence summary..."
        className="min-h-28 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500"
      />

      {simulation.stage === 'disputed' ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-100">DAO Arbitration Required</div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={onCreateServerLane}
          className="rounded-xl border border-cyan-500/30 bg-cyan-500/15 px-4 py-2 text-sm font-bold text-cyan-300"
        >
          Create Flash Lane
        </button>
        {actionButtons.map(({ label, action }) => (
          <button
            key={action}
            onClick={() => onAction(action)}
            disabled={!canPerformAction(action)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {label}
          </button>
        ))}
        <button
          onClick={onReset}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
