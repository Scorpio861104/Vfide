'use client';

/**
 * ContinuitySectionCard - renders one continuity pillar with the four required
 * answers (Current State / Benefit / Risk / Next Action) plus optional detail
 * rows. Used for Guardians, Recovery, Inheritance, Security, Memorial.
 */

import Link from 'next/link';
import { ArrowRight, Check, Minus, ShieldCheck, KeyRound, Users, Lock, Heart } from 'lucide-react';
import type { ContinuitySection, SectionState } from '@/hooks/useContinuityStatus';

const ICON: Record<ContinuitySection['id'], typeof ShieldCheck> = {
  guardians: ShieldCheck,
  recovery: KeyRound,
  inheritance: Users,
  security: Lock,
  memorial: Heart,
};

const STATE_PILL: Record<SectionState, { cls: string; label: string }> = {
  ok: { cls: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300', label: 'Ready' },
  active: { cls: 'border-amber-400/30 bg-amber-400/10 text-amber-300', label: 'In progress' },
  partial: { cls: 'border-amber-400/30 bg-amber-400/10 text-amber-300', label: 'Partial' },
  missing: { cls: 'border-red-400/30 bg-red-400/10 text-red-300', label: 'Action needed' },
  info: { cls: 'border-white/10 bg-white/5 text-zinc-300', label: 'Optional' },
};

export function ContinuitySectionCard({ section }: { section: ContinuitySection }) {
  const Icon = ICON[section.id];
  const pill = STATE_PILL[section.state];
  const riskBad = section.state === 'missing';
  return (
    <div className="analytics-card flex flex-col p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-pink-400/20 bg-pink-400/10">
            <Icon size={16} className="text-pink-300" />
          </span>
          <h3 className="text-base font-bold text-white">{section.title}</h3>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${pill.cls}`}>
          {pill.label}
        </span>
      </div>

      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wider text-zinc-500">Current state</dt>
          <dd className="font-semibold text-white">{section.currentState}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-zinc-500">Benefit</dt>
          <dd className="text-zinc-400">{section.benefit}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-zinc-500">Risk</dt>
          <dd className={riskBad ? 'text-red-300' : 'text-zinc-400'}>{section.risk}</dd>
        </div>
      </dl>

      {section.detail && section.detail.length > 0 && (
        <dl className="mt-3 space-y-1.5 border-t border-white/8 pt-3">
          {section.detail.map((d) => (
            <div key={d.label} className="flex items-center justify-between text-xs">
              <dt className="text-zinc-500">{d.label}</dt>
              <dd className="flex items-center gap-1.5 font-medium text-zinc-300">
                {d.ok ? <Check size={12} className="text-emerald-400" aria-hidden="true" /> : <Minus size={12} className="text-zinc-500" aria-hidden="true" />}
                {d.value}
                <span className="sr-only">{d.ok ? ' (done)' : ' (pending)'}</span>
              </dd>
            </div>
          ))}
        </dl>
      )}

      {section.nextAction && (
        <Link
          href={section.nextAction.href}
          className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-xl border border-accent/20 bg-accent/5 px-3 py-2 text-sm font-semibold text-cyan-400 transition-colors hover:bg-accent/10"
        >
          {section.nextAction.label} <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}
