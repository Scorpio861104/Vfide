'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { INSTITUTIONS, RELATIONSHIPS } from '@/lib/civilization/model';

const CORE = RELATIONSHIPS.slice(0, 6);

function Node({ id }: { id: keyof typeof INSTITUTIONS }) {
  const inst = INSTITUTIONS[id];
  const Icon = inst.icon;
  return (
    <Link
      href={inst.homeHref}
      className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm font-semibold transition-colors hover:bg-white/5"
      style={{ borderColor: `${inst.color}33`, color: inst.color }}
    >
      <Icon size={14} aria-hidden="true" />
      {inst.label}
    </Link>
  );
}

export function CivilizationRelationships() {
  return (
    <section aria-label="How the institutions connect" className="glass-card-premium p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">How it connects</h2>
        <p className="mt-0.5 text-sm text-zinc-500">The institutions are a chain, not a menu.</p>
      </div>
      <ul className="space-y-3">
        {CORE.map((rel) => (
          <li
            key={`${rel.from}-${rel.to}`}
            className="flex flex-col gap-2 rounded-xl border border-white/8 bg-white/[0.02] p-3 sm:flex-row sm:items-center sm:gap-3"
          >
            <div className="flex items-center gap-2">
              <Node id={rel.from} />
              <ArrowRight size={14} className="flex-shrink-0 text-zinc-600" aria-hidden="true" />
              <Node id={rel.to} />
            </div>
            <p className="text-sm leading-relaxed text-zinc-400 sm:ml-1">{rel.relation}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
