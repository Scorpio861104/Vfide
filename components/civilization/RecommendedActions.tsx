'use client';

import Link from 'next/link';
import { ArrowRight, Compass } from 'lucide-react';
import { INSTITUTIONS } from '@/lib/civilization/model';
import type { Recommendation } from '@/hooks/useCivilizationStatus';

export function RecommendedActions({ recommendations }: { recommendations: Recommendation[] }) {
  const top = recommendations.slice(0, 3);
  if (top.length === 0) return null;

  return (
    <section aria-label="Recommended next actions" className="glass-card-premium p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Compass size={16} className="text-cyan-400" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-white">What to do next</h2>
      </div>
      <ol className="space-y-2.5">
        {top.map((r, i) => {
          const meta = INSTITUTIONS[r.institutionId];
          return (
            <li key={r.id}>
              <Link
                href={r.href}
                className="group flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 transition-colors hover:bg-white/[0.05]"
              >
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-cyan-400">
                  {i + 1}
                </span>
                <span className="flex-1 text-sm font-semibold text-white">{r.label}</span>
                <span
                  className="hidden rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider sm:inline"
                  style={{ borderColor: `${meta.color}33`, background: `${meta.color}1a`, color: meta.color }}
                >
                  {meta.label}
                </span>
                <ArrowRight
                  size={15}
                  className="flex-shrink-0 text-zinc-500 transition-colors group-hover:text-cyan-400"
                  aria-hidden="true"
                />
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
