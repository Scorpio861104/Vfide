'use client';

import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Check, Minus } from 'lucide-react';
import { INSTITUTIONS } from '@/lib/civilization/model';
import type { InstitutionStatus, ReadyState } from '@/hooks/useCivilizationStatus';

const STATE_PILL: Record<ReadyState, { cls: string }> = {
  ready: { cls: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' },
  available: { cls: 'border-accent/30 bg-accent/10 text-cyan-300' },
  partial: { cls: 'border-amber-400/30 bg-amber-400/10 text-amber-300' },
  incomplete: { cls: 'border-white/10 bg-white/5 text-zinc-300' },
  locked: { cls: 'border-white/10 bg-white/5 text-zinc-400' },
  loading: { cls: 'border-white/10 bg-white/5 text-zinc-400' },
  disconnected: { cls: 'border-white/10 bg-white/5 text-zinc-400' },
};

function StatusPill({ state, label }: { state: ReadyState; label: string }) {
  const { cls } = STATE_PILL[state];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${cls}`}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${state === 'ready' ? 'bg-emerald-400' : state === 'partial' ? 'bg-amber-400' : state === 'available' ? 'bg-cyan-400' : 'bg-zinc-500'}`}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

function InstitutionCard({ s }: { s: InstitutionStatus }) {
  const meta = INSTITUTIONS[s.id];
  const Icon = meta.icon;
  return (
    <div className="analytics-card flex flex-col p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border"
            style={{ borderColor: `${meta.color}33`, background: `${meta.color}1a` }}
          >
            <Icon size={18} style={{ color: meta.color }} />
          </span>
          <h3 className="text-base font-bold text-white">{s.label}</h3>
        </div>
        <StatusPill state={s.state} label={s.statusLabel} />
      </div>

      <p className="text-sm font-medium text-zinc-200">{s.whatItIs}</p>
      <p className="mt-1 text-sm leading-relaxed text-zinc-400">{s.benefit}</p>

      {s.detail && s.detail.length > 0 && (
        <dl className="mt-4 space-y-1.5 border-t border-white/8 pt-3">
          {s.detail.map((d) => (
            <div key={d.label} className="flex items-center justify-between text-xs">
              <dt className="text-zinc-500">{d.label}</dt>
              <dd className="flex items-center gap-1.5 font-medium text-zinc-300">
                {d.ok ? (
                  <Check size={12} className="text-emerald-400" aria-hidden="true" />
                ) : (
                  <Minus size={12} className="text-zinc-500" aria-hidden="true" />
                )}
                {d.value}
                <span className="sr-only">{d.ok ? ' (done)' : ' (pending)'}</span>
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 pt-1">
        {s.nextAction ? (
          <Link
            href={s.nextAction.href}
            className="inline-flex items-center gap-1.5 rounded-xl border border-accent/20 bg-accent/5 px-3 py-2 text-sm font-semibold text-cyan-400 transition-colors hover:bg-accent/10"
          >
            {s.nextAction.label} <ArrowRight size={14} />
          </Link>
        ) : (
          <span />
        )}
        <Link
          href={s.homeHref}
          className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 transition-colors hover:text-white"
        >
          Open <ArrowUpRight size={12} />
        </Link>
      </div>
    </div>
  );
}

export function InstitutionStatusGrid({ institutions }: { institutions: InstitutionStatus[] }) {
  return (
    <section aria-label="Your institutions">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-white">Your institutions</h2>
        <p className="text-xs text-zinc-500">What each one does for you</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {institutions.map((s) => (
          <InstitutionCard key={s.id} s={s} />
        ))}
      </div>
    </section>
  );
}