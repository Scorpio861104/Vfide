'use client';

/**
 * MerchantHQ - Merchant Headquarters (V27). The command center that sits atop
 * the existing merchant tools and makes Commerce legible: health, business
 * status, trust impact, customer relationships, business continuity,
 * opportunities, institution relationships, and embedded learning.
 */

import Link from 'next/link';
import {
  Activity, ArrowRight, ArrowUpRight, Check, Minus, TrendingUp, Users, Heart,
  GraduationCap, Sparkles, Repeat, RotateCcw, Truck, Globe, Award,
} from 'lucide-react';
import { INSTITUTIONS } from '@/lib/civilization/model';
import { useMerchantHealth, type MerchantHealth, type MerchantHealthState } from '@/hooks/useMerchantHealth';

const HEALTH_PILL: Record<MerchantHealthState, { cls: string; dot: string }> = {
  Healthy: { cls: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300', dot: 'bg-emerald-400' },
  Growing: { cls: 'border-accent/30 bg-accent/10 text-cyan-300', dot: 'bg-cyan-400' },
  'At Risk': { cls: 'border-amber-400/30 bg-amber-400/10 text-amber-300', dot: 'bg-amber-400' },
  Inactive: { cls: 'border-white/10 bg-white/5 text-zinc-300', dot: 'bg-zinc-500' },
  Unknown: { cls: 'border-white/10 bg-white/5 text-zinc-400', dot: 'bg-zinc-500' },
};

function ReadinessStrip({ chips }: { chips: { label: string; ok: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((c) => (
        <span
          key={c.label}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
            c.ok ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-white/10 bg-white/5 text-zinc-400'
          }`}
        >
          {c.ok ? <Check size={12} aria-hidden="true" /> : <Minus size={12} aria-hidden="true" />}
          {c.label}
          <span className="sr-only">{c.ok ? ' ready' : ' incomplete'}</span>
        </span>
      ))}
    </div>
  );
}

function HealthPanel({ m }: { m: MerchantHealth }) {
  const pill = HEALTH_PILL[m.health];
  return (
    <section aria-label="Merchant health" className="glass-card-premium p-5 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Activity size={16} className="text-emerald-300" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-white">Merchant health</h2>
          </div>
          <p className="text-sm text-zinc-500">{m.businessName ? m.businessName : 'Your business at a glance'}</p>
        </div>
        <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${pill.cls}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${pill.dot}`} aria-hidden="true" />
          {m.health}
        </span>
      </div>

      <dl className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {m.activity.map((row) => {
          const inner = (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5">
              <dt className="text-sm text-zinc-400">{row.label}</dt>
              <dd className="flex items-center gap-1.5 text-sm font-semibold text-white">
                {!row.info && (row.ok
                  ? <Check size={13} className="text-emerald-400" aria-hidden="true" />
                  : <Minus size={13} className="text-zinc-500" aria-hidden="true" />)}
                {row.value}
              </dd>
            </div>
          );
          return (
            <div key={row.label}>
              {row.href ? <Link href={row.href} className="block transition-opacity hover:opacity-80">{inner}</Link> : inner}
            </div>
          );
        })}
      </dl>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-500">Business readiness</p>
        <ReadinessStrip chips={m.readiness} />
      </div>
    </section>
  );
}

function TrustImpactPanel({ m }: { m: MerchantHealth }) {
  return (
    <section aria-label="Trust impact on commerce" className="glass-card-premium p-5 sm:p-6">
      <div className="mb-3 flex items-center gap-2">
        <TrendingUp size={16} className="text-cyan-300" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-white">Trust impact</h2>
      </div>
      <p className="mb-4 text-sm text-zinc-400">
        Your ProofScore is the bridge between trust and commerce - it sets the fee you pay when you transact and
        unlocks what your business can do. Merchants never pay a protocol fee on sales.
      </p>
      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
          <dt className="text-xs uppercase tracking-wider text-zinc-500">Trust status</dt>
          <dd className="mt-0.5 text-base font-bold text-white">{m.trust.tierName}</dd>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
          <dt className="text-xs uppercase tracking-wider text-zinc-500">Your fee rate</dt>
          <dd className="mt-0.5 text-base font-bold text-glow-cyan">{m.trust.feeLabel}</dd>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
          <dt className="text-xs uppercase tracking-wider text-zinc-500">Commerce</dt>
          <dd className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-white">
            {m.trust.canMerchant ? <Check size={13} className="text-emerald-400" aria-hidden="true" /> : <Minus size={13} className="text-zinc-500" aria-hidden="true" />}
            {m.trust.canMerchant ? 'Eligible' : 'Build trust'}
          </dd>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
          <dt className="text-xs uppercase tracking-wider text-zinc-500">Participation</dt>
          <dd className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-white">
            {m.trust.canVote ? <Check size={13} className="text-emerald-400" aria-hidden="true" /> : <Minus size={13} className="text-zinc-500" aria-hidden="true" />}
            {m.trust.canVote ? 'Governance' : 'Locked'}
          </dd>
        </div>
      </dl>
      <Link href="/proofscore" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-400 transition-colors hover:text-cyan-300">
        Open Trust Bureau <ArrowRight size={14} />
      </Link>
    </section>
  );
}

function CustomerHealthPanel({ m }: { m: MerchantHealth }) {
  const tools = [
    { label: 'Customers', href: '/merchant/customers', Icon: Users },
    { label: 'Loyalty', href: '/merchant/loyalty', Icon: Award },
    { label: 'Subscriptions', href: '/merchant/subscriptions', Icon: Repeat },
  ];
  return (
    <section aria-label="Customer health" className="glass-card-premium p-5 sm:p-6">
      <div className="mb-3 flex items-center gap-2">
        <Users size={16} className="text-emerald-300" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-white">Customer health</h2>
      </div>
      <p className="mb-4 text-sm text-zinc-400">Commerce is relationships, not transactions.</p>
      <dl className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
          <dt className="text-xs uppercase tracking-wider text-zinc-500">Payments received</dt>
          <dd className="mt-0.5 text-xl font-bold text-white">{m.txCount}</dd>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
          <dt className="text-xs uppercase tracking-wider text-zinc-500">Total volume</dt>
          <dd className="mt-0.5 text-xl font-bold text-white">{m.volumeLabel}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2">
        {tools.map(({ label, href, Icon }) => (
          <Link key={label} href={href} className="inline-flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white">
            <Icon size={14} aria-hidden="true" /> {label}
          </Link>
        ))}
      </div>
    </section>
  );
}

function ContinuityPanel({ m }: { m: MerchantHealth }) {
  const rows = [
    { label: 'Guardian coverage', ok: m.continuity.guardianOk },
    { label: 'Recovery readiness', ok: m.continuity.recoveryConfigured },
    { label: 'Inheritance readiness', ok: m.continuity.inheritanceConfigured },
    { label: 'Succession readiness', ok: m.continuity.inheritanceConfigured },
  ];
  const protectedAll = m.continuity.readiness === 'protected';
  return (
    <section aria-label="Business continuity" className="glass-card-premium p-5 sm:p-6">
      <div className="mb-3 flex items-center gap-2">
        <Heart size={16} className="text-pink-300" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-white">Business continuity</h2>
      </div>
      <p className="mb-4 text-sm text-zinc-400">
        Will your business survive disruption? Guardians, recovery, and inheritance protect your merchant account,
        payouts, and identity - not just your assets.
      </p>
      <dl className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between text-sm">
            <dt className="text-zinc-400">{r.label}</dt>
            <dd className="flex items-center gap-1.5 font-medium text-zinc-200">
              {r.ok ? <Check size={13} className="text-emerald-400" aria-hidden="true" /> : <Minus size={13} className="text-zinc-500" aria-hidden="true" />}
              {r.ok ? 'Ready' : 'Not set'}
              <span className="sr-only">{r.ok ? ' (done)' : ' (pending)'}</span>
            </dd>
          </div>
        ))}
      </dl>
      <Link href="/continuity" className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-pink-400/20 bg-pink-400/10 px-3 py-2 text-sm font-semibold text-pink-200 transition-colors hover:bg-pink-400/20">
        {protectedAll ? 'Review continuity' : 'Protect your business'} <ArrowRight size={14} />
      </Link>
    </section>
  );
}

