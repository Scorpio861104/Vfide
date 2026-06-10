'use client';

/**
 * ContinuityStatusGrid — the central command view.
 *
 * Five operational modules, each showing three status lines derived from REAL continuity state.
 * Reuses the existing useContinuityStatus read-model; no fabricated values. Institutional
 * presentation: calm surfaces, generous spacing, status conveyed by a single accent per module.
 */

import type { ContinuityStatus, SectionState } from '@/hooks/useContinuityStatus';
import Link from 'next/link';
import { Lock, LifeBuoy, Users, ScrollText, Vault, ArrowRight } from 'lucide-react';

type Line = { label: string; value: string };

interface Module {
  id: string;
  title: string;
  icon: typeof Lock;
  state: SectionState;
  lines: Line[];
  href: string;
}

const ACCENT: Record<SectionState, { dot: string; ring: string; text: string }> = {
  ok: { dot: 'bg-emerald-400', ring: 'border-emerald-400/20', text: 'text-emerald-300' },
  active: { dot: 'bg-cyan-400', ring: 'border-cyan-400/20', text: 'text-cyan-300' },
  partial: { dot: 'bg-amber-400', ring: 'border-amber-400/20', text: 'text-amber-300' },
  missing: { dot: 'bg-zinc-600', ring: 'border-white/10', text: 'text-zinc-400' },
  info: { dot: 'bg-zinc-500', ring: 'border-white/10', text: 'text-zinc-300' },
};

const STATE_WORD: Record<SectionState, string> = {
  ok: 'Configured',
  active: 'Active',
  partial: 'Partial',
  missing: 'Not set',
  info: 'Info',
};

function st(c: ContinuityStatus, id: string): SectionState {
  return c.sections.find((s) => s.id === id)?.state ?? 'missing';
}

