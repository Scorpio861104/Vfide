'use client';

/**
 * MerchantDiscoveryStanding — surfaces a merchant's OWN discovery explainability (Wave 76 Priority 2).
 *
 * Reads GET /api/merchant/discovery-standing and shows WHY the merchant ranks (the itemized whyRanked
 * breakdown the search engine uses) + concrete tips to improve. Before this, `whyRanked` existed only
 * inside search results — a merchant couldn't see their own ranking factors. Reinforces the anti-pay-to-win
 * philosophy in plain language.
 */

import { useEffect, useState } from 'react';
import { Search, ArrowUpRight, Info } from 'lucide-react';

interface WhyRanked { signal: string; contribution: number; detail: string }
interface DiscoveryStanding { score: number; relevanceBucket: number; whyRanked: WhyRanked[]; tips: string[]; note: string }

export function MerchantDiscoveryStanding({ enabled }: { enabled: boolean }) {
  const [data, setData] = useState<DiscoveryStanding | null>(null);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/merchant/discovery-standing', { credentials: 'include' });
        if (!res.ok) { if (!cancelled) setLoading(false); return; }
        const json = await res.json();
        if (!cancelled) { setData(json); setLoading(false); }
      } catch { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [enabled]);

  if (!enabled) return null;
  if (loading) return <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-500">Loading your discovery standing…</div>;
  if (!data) return null;

  return (
    <section className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.04] p-6">
      <div className="flex items-center gap-2 text-cyan-200">
        <Search className="h-4 w-4" />
        <h3 className="text-sm font-medium">Why you appear in discovery</h3>
      </div>

      <ul className="mt-4 space-y-2">
        {data.whyRanked.map((w, i) => (
          <li key={i} className="flex items-start justify-between gap-3 border-l-2 border-zinc-700/50 pl-3">
            <div>
              <p className="text-sm text-zinc-200">{w.signal}</p>
              <p className="text-xs text-zinc-500">{w.detail}</p>
            </div>
            <span className={`shrink-0 text-sm tabular-nums ${w.contribution >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
              {w.contribution >= 0 ? '+' : ''}{w.contribution}
            </span>
          </li>
        ))}
      </ul>

      {data.tips.length > 0 && (
        <div className="mt-4 border-t border-cyan-400/10 pt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">How to improve</p>
          <ul className="mt-2 space-y-1.5">
            {data.tips.map((t, i) => (
              <li key={i} className="flex items-start gap-1.5 text-sm text-cyan-100/90">
                <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400/70" /> {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex items-start gap-1.5 text-xs text-zinc-500">
        <Info className="mt-0.5 h-3 w-3 shrink-0" /> {data.note}
      </div>
    </section>
  );
}
