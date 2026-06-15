'use client';

/**
 * TrustInfrastructure — records-first Trust Bureau (Wave 33).
 *
 * Transforms trust from a score into infrastructure: a participant-OWNED record of actions,
 * commitments, and contributions. Leads with records, not numbers. Frames everything around
 * documented participation and opportunity expansion — never ranking, authority, or status.
 *
 * Microcopy avoids rank/level/elite/status/class/grade/approval/score-as-judgment. All record
 * entries and verification states derive from REAL state (useProofScore / useContinuityStatus /
 * useMerchantHealth) — an action shows on the record only if it actually happened.
 */

import Link from 'next/link';
import { useProofScore } from '@/hooks/useProofScore';
import { useContinuityStatus } from '@/hooks/useContinuityStatus';
import { useMerchantHealth } from '@/hooks/useMerchantHealth';
import { useMerchantVerification } from '@/hooks/useMerchantVerification';
import {
  Landmark, Store, ShieldCheck, Heart, Users, BadgeCheck,
  Vote, LifeBuoy, FileCheck, UserPlus, Lock, CheckCircle2, Circle, Clock,
  ArrowRight, ScrollText, TrendingDown, Network, Handshake, Compass, GraduationCap,
  type LucideIcon,
} from 'lucide-react';

// ─── Trust Hero (records-first) ──────────────────────────────────────────────

export function TrustInfrastructureHero() {
  return (
    <section className="relative mb-16" aria-label="Trust infrastructure overview">
      <div className="max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300/90">
          <ScrollText size={13} aria-hidden="true" />
          Trust Institution
        </span>
        <h1 className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight text-white md:text-6xl">
          Trust Infrastructure
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
          A participant-owned record of actions, commitments, and contributions that can help reduce
          friction across the VFIDE ecosystem.
        </p>
        <div className="mt-8 space-y-1.5 border-l-2 border-white/10 pl-5 text-sm text-zinc-400">
          <p>Trust belongs to the individual.</p>
          <p>VFIDE does not grant trust.</p>
          <p>VFIDE records activity chosen by the participant.</p>
        </div>
      </div>
    </section>
  );
}

// ─── Trust Record ────────────────────────────────────────────────────────────

interface RecordArea {
  label: string;
  icon: LucideIcon;
  value: string;
  active: boolean;
  href: string;
}

