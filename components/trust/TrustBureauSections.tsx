'use client';

/**
 * Trust Bureau sections (V28). Institutional presentation built entirely on
 * existing trust mechanics - drivers map to the real score-event kinds
 * (payment, loan_repaid, endorsement, identity, dispute, fraud_flag, decay).
 * No scoring/tier/fee logic here.
 */

import Link from 'next/link';
import {
  ArrowRight, ArrowUpRight, Check, Minus, ShieldCheck, Scale, TrendingUp,
  Store, Heart, GraduationCap, Sparkles, CreditCard, Landmark, Handshake,
  BadgeCheck, AlertTriangle, Flag, Clock,
} from 'lucide-react';
import type { TrustStatus, TrustHealth } from '@/hooks/useTrustStatus';

const HEALTH_PILL: Record<TrustHealth, { cls: string; dot: string }> = {
  Strong: { cls: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300', dot: 'bg-emerald-400' },
  Established: { cls: 'border-accent/30 bg-accent/10 text-cyan-300', dot: 'bg-cyan-400' },
  Building: { cls: 'border-amber-400/30 bg-amber-400/10 text-amber-300', dot: 'bg-amber-400' },
  Unknown: { cls: 'border-white/10 bg-white/5 text-zinc-400', dot: 'bg-zinc-500' },
};

export function TrustStatusPanel({ t }: { t: TrustStatus }) {
  const pill = HEALTH_PILL[t.health];
  const cells = [
    { label: 'Current tier', value: t.tierName, glow: false },
    { label: 'Fee impact', value: t.feeLabel, glow: true },
  ];
  return (
    <section aria-label="Trust status" className="glass-card-premium p-6 sm:p-8">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid flex-1 grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/8 sm:max-w-md">
          {cells.map((c) => (
            <div key={c.label} className="bg-white/[0.02] px-5 py-4">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500">{c.label}</p>
              <p className={`mt-1 text-xl font-bold leading-none ${c.glow ? 'text-glow-cyan' : 'text-white'}`}>{c.value}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-widest text-zinc-500">Trust health</span>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${pill.cls}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${pill.dot}`} aria-hidden="true" />
            {t.health}
          </span>
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-500">Participation record</p>
        <div className="flex flex-wrap gap-2">
          {t.standing.map((s) => (
            <span
              key={s.label}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                s.ok ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-white/10 bg-white/5 text-zinc-400'
              }`}
            >
              {s.ok ? <Check size={12} aria-hidden="true" /> : <Minus size={12} aria-hidden="true" />}
              {s.label}
              <span className="sr-only">{s.ok ? ' unlocked' : ' locked'}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function WhyTrustExists() {
  const principles = [
    { Icon: ShieldCheck, title: 'Earned through participation', body: 'Trust is built by honest dealing over time - never bought or assigned.' },
    { Icon: TrendingUp, title: 'Reduces friction', body: 'As trust grows, the fee you pay falls and approvals get easier.' },
    { Icon: Store, title: 'Expands opportunity', body: 'A stronger record widens what you can do - commerce, governance, and more.' },
    { Icon: Scale, title: 'Carries responsibility', body: 'Greater trust means greater responsibility to the people who rely on the network.' },
  ];
  return (
    <section aria-label="Why trust exists" className="glass-card-premium p-6 sm:p-8">
      <p className="mb-1 text-xs font-bold uppercase tracking-widest text-zinc-500">Why trust exists</p>
      <h2 className="mb-4 text-2xl font-bold text-white">
        Trust is a <span className="gradient-text-cyan-blue">responsibility</span>, not a rank.
      </h2>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-zinc-400">
        The Trust Bureau records trust earned through honest participation. It is not a leaderboard, not a badge of
        status, not prestige, not a social ranking, and not a class. It reflects how you have acted - and the network
        rewards that record by lowering your costs, widening your opportunities, and strengthening the whole
        civilization.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {principles.map(({ Icon, title, body }) => (
          <div key={title} className="flex items-start gap-3">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent/5">
              <Icon size={18} className="text-cyan-400" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-white">{title}</h3>
              <p className="mt-0.5 text-sm leading-relaxed text-zinc-400">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function TrustDrivers() {
  const builds = [
    { Icon: CreditCard, label: 'Completed payments', body: 'Following through on what you pay for.' },
    { Icon: Landmark, label: 'On-time repayments', body: 'Repaying credit as agreed.' },
    { Icon: Handshake, label: 'Endorsements', body: 'Being vouched for by trusted peers.' },
    { Icon: BadgeCheck, label: 'Identity verification', body: 'Confirming who you are.' },
  ];
  const weakens = [
    { Icon: AlertTriangle, label: 'Disputes', body: 'Transactions that go wrong.' },
    { Icon: Flag, label: 'Fraud flags', body: 'Confirmed dishonest activity.' },
    { Icon: Clock, label: 'Inactivity', body: 'Trust gently decays without participation.' },
  ];
  return (
    <section aria-label="What drives trust" className="glass-card-premium p-6 sm:p-8">
      <p className="mb-1 text-xs font-bold uppercase tracking-widest text-zinc-500">Trust drivers</p>
      <h2 className="mb-5 text-xl font-bold text-white">How trust is earned - and lost.</h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-emerald-300"><Check size={14} /> Builds trust</p>
          <ul className="space-y-3">
            {builds.map(({ Icon, label, body }) => (
              <li key={label} className="flex items-start gap-3">
                <Icon size={16} className="mt-0.5 flex-shrink-0 text-emerald-400" aria-hidden="true" />
                <div><p className="text-sm font-medium text-white">{label}</p><p className="text-sm text-zinc-400">{body}</p></div>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-amber-300"><Minus size={14} /> Weakens trust</p>
          <ul className="space-y-3">
            {weakens.map(({ Icon, label, body }) => (
              <li key={label} className="flex items-start gap-3">
                <Icon size={16} className="mt-0.5 flex-shrink-0 text-amber-400" aria-hidden="true" />
                <div><p className="text-sm font-medium text-white">{label}</p><p className="text-sm text-zinc-400">{body}</p></div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function TrustOpportunities({ t }: { t: TrustStatus }) {
  const top = t.opportunities.slice(0, 3);
  if (top.length === 0) return null;
  return (
    <section aria-label="Trust opportunities" className="glass-card-premium p-6 sm:p-8">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles size={16} className="text-cyan-400" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-white">Ways to build trust</h2>
      </div>
      <ol className="space-y-2.5">
        {top.map((o, i) => (
          <li key={o.id}>
            <Link href={o.href} className="group flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 transition-colors hover:bg-white/[0.05]">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-cyan-400">{i + 1}</span>
              <span className="flex-1 text-sm font-semibold text-white">{o.label}</span>
              <ArrowRight size={15} className="flex-shrink-0 text-zinc-500 transition-colors group-hover:text-cyan-400" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function TrustCommercePanel() {
  const rows = [
    'Trust reduces the fee you pay on every transaction.',
    'A trusted record unlocks the ability to register and operate as a merchant.',
    'Higher trust widens commercial opportunity across the marketplace.',
    'Merchants who build trust lower costs for themselves and their customers.',
  ];
  return (
    <section aria-label="Trust and commerce" className="glass-card-premium p-5 sm:p-6">
      <div className="mb-3 flex items-center gap-2">
        <Store size={16} className="text-emerald-300" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-white">Trust &amp; Commerce</h2>
      </div>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r} className="flex items-start gap-2 text-sm text-zinc-400"><Check size={14} className="mt-0.5 flex-shrink-0 text-emerald-400" aria-hidden="true" />{r}</li>
        ))}
      </ul>
      <Link href="/merchant" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-300 transition-colors hover:text-emerald-200">
        Open Merchant HQ <ArrowRight size={14} />
      </Link>
    </section>
  );
}

export function TrustContinuityPanel() {
  const rows = [
    'Recovery relies on guardians you trust to return your access.',
    'Guardian and endorsement systems are built on trusted relationships.',
    'Succession passes what you built to heirs through the same trust.',
  ];
  return (
    <section aria-label="Trust and continuity" className="glass-card-premium p-5 sm:p-6">
      <div className="mb-3 flex items-center gap-2">
        <Heart size={16} className="text-pink-300" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-white">Trust &amp; Continuity</h2>
      </div>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r} className="flex items-start gap-2 text-sm text-zinc-400"><Check size={14} className="mt-0.5 flex-shrink-0 text-pink-400" aria-hidden="true" />{r}</li>
        ))}
      </ul>
      <Link href="/continuity" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-pink-200 transition-colors hover:text-pink-100">
        Open Continuity <ArrowRight size={14} />
      </Link>
    </section>
  );
}

export function TrustAcademyEmbed() {
  const lessons = [
    { q: 'How is trust earned?', a: 'Through honest payments, repayments, endorsements, and verification - over time.' },
    { q: 'Why does trust lower my fees?', a: 'A stronger record signals lower risk, so the network charges you less to transact.' },
    { q: 'Can trust go down?', a: 'Yes - disputes, fraud flags, and long inactivity can lower it. Consistency protects it.' },
  ];
  return (
    <section aria-label="Trust learning" className="glass-card-premium p-5 sm:p-6">
      <div className="mb-3 flex items-center gap-2">
        <GraduationCap size={16} className="text-amber-300" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-white">Understand trust</h2>
      </div>
      <dl className="space-y-3">
        {lessons.map((l) => (
          <div key={l.q} className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
            <dt className="text-sm font-semibold text-white">{l.q}</dt>
            <dd className="mt-0.5 text-sm leading-relaxed text-zinc-400">{l.a}</dd>
          </div>
        ))}
      </dl>
      <Link href="/seer-academy" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-300 transition-colors hover:text-amber-200">
        Open the academy <ArrowUpRight size={14} />
      </Link>
    </section>
  );
}
