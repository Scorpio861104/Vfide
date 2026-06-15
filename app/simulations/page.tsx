'use client';

/**
 * Simulation Bureau (Platform Transformation, Wave 6).
 *
 * Understand consequences before reality forces them. Simulators are grouped by category; live ones open inline,
 * coming ones are marked plainly. Educational only — every simulator carries that framing.
 */
import { useState } from 'react';
import Link from 'next/link';
import { HQRoot, Surface } from '@/components/headquarters/HQTheme';
import { PrimaryNav } from '@/components/headquarters/PrimaryNav';
import { SimulationRunner } from '@/components/headquarters/SimulationRunner';
import { SIMULATORS, SIM_CATEGORY_LABEL, SIM_CATEGORY_ORDER, simulatorsByCategory, type Simulator } from '@/lib/simulations/model';
import { ArrowLeft, Play, Clock } from 'lucide-react';

export default function SimulationsPage() {
  const [active, setActive] = useState<string | null>(null);

  return (
    <HQRoot>
      <div className="mx-auto max-w-3xl px-6 py-10">
        <PrimaryNav />
        <Link href="/command-center" className="mt-8 inline-flex items-center gap-2 text-xs transition-colors hover:underline" style={{ color: 'var(--hq-ink-faint)' }}>
          <ArrowLeft size={13} /> Command Center
        </Link>
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--hq-gold)' }}>Simulation Bureau</p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight md:text-4xl" style={{ color: 'var(--hq-ink)' }}>
          Understand it before you live it
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed" style={{ color: 'var(--hq-ink-soft)' }}>
          Walk through what happens in different situations, or try the numbers for yourself. Every simulator is
          educational — there are no predictions about you and no financial advice.
        </p>

        {active && (
          <section className="mt-8">
            <button onClick={() => setActive(null)} className="mb-3 text-xs transition-colors hover:underline" style={{ color: 'var(--hq-ink-faint)' }}>
              ← All simulators
            </button>
            <SimulationRunner id={active} />
          </section>
        )}

        {!active && (
          <div className="mt-10 space-y-9">
            {SIM_CATEGORY_ORDER.map((cat) => (
              <section key={cat}>
                <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--hq-ink-faint)' }}>{SIM_CATEGORY_LABEL[cat]}</h2>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {simulatorsByCategory(cat).map((s) => <SimCard key={s.id} sim={s} onRun={() => setActive(s.id)} />)}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </HQRoot>
  );
}

function SimCard({ sim, onRun }: { sim: Simulator; onRun: () => void }) {
  const live = sim.status === 'live';
  const inner = (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--hq-ink)' }}>{sim.title}</p>
        <p className="mt-0.5 text-xs leading-relaxed" style={{ color: 'var(--hq-ink-faint)' }}>{sim.premise}</p>
      </div>
      {live
        ? <Play size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--hq-gold)' }} />
        : <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-[10px] uppercase tracking-wider" style={{ color: 'var(--hq-ink-faint)' }}><Clock size={11} /> Coming</span>}
    </div>
  );
  const style = { background: 'var(--hq-graphite)', border: '1px solid var(--hq-edge)' } as const;
  return live
    ? <button onClick={onRun} className="rounded-xl px-4 py-3 text-left transition-colors hover:bg-white/[0.02]" style={style}>{inner}</button>
    : <div className="rounded-xl px-4 py-3 opacity-70" style={style}>{inner}</div>;
}
