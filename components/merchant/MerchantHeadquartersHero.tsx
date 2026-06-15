'use client';

/**
 * MerchantHeadquartersHero — monumental executive hero + status bar for Merchant Headquarters.
 *
 * "I can run my business from here." Presents six executive signals derived from the REAL
 * useMerchantHealth engine — honest "no data yet" states where a metric has no on-chain source,
 * never fabricated numbers. Institutional presentation: large type, generous spacing, a calm
 * status band reading as executive intelligence rather than dashboard widgets.
 */

import type { MerchantHealth, MerchantHealthState } from '@/hooks/useMerchantHealth';
import { Building2 } from 'lucide-react';

interface Signal {
  label: string;
  value: string;
  tone: 'strong' | 'growing' | 'neutral' | 'weak';
}

const TONE: Record<Signal['tone'], string> = {
  strong: 'text-emerald-300',
  growing: 'text-cyan-300',
  neutral: 'text-zinc-200',
  weak: 'text-zinc-500',
};

const HEALTH_TONE: Record<MerchantHealthState, Signal['tone']> = {
  Healthy: 'strong',
  Growing: 'growing',
  'At Risk': 'weak',
  Inactive: 'weak',
  Unknown: 'neutral',
};

const CONTINUITY_LABEL: Record<MerchantHealth['continuity']['readiness'], { v: string; t: Signal['tone'] }> = {
  protected: { v: 'Protected', t: 'strong' },
  partial: { v: 'Partial', t: 'growing' },
  incomplete: { v: 'Unprotected', t: 'weak' },
  unknown: { v: 'Connect wallet', t: 'neutral' },
};

export function MerchantHeadquartersHero({ m, compositeHealth }: { m: MerchantHealth; compositeHealth?: { score: number | null; band: string } | null }) {
  const hasRevenue = m.volume > 0;
  const cont = CONTINUITY_LABEL[m.continuity.readiness];

  const signals: Signal[] = [
    {
      label: 'Revenue',
      value: hasRevenue ? m.volumeLabel : 'No revenue yet',
      tone: hasRevenue ? 'strong' : 'weak',
    },
    {
      label: 'Transaction Volume',
      value: m.txCount > 0 ? `${m.txCount} payment${m.txCount === 1 ? '' : 's'}` : 'None yet',
      tone: m.txCount > 0 ? 'growing' : 'weak',
    },
    {
      label: 'Customer Growth',
      value: m.txCount > 0 ? 'Active' : 'No activity yet',
      tone: m.txCount > 0 ? 'growing' : 'weak',
    },
    {
      label: 'Settlement Status',
      value: m.isMerchant && !m.isSuspended ? 'Operational' : m.isSuspended ? 'Suspended' : 'Not set up',
      tone: m.isMerchant && !m.isSuspended ? 'strong' : 'weak',
    },
    {
      label: 'ProofScore Savings',
      value: m.trust.canMerchant ? m.trust.feeLabel : 'Building',
      tone: m.trust.canMerchant ? 'strong' : 'neutral',
    },
    {
      label: 'Business Health',
      // Wave 81: prefer the composite Merchant Health (audited institution) so the hero band agrees with
      // the score shown lower on the page; fall back to the crude state only until the composite loads.
      value: compositeHealth && compositeHealth.score != null
        ? `${compositeHealth.score}/100`
        : m.healthLabel,
      tone: compositeHealth && compositeHealth.score != null
        ? (compositeHealth.score >= 65 ? 'strong' : compositeHealth.score >= 45 ? 'neutral' : 'weak')
        : HEALTH_TONE[m.health],
    },
  ];

  // Continuity is surfaced as a seventh signal only when it differs from "unknown",
  // keeping the band focused while still exposing the differentiator.
  if (m.continuity.readiness !== 'unknown') {
    signals.push({ label: 'Continuity', value: cont.v, tone: cont.t });
  }

  return (
    <section className="relative mb-16" aria-label="Merchant Headquarters overview">
      <div className="max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300/90">
          <Building2 size={13} aria-hidden="true" />
          Commerce Institution
        </span>
        <h1 className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight text-white md:text-6xl">
          Merchant Headquarters
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
          Commerce infrastructure designed to help businesses accept payments, manage operations,
          build customer relationships, and preserve long-term continuity.
        </p>
        {m.businessName && (
          <p className="mt-4 text-sm text-zinc-500">
            Operating as <span className="font-medium text-zinc-300">{m.businessName}</span>
          </p>
        )}
      </div>

      {/* Executive status band — institutional intelligence, generous air */}
      <div className="mt-12 grid grid-cols-2 gap-x-8 gap-y-10 border-t border-white/[0.06] pt-10 md:grid-cols-3 lg:grid-cols-4">
        {signals.map((s) => (
          <div key={s.label}>
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{s.label}</p>
            <p className={`mt-2 text-2xl font-semibold tracking-tight ${TONE[s.tone]}`}>{s.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
