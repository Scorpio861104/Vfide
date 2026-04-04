'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRightCircle, Loader2, RefreshCw } from 'lucide-react';

const ACTIVE_STAGES = new Set(['draft', 'requested', 'approved', 'escrow-funded', 'drawn', 'disputed']);
const STAGE_LABELS: Record<string, string> = {
  draft: 'Draft',
  requested: 'Requested',
  approved: 'Approved',
  'escrow-funded': 'Escrow Funded',
  drawn: 'Borrower Drawn',
  disputed: 'Disputed',
  repaid: 'Repaid',
  'resolved-borrower': 'Resolved to borrower',
  'resolved-lender': 'Resolved to lender',
};

type Lane = {
  id: number;
  stage: string;
  principal: string | number;
  drawn_amount: string | number;
  duration_days: number;
  interest_bps: number;
  collateral_pct: number;
  sim_day: number;
  due_day: number | null;
  evidence_note?: string;
};

type LaneAction = 'request' | 'approve' | 'fund-escrow' | 'draw' | 'repay' | 'raise-dispute' | 'resolve-borrower' | 'resolve-lender' | 'advance-day';

function getPrimaryAction(stage: string): { action: LaneAction; label: string } | null {
  switch (stage) {
    case 'draft':
      return { action: 'request', label: 'Request lane' };
    case 'requested':
      return { action: 'approve', label: 'Approve terms' };
    case 'approved':
      return { action: 'fund-escrow', label: 'Fund escrow' };
    case 'escrow-funded':
      return { action: 'draw', label: 'Borrower draw' };
    case 'drawn':
      return { action: 'repay', label: 'Repay lane' };
    default:
      return null;
  }
}

export function ActiveTab() {
  const [loading, setLoading] = useState(true);
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [actioningLaneId, setActioningLaneId] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});

  const loadLanes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/flashloans/lanes?limit=50');
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error || 'Unable to load flash lanes right now.');
        setLanes([]);
        return;
      }
      setLanes(Array.isArray(data?.lanes) ? data.lanes : []);
    } catch {
      setError('Unable to load flash lanes right now.');
      setLanes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLanes();
  }, [loadLanes]);

  const activeLanes = useMemo(
    () => lanes.filter((lane) => ACTIVE_STAGES.has(lane.stage)),
    [lanes]
  );

  const handleAction = async (laneId: number, action: LaneAction) => {
    setActioningLaneId(laneId);
    setError(null);
    setStatus(null);

    const evidenceNote = notes[laneId]?.trim();

    try {
      const response = await fetch(`/api/flashloans/lanes/${laneId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, evidenceNote }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.lane) {
        setError(data?.error || 'Unable to update the lane right now.');
        return;
      }

      setLanes((current) => current.map((lane) => lane.id === laneId ? data.lane as Lane : lane));
      setStatus(data?.event || `Lane #${laneId} updated.`);
    } catch {
      setError('Unable to update the lane right now.');
    } finally {
      setActioningLaneId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/3 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white">Active flash lanes</h3>
            <p className="text-sm text-gray-400">Track live borrower, lender, and arbiter workflow states from the server API.</p>
          </div>
          <button onClick={() => void loadLanes()} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-gray-200 transition hover:border-cyan-400/40 hover:text-cyan-200">
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>

        {error ? (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
            <AlertCircle size={16} className="mt-0.5" />
            <span>{error}</span>
          </div>
        ) : null}

        {status ? (
          <div className="mb-4 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">
            {status}
          </div>
        ) : null}

        {activeLanes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-gray-400">
            No active flash lanes yet. Start from the Borrow tab to create one.
          </div>
        ) : (
          <div className="space-y-4">
            {activeLanes.map((lane) => {
              const primaryAction = getPrimaryAction(lane.stage);
              return (
                <div key={lane.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-white">Lane #{lane.id}</div>
                      <div className="mt-1 text-sm text-cyan-300">{STAGE_LABELS[lane.stage] || lane.stage}</div>
                    </div>
                    <div className="text-right text-xs text-gray-400">
                      <div>Day {lane.sim_day}</div>
                      <div>{lane.due_day === null ? 'Due after draw' : `Due day ${lane.due_day}`}</div>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm text-gray-300 sm:grid-cols-4">
                    <div><span className="text-gray-500">Principal</span><div className="font-semibold text-white">${Number(lane.principal).toFixed(2)}</div></div>
                    <div><span className="text-gray-500">Drawn</span><div className="font-semibold text-white">${Number(lane.drawn_amount).toFixed(2)}</div></div>
                    <div><span className="text-gray-500">Rate</span><div className="font-semibold text-white">{lane.interest_bps} bps</div></div>
                    <div><span className="text-gray-500">Coverage</span><div className="font-semibold text-white">{lane.collateral_pct}%</div></div>
                  </div>

                  {lane.stage === 'escrow-funded' || lane.stage === 'drawn' || lane.stage === 'disputed' ? (
                    <div className="mt-3">
                      <textarea
                        value={notes[lane.id] ?? lane.evidence_note ?? ''}
                        onChange={(event) => setNotes((current) => ({ ...current, [lane.id]: event.target.value }))}
                        rows={2}
                        placeholder="Add evidence or arbitration note..."
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500"
                      />
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => void handleAction(lane.id, 'advance-day')}
                      disabled={actioningLaneId === lane.id}
                      className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white transition hover:border-cyan-400/40 hover:text-cyan-200 disabled:opacity-60"
                    >
                      {actioningLaneId === lane.id ? 'Working…' : 'Advance day'}
                    </button>

                    {primaryAction ? (
                      <button
                        onClick={() => void handleAction(lane.id, primaryAction.action)}
                        disabled={actioningLaneId === lane.id}
                        className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60"
                      >
                        <ArrowRightCircle size={14} />
                        {primaryAction.label}
                      </button>
                    ) : null}

                    {(lane.stage === 'escrow-funded' || lane.stage === 'drawn') ? (
                      <button
                        onClick={() => void handleAction(lane.id, 'raise-dispute')}
                        disabled={actioningLaneId === lane.id}
                        className="rounded-lg border border-amber-500/30 px-3 py-2 text-sm text-amber-200 transition hover:border-amber-400/50 hover:text-amber-100 disabled:opacity-60"
                      >
                        Raise dispute
                      </button>
                    ) : null}

                    {lane.stage === 'disputed' ? (
                      <>
                        <button
                          onClick={() => void handleAction(lane.id, 'resolve-borrower')}
                          disabled={actioningLaneId === lane.id}
                          className="rounded-lg border border-emerald-500/30 px-3 py-2 text-sm text-emerald-200 transition hover:border-emerald-400/50 hover:text-emerald-100 disabled:opacity-60"
                        >
                          Resolve to borrower
                        </button>
                        <button
                          onClick={() => void handleAction(lane.id, 'resolve-lender')}
                          disabled={actioningLaneId === lane.id}
                          className="rounded-lg border border-rose-500/30 px-3 py-2 text-sm text-rose-200 transition hover:border-rose-400/50 hover:text-rose-100 disabled:opacity-60"
                        >
                          Resolve to lender
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
