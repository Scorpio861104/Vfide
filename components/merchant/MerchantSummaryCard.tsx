'use client';

/**
 * MerchantSummaryCard - V27 Part 9. Compact commerce readout for the dashboard:
 * merchant status, business health, next action, and a link into Merchant HQ.
 */

import Link from 'next/link';
import { Store, ArrowRight } from 'lucide-react';
import { useMerchantHealth, type MerchantHealthState } from '@/hooks/useMerchantHealth';

const PILL: Record<MerchantHealthState, { cls: string; dot: string }> = {
  Healthy: { cls: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300', dot: 'bg-emerald-400' },
  Growing: { cls: 'border-accent/30 bg-accent/10 text-cyan-300', dot: 'bg-cyan-400' },
  'At Risk': { cls: 'border-amber-400/30 bg-amber-400/10 text-amber-300', dot: 'bg-amber-400' },
  Inactive: { cls: 'border-white/10 bg-white/5 text-zinc-300', dot: 'bg-zinc-500' },
  Unknown: { cls: 'border-white/10 bg-white/5 text-zinc-400', dot: 'bg-zinc-500' },
};

export function MerchantSummaryCard({ className = '' }: { className?: string }) {
  const m = useMerchantHealth();
  const pill = PILL[m.health];

  const statusLine = !m.isConnected
    ? 'Connect to see your business status.'
    : !m.isMerchant
      ? 'Commerce is available - activate when ready.'
      : m.isSuspended
        ? 'Your merchant account is suspended.'
        : `${m.txCount} payment${m.txCount === 1 ? '' : 's'} · volume ${m.volumeLabel}`;

  return (
    <div className={`analytics-card p-5 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10">
            <Store size={16} className="text-emerald-300" />
          </span>
          <h3 className="text-base font-bold text-white">Commerce</h3>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${pill.cls}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${pill.dot}`} aria-hidden="true" />
          {m.health}
        </span>
      </div>

      <p className="text-sm text-zinc-400">{statusLine}</p>

      <div className="mt-4 flex items-center justify-between gap-3">
        {m.topAction ? (
          <Link
            href={m.topAction.href}
            className="inline-flex items-center gap-1.5 rounded-xl border border-accent/20 bg-accent/5 px-3 py-2 text-sm font-semibold text-cyan-400 transition-colors hover:bg-accent/10"
          >
            {m.topAction.label} <ArrowRight size={14} />
          </Link>
        ) : (
          <span />
        )}
        <Link href="/merchant" className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 transition-colors hover:text-white">
          Merchant HQ <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}