function OpportunityCenter() {
  const opps = [
    { label: 'Loyalty', desc: 'Reward repeat customers.', href: '/merchant/loyalty', Icon: Award },
    { label: 'Subscriptions', desc: 'Recurring revenue plans.', href: '/merchant/subscriptions', Icon: Repeat, coming: true },
    { label: 'Installments', desc: 'Buy now, pay later.', href: '/merchant/installments', Icon: RotateCcw, coming: true },
    { label: 'Suppliers', desc: 'Manage purchase orders.', href: '/merchant/suppliers', Icon: Truck },
    { label: 'Marketplace', desc: 'Reach more buyers.', href: '/marketplace', Icon: Globe },
  ];
  return (
    <section aria-label="Commerce opportunities" className="glass-card-premium p-5 sm:p-6">
      <div className="mb-1 flex items-center gap-2">
        <Sparkles size={16} className="text-amber-300" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-white">Opportunities</h2>
      </div>
      <p className="mb-4 text-sm text-zinc-500">Ways to grow - when you&apos;re ready. No pressure.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {opps.map(({ label, desc, href, Icon, coming }) => (
          <Link key={label} href={href} className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.05]">
            <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-emerald-400/20 bg-emerald-400/10">
              <Icon size={15} className="text-emerald-300" aria-hidden="true" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-white">{label}</span>
                {coming && <span className="rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-zinc-400">Soon</span>}
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function MerchantRelationships() {
  const edges = [
    { from: 'trust', to: 'commerce', label: 'Trust lowers your fees and unlocks commerce.' },
    { from: 'commerce', to: 'opportunity', label: 'Commerce opens new opportunity.' },
    { from: 'commerce', to: 'continuity', label: 'Continuity keeps your business alive through disruption.' },
    { from: 'capability', to: 'commerce', label: 'Learning makes you a more capable operator.' },
    { from: 'stewardship', to: 'commerce', label: 'A well-stewarded protocol is a safer place to trade.' },
  ] as const;
  return (
    <section aria-label="How commerce connects" className="glass-card-premium p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-white">How commerce connects</h2>
      <p className="mt-0.5 mb-4 text-sm text-zinc-500">Commerce is one institution among several.</p>
      <ul className="space-y-3">
        {edges.map((e) => {
          const a = INSTITUTIONS[e.from];
          const b = INSTITUTIONS[e.to];
          const AIcon = a.icon;
          const BIcon = b.icon;
          return (
            <li key={`${e.from}-${e.to}`} className="flex flex-col gap-2 rounded-xl border border-white/8 bg-white/[0.02] p-3 sm:flex-row sm:items-center sm:gap-3">
              <div className="flex items-center gap-2">
                <Link href={a.homeHref} className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm font-semibold transition-colors hover:bg-white/5" style={{ borderColor: `${a.color}33`, color: a.color }}>
                  <AIcon size={14} aria-hidden="true" /> {a.label}
                </Link>
                <ArrowRight size={14} className="flex-shrink-0 text-zinc-600" aria-hidden="true" />
                <Link href={b.homeHref} className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm font-semibold transition-colors hover:bg-white/5" style={{ borderColor: `${b.color}33`, color: b.color }}>
                  <BIcon size={14} aria-hidden="true" /> {b.label}
                </Link>
              </div>
              <p className="text-sm leading-relaxed text-zinc-400 sm:ml-1">{e.label}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function AcademyEmbed() {
  const lessons = [
    { q: 'How does trust lower my fees?', a: 'Your ProofScore sets the fee you pay when you transact. Honest activity over time pushes it down.' },
    { q: 'Why protect my business with guardians?', a: 'If you lose your wallet, guardians restore your merchant account - storefront, payouts, and history intact.' },
    { q: 'How do I get paid?', a: 'Share a payment link or QR. Buyers pay any stablecoin; you keep 100% with zero merchant fees.' },
  ];
  return (
    <section aria-label="Merchant learning" className="glass-card-premium p-5 sm:p-6">
      <div className="mb-3 flex items-center gap-2">
        <GraduationCap size={16} className="text-amber-300" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-white">Learn while you build</h2>
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

export function MerchantHQ() {
  const m = useMerchantHealth();
  return (
    <div className="space-y-6">
      <HealthPanel m={m} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TrustImpactPanel m={m} />
        <CustomerHealthPanel m={m} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ContinuityPanel m={m} />
        <AcademyEmbed />
      </div>
      <OpportunityCenter />
      <MerchantRelationships />
    </div>
  );
}
