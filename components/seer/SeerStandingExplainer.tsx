'use client';

/**
 * SeerStandingExplainer — surfaces the deep plain-language standing explainability on the Seer page
 * (Wave 76 Priority 3). It feeds the already-built MarketStandingPanel (which explains Builder Record +
 * Extraction Index in plain language, how Extraction decays, and that none of it touches token ownership)
 * with live data from useMarketStanding. Before this, MarketStandingPanel had 0 UI consumers — the
 * Seer's strongest explainability surface was unused. Makes the Seer feel like an advisor, not a judge.
 */

import { useMarketStanding } from '@/hooks/useMarketStanding';
import { MarketStandingPanel } from '@/components/seer/MarketStandingPanel';

export function SeerStandingExplainer() {
  const { builder, extraction, decision, loading, error } = useMarketStanding();

  if (loading) return <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-500">Loading your standing…</div>;
  if (error || !builder || !extraction || !decision) return null; // not signed in / no data — quiet

  return (
    <div className="mt-8">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-500">Your standing, explained</h2>
      <MarketStandingPanel builder={builder} extraction={extraction} decision={decision} />
    </div>
  );
}
