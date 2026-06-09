'use client';

/**
 * TrustSummaryCard - V28 Part 10. Compact trust readout for the Citizen Command
 * Center: trust status, fee impact, primary opportunity, next action, and a
 * link into the Trust Bureau.
 */

import Link from 'next/link';
import { TrendingUp, ArrowRight } from 'lucide-react';
import { useTrustStatus, type TrustHealth } from '@/hooks/useTrustStatus';

const PILL: Record<TrustHealth, { cls: string; dot: string }> = {
  Exemplary: { cls: 'border-violet-400/30 bg-violet-400/10 text-violet-300', dot: 'bg-violet-400' },
  Strong: { cls: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300', dot: 'bg-emerald-400' },
  Established: { cls: 'border-accent/30 bg-accent/10 text-cyan-300', dot: 'bg-cyan-400' },
  Building: { cls: 'border-amber-400/30 bg-amber-400/10 text-amber-300', dot: 'bg-amber-400' },
  Unknown: { cls: 'border-white/10 bg-white/5 text-zinc-400', dot: 'bg-zinc-500' },
};

export function TrustSummaryCard({ className = '' }: { className?: string }) {
  const t = useTrustStatus();
  const pill = PILL[t.health];

  return (
    <div className={`analytics-card p-5 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/20 bg-accent/10">
            <TrendingUp size={16} className="text-cyan-300" />
          </span>
          <h3 className="text-base font-bold text-white">Trust</h3>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${pill.cls}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${pill.dot}`} aria-hidden="true" />
          {t.health}
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <div>
          <span className="text-zinc-500">Tier </span>
          <span className="font-semibold text-white">{t.tierName}</span>
        </div>
        <div>
          <span className="text-zinc-500">Fee </span>
          <span className="font-semibold text-glow-cyan">{t.feeLabel}</span>
        </div>
      </div>

      {t.primaryOpportunity && (
        <p className="mt-2 text-sm text-zinc-400">
          Next: <span className="text-zinc-200">{t.primaryOpportunity.label}</span>
        </p>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        {t.nextAction ? (
          <Link
            href={t.nextAction.href}
            className="inline-flex items-center gap-1.5 rounded-xl border border-accent/20 bg-accent/5 px-3 py-2 text-sm font-semibold text-cyan-400 transition-colors hover:bg-accent/10"
          >
            {t.nextAction.label} <ArrowRight size={14} />
          </Link>
        ) : (
          <span />
        )}
        <Link href="/proofscore" className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 transition-colors hover:text-white">
          Trust Bureau <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}
