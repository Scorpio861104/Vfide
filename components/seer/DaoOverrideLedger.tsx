'use client';

/**
 * DaoOverrideLedger — the public transparency dashboard for DAO overrides of Seer decisions (Phase 2).
 * "The DAO governs the Seer; both must be auditable." Read-only; anyone can inspect it.
 */

import { useDaoOverrides } from '@/hooks/useDaoOverrides';
import { Scale, FileText } from 'lucide-react';

const TYPE_LABEL: Record<string, string> = {
  cooldown: 'Cooldown',
  stabilization_fee: 'Stabilization fee',
  emergency_decision: 'Emergency decision',
  fraud_classification: 'Fraud classification',
  marketplace_penalty: 'Marketplace penalty',
  lending_recommendation: 'Lending recommendation',
  extraction_classification: 'Extraction classification',
  other: 'Other',
};

export function DaoOverrideLedger() {
  const { overrides, summary, loading } = useDaoOverrides();

  if (loading) return <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-sm text-zinc-500">Loading the override ledger…</div>;

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
      <div className="flex items-center gap-2.5">
        <Scale size={18} className="text-cyan-300/80" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-white">DAO override ledger</h2>
      </div>
      <p className="mt-1 text-sm text-zinc-400">Every time the DAO overrides a Seer decision, it's recorded here — publicly, with the reason. The DAO governs the Seer, and the DAO is itself auditable.</p>

      {summary.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {summary.map((s) => (
            <span key={s.override_type} className="rounded-full bg-white/[0.05] px-2.5 py-1 text-xs text-zinc-300">
              {TYPE_LABEL[s.override_type] ?? s.override_type}: {s.n}
            </span>
          ))}
        </div>
      )}

      {overrides.length === 0 ? (
        <p className="mt-5 text-sm text-zinc-500">No overrides have been recorded. The Seer's decisions have stood on their own.</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {overrides.map((o) => (
            <li key={o.id} className="rounded-xl border border-white/[0.05] bg-white/[0.015] p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-white">
                  <FileText size={13} className="text-cyan-300/70" aria-hidden="true" />{TYPE_LABEL[o.override_type] ?? o.override_type}
                </span>
                <span className="text-xs text-zinc-500">{new Date(o.created_at).toLocaleDateString()}</span>
              </div>
              <p className="mt-2 text-xs text-zinc-400"><span className="text-zinc-500">Seer said:</span> {o.original_decision}</p>
              <p className="mt-1 text-xs text-zinc-300"><span className="text-zinc-500">DAO ruled:</span> {o.override_decision}</p>
              <p className="mt-1 text-xs text-zinc-400"><span className="text-zinc-500">Reason:</span> {o.reason}</p>
              {(o.proposal_ref || o.votes_for != null) && (
                <p className="mt-1 text-[11px] text-zinc-600">
                  {o.proposal_ref ? `Proposal ${o.proposal_ref}` : ''}{o.votes_for != null ? ` · ${o.votes_for} for / ${o.votes_against ?? 0} against` : ''}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
