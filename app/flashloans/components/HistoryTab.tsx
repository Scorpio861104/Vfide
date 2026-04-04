'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

const HISTORY_STAGES = new Set(['repaid', 'resolved-borrower', 'resolved-lender']);
const HISTORY_LABELS: Record<string, string> = {
  repaid: 'Repaid',
  'resolved-borrower': 'Resolved to borrower',
  'resolved-lender': 'Resolved to lender',
};

type Lane = {
  id: number;
  stage: string;
  principal: string | number;
  drawn_amount: string | number;
  sim_day: number;
  due_day: number | null;
  evidence_note?: string;
};

export function HistoryTab() {
  const [loading, setLoading] = useState(true);
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/flashloans/lanes?limit=50');
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error || 'Unable to load lane history right now.');
        setLanes([]);
        return;
      }
      setLanes(Array.isArray(data?.lanes) ? data.lanes : []);
    } catch {
      setError('Unable to load lane history right now.');
      setLanes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const historyLanes = useMemo(
    () => lanes.filter((lane) => HISTORY_STAGES.has(lane.stage)),
    [lanes]
  );

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
        <h3 className="mb-2 text-lg font-bold text-white">History</h3>
        <p className="mb-4 text-sm text-gray-400">Past flash loan outcomes pulled from the shared server lane store.</p>

        {error ? (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
            <AlertCircle size={16} className="mt-0.5" />
            <span>{error}</span>
          </div>
        ) : null}

        {historyLanes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-gray-400">
            No completed flash loan outcomes yet.
          </div>
        ) : (
          <div className="space-y-3">
            {historyLanes.map((lane) => (
              <div key={lane.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold text-white">Lane #{lane.id}</div>
                    <div className="mt-1 inline-flex items-center gap-2 text-sm text-emerald-300">
                      <CheckCircle2 size={14} />
                      {HISTORY_LABELS[lane.stage] || lane.stage}
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    <div>Closed on day {lane.sim_day}</div>
                    <div>{lane.due_day === null ? 'No due date' : `Due day ${lane.due_day}`}</div>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 text-sm text-gray-300 sm:grid-cols-2">
                  <div><span className="text-gray-500">Principal</span><div className="font-semibold text-white">${Number(lane.principal).toFixed(2)}</div></div>
                  <div><span className="text-gray-500">Drawn</span><div className="font-semibold text-white">${Number(lane.drawn_amount).toFixed(2)}</div></div>
                </div>

                {lane.evidence_note ? (
                  <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300">
                    {lane.evidence_note}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
