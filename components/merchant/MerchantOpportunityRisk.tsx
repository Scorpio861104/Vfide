'use client';

/**
 * MerchantOpportunityRisk — surfaces the HQ Opportunity Center + Risk Center (Wave 75 cohesion wiring).
 *
 * Renders the structured cause → effect → action/mitigation entries the /api/merchant/hq payload produces.
 * Before this, that intelligence had no UI. Opportunities read as encouragement (advisor, not judge);
 * risks read as plain-language guidance with a concrete mitigation. Every risk reaffirms that nothing
 * here touches token ownership.
 */

import { useMerchantHQ } from '@/hooks/useMerchantHQ';
import { TrendingUp, ShieldAlert, Info } from 'lucide-react';

export interface MerchantOpportunityRiskProps {
  /** Only fetch/show for a connected merchant. */
  enabled: boolean;
}

const LEVEL_STYLE: Record<string, string> = {
  high: 'border-red-400/20 bg-red-400/[0.04]',
  medium: 'border-amber-400/20 bg-amber-400/[0.04]',
  low: 'border-zinc-700/40 bg-zinc-800/20',
};

export function MerchantOpportunityRisk({ enabled }: MerchantOpportunityRiskProps) {
  const hq = useMerchantHQ(enabled);

  if (!enabled) return null;
  if (hq.loading) return <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-500">Loading your business intelligence…</div>;
  if (hq.error) return null; // fail quiet — this is an enhancement, not a blocker

  const hasContent = hq.opportunityCenter.length > 0 || hq.riskCenter.length > 0 || hq.health;
  if (!hasContent) return null;

  return (
    <div className="space-y-6">
      {hq.health && (
        <section className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.04] p-6">
          <div className="flex items-center gap-2 text-cyan-200">
            <Info className="h-4 w-4" />
            <h3 className="text-sm font-medium">Business health</h3>
          </div>
          <p className="mt-2 text-2xl font-semibold text-zinc-100">
            {hq.health.score == null ? 'Building…' : `${hq.health.score}/100`}
            <span className="ml-2 text-sm font-normal text-zinc-400 capitalize">{hq.health.band.replace('_', ' ')}</span>
          </p>
          <p className="mt-1 text-sm text-zinc-400">{hq.health.topRecommendation}</p>

          {/* Explainability (Wave 80): WHY the score is what it is — what helped, what hurt. */}
          {hq.health.components.some((c) => c.value != null) && (
            <div className="mt-4 border-t border-cyan-400/10 pt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">What goes into this</p>
              <ul className="mt-2 space-y-1.5">
                {hq.health.components.filter((c) => c.value != null).map((c, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-zinc-300">{c.name}</span>
                    <span className="flex items-center gap-2">
                      <span className={`tabular-nums ${(c.value ?? 0) >= 60 ? 'text-emerald-300' : (c.value ?? 0) >= 40 ? 'text-amber-300' : 'text-red-300'}`}>
                        {Math.round(c.value ?? 0)}/100
                      </span>
                      <span className="text-xs text-zinc-600">·{c.weight}% weight</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-zinc-500">Higher-weighted factors move your score the most. Components without enough data yet aren&apos;t counted.</p>
            </div>
          )}
        </section>
      )}

      {/* Opportunity Center — encouragement, cause → effect → action */}
      {hq.opportunityCenter.length > 0 && (
        <section className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.04] p-6">
          <div className="flex items-center gap-2 text-emerald-300">
            <TrendingUp className="h-4 w-4" />
            <h3 className="text-sm font-medium">Opportunities</h3>
          </div>
          <ul className="mt-4 space-y-4">
            {hq.opportunityCenter.map((o, i) => (
              <li key={i} className="border-l-2 border-emerald-400/30 pl-4">
                <p className="text-sm font-medium text-zinc-200">{o.signal}</p>
                <p className="mt-0.5 text-sm text-zinc-400"><span className="text-zinc-500">Why:</span> {o.cause}</p>
                <p className="text-sm text-zinc-400"><span className="text-zinc-500">Benefit:</span> {o.effect}</p>
                <p className="mt-1 text-sm text-emerald-200/90">→ {o.action}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Risk Center — plain-language, cause → impact → mitigation */}
      {hq.riskCenter.length > 0 && (
        <section className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.04] p-6">
          <div className="flex items-center gap-2 text-amber-300">
            <ShieldAlert className="h-4 w-4" />
            <h3 className="text-sm font-medium">Things to address</h3>
          </div>
          <ul className="mt-4 space-y-3">
            {hq.riskCenter.map((r, i) => (
              <li key={i} className={`rounded-xl border p-4 ${LEVEL_STYLE[r.level] ?? LEVEL_STYLE.low}`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-zinc-200">{r.signal}</p>
                  <span className="text-xs uppercase tracking-wide text-zinc-500">{r.level}</span>
                </div>
                <p className="mt-1 text-sm text-zinc-400"><span className="text-zinc-500">Why:</span> {r.cause}</p>
                <p className="text-sm text-zinc-400"><span className="text-zinc-500">Impact:</span> {r.effect}</p>
                <p className="mt-1 text-sm text-amber-200/90">→ {r.mitigation}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-zinc-500">None of these affect your ownership — your tokens are always yours.</p>
        </section>
      )}
    </div>
  );
}
