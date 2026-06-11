'use client';

/**
 * PreservationNarrative — the emotional layer (Wave 42).
 *
 * Below the Ownership Nexus: why VFIDE exists beyond building. Preservation, continuity, and
 * ownership longevity, told through real-world scenarios and a decades-long ownership arc. Large
 * type, generous space, minimal words — the message is permanence, not activity.
 *
 * Content is accurate to VFIDE's real capabilities (recovery, continuity, inheritance, merchant
 * sustainability) and frames philosophy, never attacks competitors.
 */

import Link from 'next/link';
import {
  Smartphone, LifeBuoy, CheckCircle2, Briefcase, Activity, Heart, ArrowRightLeft,
  ScrollText, Store, ShieldCheck, TrendingUp, ArrowRight, ArrowDown,
  Hammer, Lock, Settings, Archive, Send, type LucideIcon,
} from 'lucide-react';

// ─── Intro ───────────────────────────────────────────────────────────────────

export function PreservationIntro() {
  return (
    <section className="py-24 sm:py-32" aria-label="Why preservation matters">
      <div className="container mx-auto max-w-4xl px-5 text-center md:px-8">
        <h2 className="text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl">
          Most platforms help you build.
          <span className="mt-2 block text-zinc-500">Few help you preserve.</span>
        </h2>
        <div className="mx-auto mt-10 max-w-2xl space-y-4 text-lg leading-relaxed text-zinc-400">
          <p>Assets can grow. Businesses can expand. Communities can thrive.</p>
          <p className="text-zinc-300">But what happens when disruption occurs?</p>
          <p>
            VFIDE was designed to help protect, operate, recover, and preserve what matters.
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── Real-world scenarios (life cards) ───────────────────────────────────────

interface Scenario {
  id: string;
  steps: { label: string; icon: LucideIcon }[];
  href: string;
  accent: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: 'device',
    accent: '#3b82f6',
    href: '/vault/recover',
    steps: [
      { label: 'Lost device', icon: Smartphone },
      { label: 'Recovery systems', icon: LifeBuoy },
      { label: 'Access restored', icon: CheckCircle2 },
    ],
  },
  {
    id: 'business',
    accent: '#10b981',
    href: '/continuity',
    steps: [
      { label: 'Business interruption', icon: Briefcase },
      { label: 'Continuity planning', icon: Activity },
      { label: 'Operations continue', icon: CheckCircle2 },
    ],
  },
  {
    id: 'family',
    accent: '#ec4899',
    href: '/inheritance',
    steps: [
      { label: 'Family transition', icon: Heart },
      { label: 'Succession planning', icon: ArrowRightLeft },
      { label: 'Ownership preserved', icon: ScrollText },
    ],
  },
  {
    id: 'merchant',
    accent: '#8b5cf6',
    href: '/merchant',
    steps: [
      { label: 'Merchant growth', icon: Store },
      { label: 'Trust infrastructure', icon: ShieldCheck },
      { label: 'Commerce expands', icon: TrendingUp },
    ],
  },
];

export function PreservationScenarios() {
  return (
    <section className="py-20 sm:py-24" aria-label="Real-world scenarios">
      <div className="container mx-auto max-w-6xl px-5 md:px-8">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">When life happens</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Built for the moments that matter
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {SCENARIOS.map((sc) => (
            <Link
              key={sc.id}
              href={sc.href}
              className="group rounded-3xl border border-white/[0.06] bg-white/[0.02] p-8 transition-colors hover:bg-white/[0.04] sm:p-10"
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-3">
                {sc.steps.map((step, i) => {
                  const Icon = step.icon;
                  const isLast = i === sc.steps.length - 1;
                  return (
                    <div key={step.label} className="flex items-center gap-5 sm:flex-1 sm:flex-col sm:items-start sm:gap-3">
                      <span
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                        style={{ backgroundColor: `${sc.accent}1a`, border: `1px solid ${sc.accent}33` }}
                      >
                        <Icon size={22} style={{ color: isLast ? '#34d399' : sc.accent }} aria-hidden="true" />
                      </span>
                      <span className={`text-base font-semibold ${isLast ? 'text-emerald-300' : 'text-white'}`}>
                        {step.label}
                      </span>
                      {!isLast && (
                        <>
                          <ArrowDown size={16} className="text-zinc-700 sm:hidden" aria-hidden="true" />
                          <ArrowRight size={16} className="hidden shrink-0 text-zinc-700 sm:block" aria-hidden="true" />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Ownership timeline ──────────────────────────────────────────────────────

const TIMELINE: { label: string; note: string; icon: LucideIcon }[] = [
  { label: 'Build', note: 'Establish ownership you control.', icon: Hammer },
  { label: 'Protect', note: 'Trust and protection keep it safe.', icon: Lock },
  { label: 'Operate', note: 'Run commerce and grow.', icon: Settings },
  { label: 'Preserve', note: 'Continuity through disruption.', icon: Archive },
  { label: 'Transfer', note: 'Pass it on, on your terms.', icon: Send },
];

export function OwnershipTimeline() {
  return (
    <section className="py-20 sm:py-24" aria-label="Ownership over time">
      <div className="container mx-auto max-w-6xl px-5 md:px-8">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Ownership over time</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            An arc measured in decades
          </h2>
          <p className="mt-4 text-zinc-400">Not transactions across minutes.</p>
        </div>

        {/* Desktop: horizontal arc */}
        <ol className="relative hidden lg:flex lg:items-start lg:justify-between">
          <div className="absolute left-0 right-0 top-6 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" aria-hidden="true" />
          {TIMELINE.map((t) => {
            const Icon = t.icon;
            return (
              <li key={t.label} className="relative flex w-1/5 flex-col items-center px-3 text-center">
                <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-zinc-950">
                  <Icon size={18} className="text-cyan-300/80" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-white">{t.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">{t.note}</p>
              </li>
            );
          })}
        </ol>

        {/* Mobile: vertical arc */}
        <ol className="space-y-6 lg:hidden">
          {TIMELINE.map((t) => {
            const Icon = t.icon;
            return (
              <li key={t.label} className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-zinc-950">
                  <Icon size={17} className="text-cyan-300/80" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-semibold text-white">{t.label}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-500">{t.note}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

// ─── Longevity ───────────────────────────────────────────────────────────────

const LONGEVITY: { label: string; icon: LucideIcon }[] = [
  { label: 'Protection', icon: ShieldCheck },
  { label: 'Recovery', icon: LifeBuoy },
  { label: 'Continuity', icon: Activity },
  { label: 'Governance', icon: Settings },
  { label: 'Inheritance', icon: ScrollText },
  { label: 'Merchant sustainability', icon: Store },
];

export function LongevitySection() {
  return (
    <section className="py-24 sm:py-32" aria-label="Designed for decades">
      <div className="container mx-auto max-w-5xl px-5 md:px-8">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <h2 className="text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl">
            Designed for decades, not moments.
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.04] sm:grid-cols-3">
          {LONGEVITY.map((l) => {
            const Icon = l.icon;
            return (
              <div key={l.label} className="flex flex-col items-center gap-3 bg-zinc-950/40 p-8 text-center sm:p-10">
                <Icon size={24} className="text-zinc-400" aria-hidden="true" />
                <span className="text-base font-semibold text-white">{l.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── The VFIDE difference (philosophy) ───────────────────────────────────────

const DIFFERENCE: { most: string; vfide: string }[] = [
  { most: 'Most platforms focus on activity.', vfide: 'VFIDE focuses on continuity.' },
  { most: 'Most platforms focus on transactions.', vfide: 'VFIDE focuses on preservation.' },
  { most: 'Most platforms focus on today.', vfide: 'VFIDE considers tomorrow.' },
];

export function VFIDEDifference() {
  return (
    <section className="py-24 sm:py-32" aria-label="The VFIDE difference">
      <div className="container mx-auto max-w-4xl px-5 md:px-8">
        <div className="mb-14 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">A different emphasis</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">The VFIDE difference</h2>
        </div>
        <div className="space-y-px overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.04]">
          {DIFFERENCE.map((d) => (
            <div key={d.vfide} className="grid grid-cols-1 gap-2 bg-zinc-950/40 p-8 sm:grid-cols-2 sm:items-center sm:gap-8 sm:p-10">
              <p className="text-lg text-zinc-500">{d.most}</p>
              <p className="text-lg font-semibold text-white sm:text-xl">{d.vfide}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-12 max-w-2xl text-center text-lg leading-relaxed text-zinc-400">
          Ownership infrastructure designed to survive disruption and preserve value over time.
        </p>
      </div>
    </section>
  );
}

// ─── Composed layer ──────────────────────────────────────────────────────────

export function PreservationNarrative() {
  return (
    <div className="relative">
      <PreservationIntro />
      <PreservationScenarios />
      <OwnershipTimeline />
      <LongevitySection />
      <VFIDEDifference />
    </div>
  );
}