export function ContinuityStatusGrid({ c }: { c: ContinuityStatus }) {
  const guardianState = st(c, 'guardians');
  const recoveryState = st(c, 'recovery');
  const inheritanceState = st(c, 'inheritance');
  const securityState = st(c, 'security');

  const modules: Module[] = [
    {
      id: 'guardian-lock',
      title: 'Guardian Lock',
      icon: Lock,
      state: securityState,
      href: '/security-center',
      lines: [
        { label: 'Active status', value: securityState === 'active' ? 'Engaged' : securityState === 'ok' ? 'Ready' : 'Standby' },
        { label: 'Configuration', value: STATE_WORD[securityState] },
        { label: 'Emergency readiness', value: securityState === 'ok' || securityState === 'active' ? 'Available' : 'Set up needed' },
      ],
    },
    {
      id: 'recovery',
      title: 'Recovery Infrastructure',
      icon: LifeBuoy,
      state: recoveryState,
      href: '/vault/recover',
      lines: [
        { label: 'Recovery method', value: c.recoveryConfigured ? 'Guardian-based' : 'Not configured' },
        { label: 'Completeness', value: c.recoveryConfigured ? 'Complete' : c.recoveryPending ? 'In progress' : 'Incomplete' },
        { label: 'Confidence', value: c.recoveryConfigured ? 'High' : c.guardianCount > 0 ? 'Building' : 'Low' },
      ],
    },
    {
      id: 'contacts',
      title: 'Trusted Contacts',
      icon: Users,
      state: guardianState,
      href: '/guardians',
      lines: [
        { label: 'Configured contacts', value: `${c.guardianCount}` },
        { label: 'Verification', value: guardianState === 'ok' ? 'Verified' : c.guardianCount > 0 ? 'Pending' : 'None' },
        { label: 'Coverage strength', value: guardianState === 'ok' ? 'Strong' : c.guardianCount > 0 ? 'Partial' : 'None' },
      ],
    },
    {
      id: 'inheritance',
      title: 'Inheritance Preparation',
      icon: ScrollText,
      state: inheritanceState,
      href: '/inheritance',
      lines: [
        { label: 'Successor config', value: c.inheritanceConfigured ? 'Configured' : 'Not set' },
        { label: 'Transfer readiness', value: c.inheritanceConfigured ? 'Ready' : 'Pending setup' },
        { label: 'Documentation', value: c.inheritanceConfigured ? 'Recorded' : 'Incomplete' },
      ],
    },
    {
      id: 'vault',
      title: 'Vault Protection',
      icon: Vault,
      state: c.configuredCount === 3 ? 'ok' : c.configuredCount > 0 ? 'partial' : 'missing',
      href: '/vault',
      lines: [
        { label: 'Protected assets', value: c.recoveryConfigured ? 'Secured' : 'At risk' },
        { label: 'Vault coverage', value: `${c.configuredCount} of 3 layers` },
        { label: 'Continuity readiness', value: c.configuredCount === 3 ? 'Full' : c.configuredCount > 0 ? 'Partial' : 'Minimal' },
      ],
    },
  ];

  return (
    <section className="mb-16" aria-label="Continuity status">
      <div className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">Continuity Status</h2>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-white">Command view</p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => {
          const a = ACCENT[m.state];
          const Icon = m.icon;
          return (
            <Link
              key={m.id}
              href={m.href}
              className={`group relative flex flex-col rounded-2xl border ${a.ring} bg-white/[0.02] p-6 transition-colors hover:bg-white/[0.04]`}
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon size={18} className="text-zinc-400" aria-hidden="true" />
                  <h3 className="font-semibold text-white">{m.title}</h3>
                </div>
                <span className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${a.dot}`} aria-hidden="true" />
                  <span className={`text-[11px] font-medium ${a.text}`}>{STATE_WORD[m.state]}</span>
                </span>
              </div>
              <dl className="space-y-3">
                {m.lines.map((l) => (
                  <div key={l.label} className="flex items-baseline justify-between gap-4">
                    <dt className="text-xs text-zinc-500">{l.label}</dt>
                    <dd className="text-sm font-medium text-zinc-200">{l.value}</dd>
                  </div>
                ))}
              </dl>
              <span className="mt-5 inline-flex items-center gap-1 text-xs font-medium text-zinc-500 transition-colors group-hover:text-zinc-300">
                Manage <ArrowRight size={12} aria-hidden="true" />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}'use client';

/**
 * ContinuityStatusGrid — the central command view.
 *
 * Five operational modules, each showing three status lines derived from REAL continuity state.
 * Reuses the existing useContinuityStatus read-model; no fabricated values. Institutional
 * presentation: calm surfaces, generous spacing, status conveyed by a single accent per module.
 */

import type { ContinuityStatus, SectionState } from '@/hooks/useContinuityStatus';
import Link from 'next/link';
import { Lock, LifeBuoy, Users, ScrollText, Vault, ArrowRight } from 'lucide-react';

type Line = { label: string; value: string };

interface Module {
  id: string;
  title: string;
  icon: typeof Lock;
  state: SectionState;
  lines: Line[];
  href: string;
}

const ACCENT: Record<SectionState, { dot: string; ring: string; text: string }> = {
  ok: { dot: 'bg-emerald-400', ring: 'border-emerald-400/20', text: 'text-emerald-300' },
  active: { dot: 'bg-cyan-400', ring: 'border-cyan-400/20', text: 'text-cyan-300' },
  partial: { dot: 'bg-amber-400', ring: 'border-amber-400/20', text: 'text-amber-300' },
  missing: { dot: 'bg-zinc-600', ring: 'border-white/10', text: 'text-zinc-400' },
  info: { dot: 'bg-zinc-500', ring: 'border-white/10', text: 'text-zinc-300' },
};

const STATE_WORD: Record<SectionState, string> = {
  ok: 'Configured',
  active: 'Active',
  partial: 'Partial',
  missing: 'Not set',
  info: 'Info',
};

function st(c: ContinuityStatus, id: string): SectionState {
  return c.sections.find((s) => s.id === id)?.state ?? 'missing';
}

export function ContinuityStatusGrid({ c }: { c: ContinuityStatus }) {
  const guardianState = st(c, 'guardians');
  const recoveryState = st(c, 'recovery');
  const inheritanceState = st(c, 'inheritance');
  const securityState = st(c, 'security');

  const modules: Module[] = [
    {
      id: 'guardian-lock',
      title: 'Guardian Lock',
      icon: Lock,
      state: securityState,
      href: '/security-center',
      lines: [
        { label: 'Active status', value: securityState === 'active' ? 'Engaged' : securityState === 'ok' ? 'Ready' : 'Standby' },
        { label: 'Configuration', value: STATE_WORD[securityState] },
        { label: 'Emergency readiness', value: securityState === 'ok' || securityState === 'active' ? 'Available' : 'Set up needed' },
      ],
    },
    {
      id: 'recovery',
      title: 'Recovery Infrastructure',
      icon: LifeBuoy,
      state: recoveryState,
      href: '/vault/recover',
      lines: [
        { label: 'Recovery method', value: c.recoveryConfigured ? 'Guardian-based' : 'Not configured' },
        { label: 'Completeness', value: c.recoveryConfigured ? 'Complete' : c.recoveryPending ? 'In progress' : 'Incomplete' },
        { label: 'Confidence', value: c.recoveryConfigured ? 'High' : c.guardianCount > 0 ? 'Building' : 'Low' },
      ],
    },
    {
      id: 'contacts',
      title: 'Trusted Contacts',
      icon: Users,
      state: guardianState,
      href: '/guardians',
      lines: [
        { label: 'Configured contacts', value: `${c.guardianCount}` },
        { label: 'Verification', value: guardianState === 'ok' ? 'Verified' : c.guardianCount > 0 ? 'Pending' : 'None' },
        { label: 'Coverage strength', value: guardianState === 'ok' ? 'Strong' : c.guardianCount > 0 ? 'Partial' : 'None' },
      ],
    },
    {
      id: 'inheritance',
      title: 'Inheritance Preparation',
      icon: ScrollText,
      state: inheritanceState,
      href: '/inheritance',
      lines: [
        { label: 'Successor config', value: c.inheritanceConfigured ? 'Configured' : 'Not set' },
        { label: 'Transfer readiness', value: c.inheritanceConfigured ? 'Ready' : 'Pending setup' },
        { label: 'Documentation', value: c.inheritanceConfigured ? 'Recorded' : 'Incomplete' },
      ],
    },
    {
      id: 'vault',
      title: 'Vault Protection',
      icon: Vault,
      state: c.configuredCount === 3 ? 'ok' : c.configuredCount > 0 ? 'partial' : 'missing',
      href: '/vault',
      lines: [
        { label: 'Protected assets', value: c.recoveryConfigured ? 'Secured' : 'At risk' },
        { label: 'Vault coverage', value: `${c.configuredCount} of 3 layers` },
        { label: 'Continuity readiness', value: c.configuredCount === 3 ? 'Full' : c.configuredCount > 0 ? 'Partial' : 'Minimal' },
      ],
    },
  ];

  return (
    <section className="mb-16" aria-label="Continuity status">
      <div className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">Continuity Status</h2>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-white">Command view</p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => {
          const a = ACCENT[m.state];
          const Icon = m.icon;
          return (
            <Link
              key={m.id}
              href={m.href}
              className={`group relative flex flex-col rounded-2xl border ${a.ring} bg-white/[0.02] p-6 transition-colors hover:bg-white/[0.04]`}
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon size={18} className="text-zinc-400" aria-hidden="true" />
                  <h3 className="font-semibold text-white">{m.title}</h3>
                </div>
                <span className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${a.dot}`} aria-hidden="true" />
                  <span className={`text-[11px] font-medium ${a.text}`}>{STATE_WORD[m.state]}</span>
                </span>
              </div>
              <dl className="space-y-3">
                {m.lines.map((l) => (
                  <div key={l.label} className="flex items-baseline justify-between gap-4">
                    <dt className="text-xs text-zinc-500">{l.label}</dt>
                    <dd className="text-sm font-medium text-zinc-200">{l.value}</dd>
                  </div>
                ))}
              </dl>
              <span className="mt-5 inline-flex items-center gap-1 text-xs font-medium text-zinc-500 transition-colors group-hover:text-zinc-300">
                Manage <ArrowRight size={12} aria-hidden="true" />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
