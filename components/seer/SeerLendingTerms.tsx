'use client';

import { useMarketStanding } from '@/hooks/useMarketStanding';
import { HandCoins, Info } from 'lucide-react';

const TIER_TONE: Record<string, string> = {
  Prime: 'bg-emerald-400/10 text-emerald-200',
  Standard: 'bg-cyan-400/10 text-cyan-200',
  Cautious: 'bg-amber-400/10 text-amber-200',
  Restricted: 'bg-rose-400/10 text-rose-200',
  Ineligible: 'bg-zinc-500/10 text-zinc-300',
};

export function SeerLendingTerms() {
  const { lendingTerms: terms, loading } = useMarketStanding();

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-sm text-zinc-500">
        Loading your lending standing...
      </div>
    );
  }

  if (!terms) return null;

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <HandCoins size={18} className="text-cyan-300/80" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-white">Your suggested loan terms</h2>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${TIER_TONE[terms.riskTier] ?? TIER_TONE.Standard}`}>
          {terms.riskTier}
        </span>
      </div>

      {!terms.eligible ? (
        <p className="mt-3 text-sm text-zinc-300">{terms.explanation[0]}</p>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Protocol ceiling</p>
              <p className="mt-1 text-lg font-bold text-white">
                {terms.onChainMaxVfide.toLocaleString()} <span className="text-xs font-normal text-zinc-500">VFIDE</span>
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Suggested amount</p>
              <p className="mt-1 text-lg font-bold text-cyan-200">
                {terms.suggestedLimitVfide.toLocaleString()} <span className="text-xs font-normal text-zinc-500">VFIDE</span>
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Fair interest</p>
              <p className="mt-1 text-lg font-bold text-white">
                {(terms.suggestedInterestBps.min / 100).toFixed(1)}-{(terms.suggestedInterestBps.max / 100).toFixed(1)}%
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-zinc-300">
            Collateral: <span className="text-zinc-100">{terms.collateralGuidance}</span>
          </p>
        </>
      )}

      <div className="mt-5 space-y-1.5">
        {terms.explanation.map((item, i) => (
          <p key={i} className="flex items-start gap-2 text-xs text-zinc-500">
            <Info size={12} className="mt-0.5 shrink-0 text-zinc-600" aria-hidden="true" />
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}
