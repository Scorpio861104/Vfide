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
import { BorrowTab } from './components/BorrowTab';
import { ActiveTab } from './components/ActiveTab';
import { HistoryTab } from './components/HistoryTab';

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

type TabId = 'borrow' | 'active' | 'history';

type HistoryItem = {
  id: string;
  event: string;
  stage: string;
  detail: string;
};

const TAB_LABELS: Record<TabId, string> = {
  borrow: 'Borrow',
  active: 'Active Loans',
  history: 'History',
};

const TAB_IDS: TabId[] = ['borrow', 'active', 'history'];

export default function FlashlightPage() {
  const [terms, setTerms] = useState<LoanTerms>(INITIAL_TERMS);
  const [simulation, setSimulation] = useState<LoanSimulationState>(INITIAL_STATE);
  const [statusMessage, setStatusMessage] = useState('System: simulation initialized');
  const [errorMessage, setErrorMessage] = useState('');
  const [mode, setMode] = useState<'simulation' | 'server'>('simulation');
  const [serverLaneId, setServerLaneId] = useState<number | null>(null);
  const [evidenceNote, setEvidenceNote] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('borrow');
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([
    {
      id: 'init',
      event: 'initialized',
      stage: STAGE_LABELS[INITIAL_STATE.stage],
      detail: 'System: simulation initialized',
    },
  ]);

  const protection = useMemo(() => getProtectionStatus(terms), [terms]);
  const totalDue = useMemo(() => computeTotalDue(terms), [terms]);

  const recordHistory = (event: string, stage: LoanSimulationState['stage'], detail: string) => {
    setHistoryItems((current) => [
      {
        id: `${Date.now()}-${event}`,
        event,
        stage: STAGE_LABELS[stage],
        detail,
      },
      ...current,
    ].slice(0, 24));
  };

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

    const nextStage = (data.lane?.stage as LoanSimulationState['stage']) ?? 'draft';
    setMode('server');
    setServerLaneId(Number(data.lane?.id ?? 0));
    syncStateFromLane(data.lane ?? {});
    setStatusMessage(`Server lane #${data.lane?.id ?? 'new'} created`);
    recordHistory('create-server-lane', nextStage, `Server lane #${data.lane?.id ?? 'new'} created`);
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

        const nextStage = (data.lane?.stage as LoanSimulationState['stage']) ?? simulation.stage;
        syncStateFromLane(data.lane ?? {});
        setStatusMessage(String(data.event ?? action));
        recordHistory(String(data.event ?? action), nextStage, `Stage moved to ${STAGE_LABELS[nextStage]}`);
        return;
      }

      const result = performAction(action, 'simulator', simulation, terms, { evidenceNote });
      setSimulation(result.state);
      setStatusMessage(result.event);
      recordHistory(result.event, result.state.stage, `Stage moved to ${STAGE_LABELS[result.state.stage]}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Simulation action failed');
    }
  };

  const handleReset = () => {
    setMode('simulation');
    setServerLaneId(null);
    setSimulation(INITIAL_STATE);
    setStatusMessage('System: simulation initialized');
    setErrorMessage('');
    setEvidenceNote('');
    setActiveTab('borrow');
    setHistoryItems([
      {
        id: `${Date.now()}-reset`,
        event: 'reset',
        stage: STAGE_LABELS[INITIAL_STATE.stage],
        detail: 'System: simulation initialized',
      },
    ]);
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

          <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
            {TAB_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                  activeTab === id
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'
                }`}
              >
                {TAB_LABELS[id]}
              </button>
            ))}
          </div>

          {activeTab === 'borrow' ? (
            <BorrowTab
              terms={terms}
              simulation={simulation}
              stageLabel={STAGE_LABELS[simulation.stage]}
              evidenceNote={evidenceNote}
              onDrawnAmountChange={(value) => setTerms((prev) => sanitizeTerms({ ...prev, drawnAmount: value }))}
              onEvidenceNoteChange={setEvidenceNote}
              actionButtons={actionButtons}
              canPerformAction={(action) => canPerformAction(action, 'simulator', simulation, terms)}
              onAction={(action) => void handleAction(action)}
              onReset={handleReset}
            />
          ) : null}

          {activeTab === 'active' ? (
            <ActiveTab
              terms={terms}
              simulation={simulation}
              stageLabel={STAGE_LABELS[simulation.stage]}
              totalDue={totalDue}
            />
          ) : null}

          {activeTab === 'history' ? (
            <HistoryTab items={historyItems} />
          ) : null}
        </div>
      </div>
      <Footer />
    </>
  );
}