export function TrustRecord() {
  const ps = useProofScore();
  const c = useContinuityStatus();
  const m = useMerchantHealth();

  const areas: RecordArea[] = [
    {
      label: 'Governance Activity',
      icon: Landmark,
      value: ps.canVote ? 'Eligible to participate' : 'Not yet active',
      active: !!ps.canVote,
      href: '/governance',
    },
    {
      label: 'Merchant Activity',
      icon: Store,
      value: m.isMerchant ? (m.txCount > 0 ? `${m.txCount} payment${m.txCount === 1 ? '' : 's'}` : 'Activated') : 'Not yet active',
      active: m.isMerchant,
      href: '/merchant',
    },
    {
      label: 'Protection Activity',
      icon: ShieldCheck,
      value: c.recoveryConfigured ? 'Recovery configured' : c.guardianCount > 0 ? 'Contacts added' : 'Not yet configured',
      active: c.recoveryConfigured || c.guardianCount > 0,
      href: '/guardians',
    },
    {
      label: 'Continuity Activity',
      icon: Heart,
      value: c.inheritanceConfigured ? 'Continuity planned' : `${c.configuredCount} of 3 configured`,
      active: c.configuredCount > 0,
      href: '/continuity',
    },
    {
      label: 'Community Participation',
      icon: Users,
      value: 'Endorsements & contributions',
      active: false,
      href: '/endorsements',
    },
    {
      label: 'Verified Contributions',
      icon: BadgeCheck,
      value: ps.canMerchant || ps.canVote ? 'On record' : 'Building',
      active: !!(ps.canMerchant || ps.canVote),
      href: '/proofscore',
    },
  ];

  return (
    <section className="mb-16" aria-label="Trust record">
      <div className="mb-8 max-w-2xl">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">Trust Record</h2>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-white">Your history, kept by you</p>
        <p className="mt-3 text-zinc-400">
          A transparent history of actions and participation across the ecosystem.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.04] sm:grid-cols-2 lg:grid-cols-3">
        {areas.map((a) => {
          const Icon = a.icon;
          return (
            <Link key={a.label} href={a.href} className="group bg-zinc-950/40 p-6 transition-colors hover:bg-zinc-900/40">
              <div className="flex items-center justify-between">
                <Icon size={18} className="text-zinc-500" aria-hidden="true" />
                <span className={`text-[11px] font-medium ${a.active ? 'text-emerald-300' : 'text-zinc-500'}`}>
                  {a.active ? 'On record' : 'Open'}
                </span>
              </div>
              <h3 className="mt-4 font-semibold text-white">{a.label}</h3>
              <p className="mt-1 text-sm text-zinc-400">{a.value}</p>
            </Link>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-zinc-500">Record keeping — not a ranking. Each entry reflects an action you chose to take.</p>
    </section>
  );
}

// ─── Participation History (timeline) ────────────────────────────────────────

interface HistoryEntry {
  label: string;
  icon: LucideIcon;
  done: boolean;
  href: string;
}

export function ParticipationHistory() {
  const ps = useProofScore();
  const c = useContinuityStatus();
  const m = useMerchantHealth();

  const entries: HistoryEntry[] = [
    { label: 'Recovery Configured', icon: LifeBuoy, done: c.recoveryConfigured, href: '/vault/recover' },
    { label: 'Merchant Activated', icon: Store, done: m.isMerchant, href: '/merchant' },
    { label: 'Governance Vote Submitted', icon: Vote, done: !!ps.canVote, href: '/governance' },
    { label: 'Continuity Plan Established', icon: Heart, done: c.inheritanceConfigured, href: '/continuity' },
    { label: 'Business Profile Verified', icon: FileCheck, done: m.isMerchant, href: '/merchant/profile/setup' },
    { label: 'Trusted Contact Added', icon: UserPlus, done: c.guardianCount > 0, href: '/guardians' },
    { label: 'Protection Systems Enabled', icon: Lock, done: c.recoveryConfigured && c.guardianCount > 0, href: '/security-center' },
  ];

  return (
    <section className="mb-16" aria-label="Participation history">
      <div className="mb-8 max-w-2xl">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">Participation History</h2>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-white">Actions, not opinions</p>
        <p className="mt-3 text-zinc-400">The foundation of trust is what you have done — recorded as it happens.</p>
      </div>

      <ol className="relative space-y-1 border-l border-white/[0.08] pl-6">
        {entries.map((e) => {
          const Icon = e.icon;
          return (
            <li key={e.label} className="relative py-3">
              <span
                className={`absolute -left-[1.78rem] flex h-3.5 w-3.5 items-center justify-center rounded-full ring-4 ring-zinc-950 ${
                  e.done ? 'bg-emerald-400' : 'bg-zinc-700'
                }`}
                aria-hidden="true"
              />
              <Link href={e.href} className="group flex items-center justify-between gap-4">
                <span className="flex items-center gap-3">
                  <Icon size={16} className="text-zinc-500" aria-hidden="true" />
                  <span className={`font-medium ${e.done ? 'text-white' : 'text-zinc-400'}`}>{e.label}</span>
                </span>
                <span className={`shrink-0 text-xs font-medium ${e.done ? 'text-emerald-300' : 'text-zinc-500'}`}>
                  {e.done ? 'Recorded' : 'Not yet'}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// ─── Verification Systems ────────────────────────────────────────────────────

type VerifyState = 'verified' | 'pending' | 'configured' | 'not-configured';

const VERIFY_LABEL: Record<VerifyState, string> = {
  verified: 'Verified',
  pending: 'Pending',
  configured: 'Configured',
  'not-configured': 'Not configured',
};

const VERIFY_STYLE: Record<VerifyState, string> = {
  verified: 'text-emerald-300',
  pending: 'text-amber-300',
  configured: 'text-cyan-300',
  'not-configured': 'text-zinc-500',
};

function VerifyIcon({ state }: { state: VerifyState }) {
  if (state === 'verified') return <CheckCircle2 size={15} className="text-emerald-400" aria-hidden="true" />;
  if (state === 'pending') return <Clock size={15} className="text-amber-400" aria-hidden="true" />;
  if (state === 'configured') return <CheckCircle2 size={15} className="text-cyan-400" aria-hidden="true" />;
  return <Circle size={15} className="text-zinc-600" aria-hidden="true" />;
}

export function VerificationSystems() {
  const c = useContinuityStatus();
  const m = useMerchantHealth();
  const mv = useMerchantVerification();

  // Real merchant verification (Wave 49-B): verified only when actually earned; registered-but-not-
  // yet-verified shows as pending; not a merchant shows not-configured. No longer "verified == registered".
  const merchantVerifyState: VerifyState = mv.verified
    ? 'verified'
    : m.isMerchant
      ? 'pending'
      : 'not-configured';

  const systems: { label: string; state: VerifyState }[] = [
    { label: 'Identity Verification', state: 'not-configured' },
    { label: 'Merchant Verification', state: merchantVerifyState },
    { label: 'Contact Verification', state: c.guardianCount > 0 ? 'configured' : 'not-configured' },
    { label: 'Recovery Verification', state: c.recoveryConfigured ? 'configured' : 'not-configured' },
    { label: 'Operational Verification', state: mv.verified && !m.isSuspended ? 'verified' : 'not-configured' },
  ];

  return (
    <section className="mb-16" aria-label="Verification systems">
      <div className="mb-8 max-w-2xl">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">Verification Systems</h2>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-white">What has been verified</p>
        <p className="mt-3 text-zinc-400">Clear, factual states — what is confirmed, configured, or still open.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/[0.06]">
        {systems.map((s, i) => (
          <div
            key={s.label}
            className={`flex items-center justify-between px-6 py-4 ${i < systems.length - 1 ? 'border-b border-white/[0.05]' : ''}`}
          >
            <span className="font-medium text-zinc-200">{s.label}</span>
            <span className={`inline-flex items-center gap-2 text-sm font-medium ${VERIFY_STYLE[s.state]}`}>
              <VerifyIcon state={s.state} />
              {VERIFY_LABEL[s.state]}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Opportunity Access ──────────────────────────────────────────────────────

interface Opportunity {
  label: string;
  description: string;
  icon: LucideIcon;
  href: string;
}

const OPPORTUNITIES: Opportunity[] = [
  { label: 'Reduced Commerce Friction', description: 'A stronger record lowers the friction on what you pay and process.', icon: TrendingDown, href: '/merchant' },
  { label: 'Merchant Benefits', description: 'Unlock the merchant infrastructure as your record grows.', icon: Store, href: '/merchant' },
  { label: 'Governance Participation', description: 'Take part in decisions about the network.', icon: Landmark, href: '/governance' },
  { label: 'Partner Opportunities', description: 'Access opportunities offered across the ecosystem.', icon: Handshake, href: '/headhunter' },
  { label: 'Network Access', description: 'Connect into more of what the network offers.', icon: Network, href: '/dashboard' },
  { label: 'Community Programs', description: 'Participate in programs built for contributors.', icon: Compass, href: '/endorsements' },
];

export function OpportunityAccess() {
  return (
    <section className="mb-16" aria-label="Opportunity access">
      <div className="mb-8 max-w-2xl">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">Opportunity Access</h2>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-white">Trust expands what you can do</p>
        <p className="mt-3 text-zinc-400">
          A trust record opens doors — it never approves or ranks you. More participation, more
          opportunity.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {OPPORTUNITIES.map((o) => {
          const Icon = o.icon;
          return (
            <Link
              key={o.label}
              href={o.href}
              className="group flex flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-colors hover:bg-white/[0.04]"
            >
              <Icon size={20} className="text-cyan-300/80" aria-hidden="true" />
              <h3 className="mt-4 font-semibold text-white">{o.label}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-400">{o.description}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors group-hover:text-zinc-300">
                Explore <ArrowRight size={12} aria-hidden="true" />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ─── Trust Explainer ─────────────────────────────────────────────────────────

export function TrustExplainer() {
  const points = [
    'Trust is built through actions.',
    'The record belongs to the participant.',
    'The purpose is transparency and reduced friction.',
    'No authority determines worth.',
    'No institution determines identity.',
    'Trust is simply documented participation.',
  ];

  return (
    <section className="mb-16" aria-label="How trust works">
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 md:p-10">
        <div className="flex items-center gap-3">
          <GraduationCap size={20} className="text-cyan-300/80" aria-hidden="true" />
          <h2 className="text-2xl font-semibold tracking-tight text-white">How Trust Works</h2>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-2">
          {points.map((p) => (
            <p key={p} className="flex items-start gap-3 leading-relaxed text-zinc-300">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400/70" aria-hidden="true" />
              {p}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
