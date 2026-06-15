'use client';

/**
 * ContinuityCommandHero — monumental institutional hero for the Continuity Command Center.
 *
 * "Ownership That Survives You." Presents five readiness metrics derived from REAL continuity
 * state (useContinuityStatus) — no fabricated numbers. Premium institutional presentation:
 * large type, generous spacing, strong hierarchy, minimal decoration.
 */

import type { ContinuityStatus } from '@/hooks/useContinuityStatus';
import { ShieldCheck } from 'lucide-react';

interface Metric {
  label: string;
  value: string;
  tone: 'strong' | 'partial' | 'weak' | 'neutral';
}

const TONE: Record<Metric['tone'], string> = {
  strong: 'text-emerald-300',
  partial: 'text-amber-300',
  weak: 'text-zinc-500',
  neutral: 'text-zinc-200',
};

function pct(n: number, of: number): string {
  if (of <= 0) return '0%';
  return `${Math.round((n / of) * 100)}%`;
}

function sectionState(c: ContinuityStatus, id: string): string | undefined {
  return c.sections.find((s) => s.id === id)?.state;
}

export function ContinuityCommandHero({ c }: { c: ContinuityStatus }) {
  const guardiansOk = sectionState(c, 'guardians') === 'ok';
  const securityState = sectionState(c, 'security');
  const protectedSections = c.sections.filter((s) => s.state === 'ok').length;

  const metrics: Metric[] = [
    {
      label: 'Recovery Readiness',
      value: c.recoveryConfigured ? 'Ready' : c.recoveryPending ? 'In progress' : 'Not set',
      tone: c.recoveryConfigured ? 'strong' : c.recoveryPending ? 'partial' : 'weak',
    },
    {
      label: 'Trusted Contacts',
      value: guardiansOk ? `${c.guardianCount} configured` : c.guardianCount > 0 ? `${c.guardianCount} added` : 'None yet',
      tone: guardiansOk ? 'strong' : c.guardianCount > 0 ? 'partial' : 'weak',
    },
    {
      label: 'Protection Coverage',
      value: pct(protectedSections, c.sections.length),
      tone: protectedSections === c.sections.length ? 'strong' : protectedSections > 0 ? 'partial' : 'weak',
    },
    {
      label: 'Continuity Completion',
      value: `${c.configuredCount} of 3`,
      tone: c.configuredCount === 3 ? 'strong' : c.configuredCount > 0 ? 'partial' : 'weak',
    },
    {
      label: 'Vault Security',
      value: securityState === 'ok' ? 'Protected' : securityState === 'active' ? 'Active' : securityState === 'partial' ? 'Partial' : 'Review',
      tone: securityState === 'ok' ? 'strong' : securityState === 'active' || securityState === 'partial' ? 'partial' : 'neutral',
    },
  ];

  return (
    <section className="relative mb-16" aria-label="Continuity overview">
      <div className="max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-pink-400/20 bg-pink-400/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-pink-300/90">
          <ShieldCheck size={13} aria-hidden="true" />
          Continuity Institution
        </span>
        <h1 className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight text-white md:text-6xl">
          Ownership That Survives You
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
          Recovery systems, trusted contacts, inheritance planning, emergency protection, and
          long-term continuity infrastructure designed to preserve access across generations.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-2 gap-x-8 gap-y-10 border-t border-white/[0.06] pt-10 md:grid-cols-3 lg:grid-cols-5">
        {metrics.map((m) => (
          <div key={m.label}>
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{m.label}</p>
            <p className={`mt-2 text-2xl font-semibold tracking-tight ${TONE[m.tone]}`}>{m.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

