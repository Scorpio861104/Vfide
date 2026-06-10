'use client';

/**
 * Capability layer components (V31). Learning that lives where questions occur.
 * Progressive disclosure keeps density low (Part 9): panels are collapsed by
 * default, guidance only renders when something is unconfigured. No scores, no
 * gamification, no rankings.
 */

import Link from 'next/link';
import { ChevronDown, Info, ArrowRight, Check, Scale, Lightbulb } from 'lucide-react';
import { INSTITUTIONS, type InstitutionId } from '@/lib/civilization/model';
import { CAPABILITY, GUIDANCE, DECISIONS, PATHWAYS } from '@/lib/capability/content';

export function CapabilityPanel({ institution, defaultOpen = false }: { institution: InstitutionId; defaultOpen?: boolean }) {
  const c = CAPABILITY[institution];
  const meta = INSTITUTIONS[institution];
  if (!c) return null;
  const Icon = meta.icon;
  return (
    <details className="group glass-card-premium overflow-hidden" {...(defaultOpen ? { open: true } : {})}>
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 sm:p-5">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border" style={{ borderColor: `${meta.color}33`, background: `${meta.color}1a` }}>
          <Icon size={16} style={{ color: meta.color }} aria-hidden="true" />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold text-white">Understanding {meta.label}</span>
          <span className="block text-xs text-zinc-500">{c.what}</span>
        </span>
        <ChevronDown size={18} className="flex-shrink-0 text-zinc-500 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="space-y-3 border-t border-white/8 px-4 pb-5 pt-4 sm:px-5">
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-500">Why it matters</p>
          <p className="text-sm text-zinc-300">{c.why}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-500">When it&apos;s useful</p>
          <p className="text-sm text-zinc-300">{c.when}</p>
        </div>
        <div>
          <p className="mb-1 text-xs uppercase tracking-wider text-zinc-500">What it protects against</p>
          <ul className="space-y-1">
            {c.risksReduced.map((r) => (
              <li key={r} className="flex items-start gap-2 text-sm text-zinc-400">
                <Check size={13} className="mt-0.5 flex-shrink-0 text-emerald-400" aria-hidden="true" />{r}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  );
}

export function ContextualGuidance({ topic, show = true }: { topic: keyof typeof GUIDANCE; show?: boolean }) {
  const g = GUIDANCE[topic];
  if (!show || !g) return null;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-accent/15 bg-accent/[0.04] p-4" role="note">
      <Info size={16} className="mt-0.5 flex-shrink-0 text-cyan-400" aria-hidden="true" />
      <div>
        <p className="text-sm font-semibold text-white">{g.title}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-zinc-400">{g.why}</p>
        {g.learnMore && (
          <Link href={g.learnMore.href} className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 transition-colors hover:text-cyan-300">
            {g.learnMore.label} <ArrowRight size={12} />
          </Link>
        )}
      </div>
    </div>
  );
}

export function DecisionSupportCard({ decision }: { decision: keyof typeof DECISIONS }) {
  const d = DECISIONS[decision];
  if (!d) return null;
  return (
    <section aria-label={d.question} className="glass-card-premium p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Scale size={16} className="text-cyan-300" aria-hidden="true" />
        <h3 className="text-base font-bold text-white">{d.question}</h3>
      </div>
      <p className="mb-4 text-sm text-zinc-500">Here&apos;s what to weigh. The choice is yours.</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">Benefits</p>
          <ul className="space-y-1.5">{d.benefits.map((b) => <li key={b} className="text-sm text-zinc-400">{b}</li>)}</ul>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-300">Tradeoffs</p>
          <ul className="space-y-1.5">{d.tradeoffs.map((b) => <li key={b} className="text-sm text-zinc-400">{b}</li>)}</ul>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">If you skip it</p>
          <ul className="space-y-1.5">{d.consequencesIfSkipped.map((b) => <li key={b} className="text-sm text-zinc-400">{b}</li>)}</ul>
        </div>
      </div>
    </section>
  );
}

export function ParticipationPathways() {
  return (
    <section aria-label="Ways to use VFIDE" className="glass-card-premium p-6 sm:p-8">
      <div className="mb-1 flex items-center gap-2">
        <Lightbulb size={16} className="text-amber-300" aria-hidden="true" />
        <h2 className="text-xl font-bold text-white">Ways to use VFIDE</h2>
      </div>
      <p className="mb-6 text-sm text-zinc-400">Different people use VFIDE differently. None is better than another - pick what fits you.</p>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PATHWAYS.map((p) => (
          <li key={p.id} className="flex flex-col rounded-xl border border-white/8 bg-white/[0.02] p-4">
            <h3 className="text-sm font-bold text-white">{p.title}</h3>
            <p className="mt-0.5 text-sm leading-relaxed text-zinc-400">{p.description}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {p.uses.map((u) => (
                <span key={u} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-zinc-400">{u}</span>
              ))}
            </div>
            <Link href={p.entry.href} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 transition-colors hover:text-cyan-300">
              {p.entry.label} <ArrowRight size={12} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}