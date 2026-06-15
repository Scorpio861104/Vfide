'use client';

/**
 * MarketStandingPanel (Whale Protection — transparency requirement).
 *
 * "No black-box enforcement." This shows a participant their own standing in plain language: their
 * Builder Record, their Extraction Index (with category + how it decays), how it affects VFIDE's
 * services, and — stated plainly — that none of it touches their ability to own or move their tokens.
 *
 * Read-only/presentational: pass in the already-computed results (server computes from real signals).
 */

import type { BuilderResult } from '@/lib/seer/marketStability/builderRecord';
import type { ExtractionResult } from '@/lib/seer/marketStability/extractionIndex';
import type { StabilityDecision } from '@/lib/seer/marketStability/stabilityPolicy';
import { ShieldCheck, TrendingUp, Info } from 'lucide-react';

export interface MarketStandingPanelProps {
  builder: BuilderResult;
  extraction: ExtractionResult;
  decision: StabilityDecision;
}

export function MarketStandingPanel({ builder, extraction, decision }: MarketStandingPanelProps) {
  const exPct = Math.min(100, (extraction.index / 10000) * 100);

  return (
    <div className="space-y-6">
      {/* Builder Record */}
      <section className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.04] p-6">
        <div className="flex items-center gap-2.5">
          <ShieldCheck size={18} className="text-emerald-300" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-white">Your Builder Record</h2>
        </div>
        <p className="mt-1 text-sm text-emerald-200/90">
          {builder.category} · this reflects what you’ve contributed — not how much you hold.
        </p>
        {builder.contributingFactors.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {builder.contributingFactors.map((f) => (
              <li key={f} className="rounded-full bg-white/[0.05] px-2.5 py-1 text-xs text-zinc-300">{f}</li>
            ))}
          </ul>
        )}
      </section>

      {/* Extraction Index */}
      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <TrendingUp size={18} className="text-zinc-300" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-white">Market behavior</h2>
          </div>
          <span className="text-sm font-medium text-zinc-300">{extraction.category}</span>
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-amber-400" style={{ width: `${exPct}%` }} />
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Built only from destabilizing patterns (repeated large sells, pump/dump cycles) — never from your wallet size.
          This recovers on its own over time; steady behavior restores your standing.
        </p>
        {extraction.contributingFactors.length > 0 && (
          <ul className="mt-3 space-y-1">
            {extraction.contributingFactors.map((f) => (
              <li key={f} className="text-xs text-zinc-400">• {f}</li>
            ))}
          </ul>
        )}
      </section>

      {/* What it affects — transparency */}
      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
        <div className="flex items-center gap-2.5">
          <Info size={16} className="text-cyan-300/80" aria-hidden="true" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-zinc-400">What this affects</h2>
        </div>
        <ul className="mt-4 space-y-2 text-sm text-zinc-300">
          {decision.explanation.map((e, i) => (
            <li key={i} className="flex gap-2"><span className="text-zinc-600">—</span><span>{e}</span></li>
          ))}
        </ul>
        <div className="mt-4 rounded-lg border border-cyan-400/15 bg-cyan-400/[0.05] p-3">
          <p className="text-xs leading-relaxed text-cyan-200/90">
            Your tokens are yours. Nothing here can freeze, hold, or tax them — VFIDE only adjusts its own
            services (lending, marketplace visibility, emergency relief). If you think something is wrong,
            you can ask the DAO to review it.
          </p>
        </div>
      </section>
    </div>
  );
}
