'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Footer } from '@/components/layout/Footer';
import {
  canPerformAction,
  computeTotalDue,
  getProtectionStatus,
  performAction,
  sanitizeTerms,
  type LoanAction,
  type LoanSimulationState,
  type LoanTerms,
} from '@/lib/flashloans/engine';

const STAGE_LABELS: Record<LoanSimulationState['stage'], string> = {
  draft: 'Draft',
  requested: 'Requested',
  approved: 'Approved',
  'escrow-funded': 'Escrow Funded',
  drawn: 'Borrower Drawn',
  repaid: 'Repaid',
  disputed: 'Disputed',
  'resolved-borrower': 'Resolved: Borrower',
  'resolved-lender': 'Resolved: Lender',
};

const INITIAL_TERMS: LoanTerms = sanitizeTerms({
  principal: 1500,
  durationDays: 14,
  interestBps: 600,
  collateralPct: 125,
  drawnAmount: 500,
});

const INITIAL_STATE: LoanSimulationState = {
  stage: 'draft',
  simDay: 0,
  dueDay: null,
  evidenceNote: '',
};

export default function FlashlightPage() {
  const [terms, setTerms] = useState<LoanTerms>(INITIAL_TERMS);
  const [simulation, setSimulation] = useState<LoanSimulationState>(INITIAL_STATE);
  const [statusMessage, setStatusMessage] = useState('System: simulation initialized');
  const [errorMessage, setErrorMessage] = useState('');
  const [mode, setMode] = useState<'simulation' | 'server'>('simulation');
  const [serverLaneId, setServerLaneId] = useState<number | null>(null);
  const [evidenceNote, setEvidenceNote] = useState('');

  const protection = useMemo(() => getProtectionStatus(terms), [terms]);
  const totalDue = useMemo(() => computeTotalDue(terms), [terms]);

  const syncStateFromLane = (lane: Record<string, any>) => {
    setSimulation({
      stage: (lane.stage as LoanSimulationState['stage']) ?? 'draft',
      simDay: Number(lane.sim_day ?? 0),
      dueDay: lane.due_day ?? null,
      evidenceNote: String(lane.evidence_note ?? ''),
    });
    if (lane.drawn_amount) {
      setTerms((prev) => sanitizeTerms({ ...prev, drawnAmount: Number(lane.drawn_amount) || prev.drawnAmount }));
    }
  };

  const handleCreateServerLane = async () => {
    setErrorMessage('');
    const response = await fetch('/api/flashloans/lanes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        borrower_address: '0x1111111111111111111111111111111111111111',
        lender_address: '0x2222222222222222222222222222222222222222',
        arbiter_address: '0x3333333333333333333333333333333333333333',
        principal: String(terms.principal),
        duration_days: terms.durationDays,
        interest_bps: terms.interestBps,
        collateral_pct: terms.collateralPct,
        drawn_amount: String(terms.drawnAmount),
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      setErrorMessage(String(data.error ?? 'Failed to create server lane'));
      return;
    }

    setMode('server');
    setServerLaneId(Number(data.lane?.id ?? 0));
    syncStateFromLane(data.lane ?? {});
    setStatusMessage(`Server lane #${data.lane?.id ?? 'new'} created`);
  };

  const handleAction = async (action: LoanAction) => {
    setErrorMessage('');

    try {
      if (mode === 'server' && serverLaneId) {
        const response = await fetch(`/api/flashloans/lanes/${serverLaneId}/actions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, role: 'simulator', state: simulation, terms, evidenceNote }),
        });
        const data = await response.json();

        if (!response.ok) {
          setErrorMessage(String(data.error ?? 'Server action failed'));
          return;
        }

        syncStateFromLane(data.lane ?? {});
        setStatusMessage(String(data.event ?? action));
        return;
      }

      const result = performAction(action, 'simulator', simulation, terms, { evidenceNote });
      setSimulation(result.state);
      setStatusMessage(result.event);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Simulation action failed');
    }
  };

  const actionButtons: Array<{ label: string; action: LoanAction }> = [
    { label: 'Request Lane', action: 'request' },
    { label: 'Lender Approve Terms', action: 'approve' },
    { label: 'Fund Escrow', action: 'fund-escrow' },
    { label: 'Borrower Draw', action: 'draw' },
    { label: 'Repay + Close', action: 'repay' },
    { label: 'Raise Dispute', action: 'raise-dispute' },
    { label: 'Resolve to Lender', action: 'resolve-lender' },
    { label: 'Resolve to Borrower', action: 'resolve-borrower' },
  ];

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20">
        <div className="container mx-auto max-w-6xl px-4 py-8">
          <h1 className="mb-2 text-4xl font-bold text-white">
            Flashloans P2P Borrowing, Built on Trust
          </h1>
          <p className="mb-8 text-white/60">Zero-collateral instant lending flows with transparent borrower, lender, and arbiter protections.</p>

          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/3 p-6">
              <h2 className="mb-3 text-2xl font-bold text-white">Fairness & Compliance</h2>
              <p className="mb-3 text-gray-300">Terms remain lender-safe and borrower-readable throughout the full request → escrow → draw → repay cycle.</p>
              <p className="text-sm text-emerald-300">
                {protection.borrowerProtected && protection.lenderProtected
                  ? 'Both parties are currently protected under configured terms.'
                  : 'Protection thresholds need adjustment before lane request.'}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/3 p-6">
              <h2 className="mb-3 text-2xl font-bold text-white">Live P2P Flow Simulator</h2>
              <p className="text-sm text-cyan-200">{statusMessage}</p>
              {errorMessage ? <p className="mt-2 text-sm text-red-300">{errorMessage}</p> : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={handleCreateServerLane} className="rounded-xl border border-cyan-500/30 bg-cyan-500/15 px-4 py-2 text-sm font-bold text-cyan-300">
                  Create Server Lane
                </button>
                {serverLaneId ? <button className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white">Server Lane #{serverLaneId}</button> : null}
                <button className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white">Mode: {mode === 'server' ? 'Server' : 'Simulation'}</button>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6 rounded-2xl border border-white/10 bg-white/3 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="drawn-amount" className="mb-2 block text-sm font-semibold text-white">Drawn Amount (USDC)</label>
                  <input
                    id="drawn-amount"
                    type="number"
                    value={terms.drawnAmount}
                    onChange={(event) => setTerms((prev) => sanitizeTerms({ ...prev, drawnAmount: Number(event.target.value) || 0 }))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-white">Current Stage</label>
                  <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/15 px-4 py-3 font-bold text-cyan-200">
                    {STAGE_LABELS[simulation.stage]}
                  </div>
                </div>
              </div>

              <textarea
                value={evidenceNote}
                onChange={(event) => setEvidenceNote(event.target.value)}
                placeholder="Attach borrower/lender evidence summary..."
                className="min-h-28 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500"
              />

              {simulation.stage === 'disputed' ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-100">DAO Arbitration Required</div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {actionButtons.map(({ label, action }) => (
                  <button
                    key={action}
                    onClick={() => handleAction(action)}
                    disabled={!canPerformAction(action, 'simulator', simulation, terms)}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {label}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setMode('simulation');
                    setServerLaneId(null);
                    setSimulation(INITIAL_STATE);
                    setStatusMessage('System: simulation initialized');
                    setErrorMessage('');
                    setEvidenceNote('');
                  }}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/3 p-6">
              <h2 className="mb-4 text-xl font-bold text-white">Lane Snapshot</h2>
              <div className="space-y-3 text-sm text-gray-300">
                <div className="flex items-center justify-between"><span>Principal</span><span>{terms.principal} USDC</span></div>
                <div className="flex items-center justify-between"><span>Interest</span><span>{terms.interestBps} bps</span></div>
                <div className="flex items-center justify-between"><span>Collateral</span><span>{terms.collateralPct}%</span></div>
                <div className="flex items-center justify-between"><span>Total Due</span><span>{totalDue.toFixed(2)} USDC</span></div>
                <div className="flex items-center justify-between"><span>Sim Day</span><span>{simulation.simDay}</span></div>
                <div className="flex items-center justify-between"><span>Due Day</span><span>{simulation.dueDay ?? 'Pending draw'}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
