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

interface ServerLane {
  id: number | string;
  principal?: number | string;
  duration_days?: number;
  interest_bps?: number;
  collateral_pct?: number;
  drawn_amount?: number | string;
  stage?: string;
  sim_day?: number;
  due_day?: number | null;
  evidence_note?: string;
}

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

function normalizeStage(value: unknown): LoanSimulationState['stage'] {
  const stage = String(value ?? 'draft') as LoanSimulationState['stage'];
  return stage in STAGE_LABELS ? stage : 'draft';
}

function toNumberOrNull(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function FlashLoansPage() {
  const [terms, setTerms] = useState<LoanTerms>(INITIAL_TERMS);
  const [simulation, setSimulation] = useState<LoanSimulationState>(INITIAL_STATE);
  const [statusMessage, setStatusMessage] = useState('System: simulation initialized');
  const [errorMessage, setErrorMessage] = useState('');
  const [mode, setMode] = useState<'simulation' | 'server'>('simulation');
  const [serverLaneId, setServerLaneId] = useState<number | null>(null);
  const [serverLanes, setServerLanes] = useState<ServerLane[]>([]);
  const [serverLaneLoading, setServerLaneLoading] = useState(false);
  const [serverLaneError, setServerLaneError] = useState<string | null>(null);
  const [lenderAddress, setLenderAddress] = useState('0x2222222222222222222222222222222222222222');
  const [arbiterAddress, setArbiterAddress] = useState('0x3333333333333333333333333333333333333333');
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

  const upsertServerLane = (lane: ServerLane | null | undefined) => {
    if (!lane?.id) return;
    setServerLanes((current) => {
      const next = current.filter((entry) => Number(entry.id) !== Number(lane.id));
      return [lane, ...next];
    });
  };

  const syncStateFromLane = (lane: ServerLane | null | undefined) => {
    if (!lane) return;

    setSimulation({
      stage: normalizeStage(lane.stage),
      simDay: Number(lane.sim_day ?? 0),
      dueDay: lane.due_day ?? null,
      evidenceNote: String(lane.evidence_note ?? ''),
    });

    setEvidenceNote(String(lane.evidence_note ?? ''));

    setTerms((prev) =>
      sanitizeTerms({
        principal: toNumberOrNull(lane.principal) ?? prev.principal,
        durationDays: toNumberOrNull(lane.duration_days) ?? prev.durationDays,
        interestBps: toNumberOrNull(lane.interest_bps) ?? prev.interestBps,
        collateralPct: toNumberOrNull(lane.collateral_pct) ?? prev.collateralPct,
        drawnAmount: toNumberOrNull(lane.drawn_amount) ?? prev.drawnAmount,
      })
    );
  };

  const loadServerLanes = async () => {
    setServerLaneLoading(true);
    setServerLaneError(null);

    try {
      const response = await fetch('/api/flashloans/lanes?limit=50');
      const data = await response.json().catch(() => ({ lanes: [] }));

      if (!response.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to load lanes');
      }

      setServerLanes(Array.isArray(data?.lanes) ? data.lanes : []);
    } catch (error) {
      setServerLanes([]);
      setServerLaneError(error instanceof Error ? error.message : 'Failed to load server lanes');
    } finally {
      setServerLaneLoading(false);
    }
  };

  const handleCreateServerLane = async () => {
    setErrorMessage('');

    try {
      const response = await fetch('/api/flashloans/lanes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lenderAddress,
          arbiterAddress,
          principal: terms.principal,
          durationDays: terms.durationDays,
          interestBps: terms.interestBps,
          collateralPct: terms.collateralPct,
          drawnAmount: terms.drawnAmount,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(String(data.error ?? 'Failed to create server lane'));
        return;
      }

      const nextStage = normalizeStage(data.lane?.stage);
      setMode('server');
      setServerLaneId(Number(data.lane?.id ?? 0) || null);
      syncStateFromLane(data.lane ?? null);
      upsertServerLane(data.lane ?? null);
      setStatusMessage(`Lane #${data.lane?.id ?? 'new'} is ready`);
      recordHistory('create-server-lane', nextStage, `Lane #${data.lane?.id ?? 'new'} is ready`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create server lane');
    }
  };

  const handleAction = async (action: LoanAction, overrideLaneId?: number | null) => {
    setErrorMessage('');

    try {
      const activeLaneId = overrideLaneId ?? serverLaneId;

      if ((mode === 'server' || activeLaneId) && activeLaneId) {
        const response = await fetch(`/api/flashloans/lanes/${activeLaneId}/actions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, drawnAmount: terms.drawnAmount, evidenceNote }),
        });
        const data = await response.json();

        if (!response.ok) {
          setErrorMessage(String(data.error ?? 'Server action failed'));
          return;
        }

        const nextStage = normalizeStage(data.lane?.stage ?? simulation.stage);
        setMode('server');
        setServerLaneId(activeLaneId);
        syncStateFromLane(data.lane ?? null);
        upsertServerLane(data.lane ?? null);
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
                onClick={() => {
                  setActiveTab(id);
                  if (id !== 'borrow') {
                    void loadServerLanes();
                  }
                }}
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
              lenderAddress={lenderAddress}
              arbiterAddress={arbiterAddress}
              onPrincipalChange={(value) => setTerms((prev) => sanitizeTerms({ ...prev, principal: value }))}
              onDurationDaysChange={(value) => setTerms((prev) => sanitizeTerms({ ...prev, durationDays: value }))}
              onInterestBpsChange={(value) => setTerms((prev) => sanitizeTerms({ ...prev, interestBps: value }))}
              onCollateralPctChange={(value) => setTerms((prev) => sanitizeTerms({ ...prev, collateralPct: value }))}
              onLenderAddressChange={setLenderAddress}
              onArbiterAddressChange={setArbiterAddress}
              onDrawnAmountChange={(value) => setTerms((prev) => sanitizeTerms({ ...prev, drawnAmount: value }))}
              onEvidenceNoteChange={setEvidenceNote}
              onCreateServerLane={() => void handleCreateServerLane()}
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
              serverLanes={serverLanes}
              serverLaneLoading={serverLaneLoading}
              serverLaneError={serverLaneError}
              onAdvanceDay={() => void handleAction('advance-day', Number(serverLanes[0]?.id ?? serverLaneId ?? 0) || null)}
            />
          ) : null}

          {activeTab === 'history' ? (
            <HistoryTab items={historyItems} serverLanes={serverLanes} />
          ) : null}
        </div>
      </div>
      <Footer />
    </>
  );
}
