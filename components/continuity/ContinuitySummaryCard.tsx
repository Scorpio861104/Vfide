'use client';

/**
 * ContinuitySummaryCard - V26 Part 10. Compact continuity readiness for the
 * dashboard: readiness state, top risk, next action, and a link into the
 * Continuity Command Center. Self-contained (reads useContinuityStatus).
 */

import Link from 'next/link';
import { Heart, ArrowRight, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useContinuityStatus, type ContinuityReadiness } from '@/hooks/useContinuityStatus';

const READINESS: Record<ContinuityReadiness, { label: string; cls: string; dot: string }> = {
  protected: { label: 'Protected', cls: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300', dot: 'bg-emerald-400' },
  partial: { label: 'Partial', cls: 'border-amber-400/30 bg-amber-400/10 text-amber-300', dot: 'bg-amber-400' },
  incomplete: { label: 'Incomplete', cls: 'border-red-400/30 bg-red-400/10 text-red-300', dot: 'bg-red-400' },
  unknown: { label: 'Unknown', cls: 'border-white/10 bg-white/5 text-zinc-300', dot: 'bg-zinc-500' },
};

export function ContinuitySummaryCard({ className = '' }: { className?: string }) {
  const c = useContinuityStatus();
  const r = READINESS[c.readiness];
  const protectedAll = c.readiness === 'protected';

  return (
    <div className={`analytics-card p-5 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-pink-400/20 bg-pink-400/10">
            <Heart size={16} className="text-pink-300" />
          </span>
          <h3 className="text-base font-bold text-white">Continuity</h3>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${r.cls}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${r.dot}`} aria-hidden="true" />
          {r.label}
        </span>
      </div>

      <p className="text-sm text-zinc-400">
        {protectedAll
          ? 'Guardians, recovery, and inheritance are all configured.'
          : `${c.configuredCount} of 3 protections configured.`}
      </p>

      <div className="mt-3 flex items-start gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5">
        {protectedAll ? (
          <ShieldCheck size={15} className="mt-0.5 flex-shrink-0 text-emerald-400" aria-hidden="true" />
        ) : (
          <ShieldAlert size={15} className="mt-0.5 flex-shrink-0 text-amber-400" aria-hidden="true" />
        )}
        <p className={`text-sm ${protectedAll ? 'text-zinc-400' : 'text-zinc-300'}`}>
          {c.topRisk ?? 'No outstanding continuity risks.'}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        {c.topAction ? (
          <Link
            href={c.topAction.href}
            className="inline-flex items-center gap-1.5 rounded-xl border border-accent/20 bg-accent/5 px-3 py-2 text-sm font-semibold text-cyan-400 transition-colors hover:bg-accent/10"
          >
            {c.topAction.label} <ArrowRight size={14} />
          </Link>
        ) : (
          <span />
        )}
        <Link href="/continuity" className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 transition-colors hover:text-white">
          Command center <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}
