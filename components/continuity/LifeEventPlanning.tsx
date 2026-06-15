'use client';

/**
 * LifeEventPlanning + RecoverySimulator — the human-facing continuity sections.
 *
 * LifeEventPlanning: four real-world situations, explained for normal people (not crypto users).
 * RecoverySimulator: visual continuity pathways — what happens, step by step, when something goes
 * wrong. No major crypto platform explains continuity visually; this is a core differentiator.
 *
 * Both are explanatory (no contract reads) — they translate the protocol's continuity guarantees
 * into plain situations, with links into the actual setup surfaces.
 */

import Link from 'next/link';
import { useState } from 'react';
import { Users, Briefcase, LifeBuoy, Landmark, ArrowRight, ArrowDown } from 'lucide-react';

interface LifeEvent {
  id: string;
  title: string;
  description: string;
  icon: typeof Users;
  href: string;
  cta: string;
}

const LIFE_EVENTS: LifeEvent[] = [
  {
    id: 'family',
    title: 'Family Protection',
    description: 'Protect access to your assets and records for the people you love, so nothing is lost if something happens to you.',
    icon: Users,
    href: '/inheritance',
    cta: 'Plan family access',
  },
  {
    id: 'business',
    title: 'Business Continuity',
    description: 'Keep your business running during an absence or transition — payments, records, and operations stay available to the right people.',
    icon: Briefcase,
    href: '/guardians',
    cta: 'Set up continuity',
  },
  {
    id: 'emergency',
    title: 'Emergency Recovery',
    description: 'Recover from a lost device, a stolen phone, or a compromised account — without losing your funds or your history.',
    icon: LifeBuoy,
    href: '/vault/recover',
    cta: 'Prepare recovery',
  },
  {
    id: 'succession',
    title: 'Long-Term Succession',
    description: 'Pass stewardship to the people you choose, on the terms you set, whenever the time comes.',
    icon: Landmark,
    href: '/inheritance',
    cta: 'Arrange succession',
  },
];

export function LifeEventPlanning() {
  return (
    <section className="mb-16" aria-label="Life event planning">
      <div className="mb-8 max-w-2xl">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">Life Event Planning</h2>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-white">Continuity for real situations</p>
        <p className="mt-3 text-zinc-400">
          Protection planned around what actually happens in life — not crypto mechanics.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {LIFE_EVENTS.map((e) => {
          const Icon = e.icon;
          return (
            <Link
              key={e.id}
              href={e.href}
              className="group flex flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7 transition-colors hover:bg-white/[0.04]"
            >
              <Icon size={22} className="text-pink-300/80" aria-hidden="true" />
              <h3 className="mt-5 text-lg font-semibold text-white">{e.title}</h3>
              <p className="mt-3 flex-1 leading-relaxed text-zinc-400">{e.description}</p>
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-400 transition-colors group-hover:text-white">
                {e.cta} <ArrowRight size={14} aria-hidden="true" />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

interface Pathway {
  id: string;
  scenario: string;
  steps: string[];
}

const PATHWAYS: Pathway[] = [
  { id: 'lost', scenario: 'Wallet Lost', steps: ['Wallet Lost', 'Guardian Verification', 'Recovery Process', 'Access Restored'] },
  { id: 'stolen', scenario: 'Device Stolen', steps: ['Device Stolen', 'Security Lock', 'Identity Verification', 'Recovery'] },
  { id: 'incapacitated', scenario: 'Owner Incapacitated', steps: ['Owner Incapacitated', 'Continuity Protocol', 'Authorized Contacts', 'Asset Preservation'] },
  { id: 'deceased', scenario: 'Owner Deceased', steps: ['Owner Deceased', 'Inheritance Process', 'Transfer Mechanism', 'Continuity Completion'] },
];

export function RecoverySimulator() {
  const [active, setActive] = useState<string>(PATHWAYS[0]?.id ?? 'lost');
  const pathway = PATHWAYS.find((p) => p.id === active) ?? PATHWAYS[0];
  if (!pathway) return null;

  return (
    <section className="mb-16" aria-label="Recovery simulator">
      <div className="mb-8 max-w-2xl">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">Recovery Simulator</h2>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-white">See how continuity works</p>
        <p className="mt-3 text-zinc-400">
          Pick a situation. Follow the path from disruption to restored access.
        </p>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 md:p-8">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Recovery scenarios">
          {PATHWAYS.map((p) => {
            const selected = p.id === active;
            return (
              <button
                key={p.id}
                role="tab"
                aria-selected={selected}
                onClick={() => setActive(p.id)}
                className={
                  selected
                    ? 'rounded-full bg-pink-400/15 px-4 py-2 text-sm font-medium text-pink-200 ring-1 ring-pink-400/30'
                    : 'rounded-full px-4 py-2 text-sm font-medium text-zinc-400 ring-1 ring-white/10 transition-colors hover:text-white hover:ring-white/20'
                }
              >
                {p.scenario}
              </button>
            );
          })}
        </div>

        <div className="mt-10">
          <ol className="hidden items-stretch gap-3 md:flex">
            {pathway.steps.map((step, i) => {
              const isLast = i === pathway.steps.length - 1;
              return (
                <li key={i} className="flex flex-1 items-center gap-3">
                  <div
                    className={
                      isLast
                        ? 'flex w-full flex-col rounded-xl border border-emerald-400/25 bg-emerald-400/[0.06] px-4 py-5'
                        : 'flex w-full flex-col rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-5'
                    }
                  >
                    <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                      Step {i + 1}
                    </span>
                    <span className={`mt-1.5 font-semibold ${isLast ? 'text-emerald-300' : 'text-white'}`}>{step}</span>
                  </div>
                  {!isLast && <ArrowRight size={18} className="shrink-0 text-zinc-600" aria-hidden="true" />}
                </li>
              );
            })}
          </ol>

          <ol className="space-y-3 md:hidden">
            {pathway.steps.map((step, i) => {
              const isLast = i === pathway.steps.length - 1;
              return (
                <li key={i} className="flex flex-col items-stretch">
                  <div
                    className={
                      isLast
                        ? 'rounded-xl border border-emerald-400/25 bg-emerald-400/[0.06] px-4 py-4'
                        : 'rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-4'
                    }
                  >
                    <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Step {i + 1}</span>
                    <span className={`mt-1 block font-semibold ${isLast ? 'text-emerald-300' : 'text-white'}`}>{step}</span>
                  </div>
                  {!isLast && (
                    <div className="flex justify-center py-1.5">
                      <ArrowDown size={16} className="text-zinc-600" aria-hidden="true" />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}'use client';

