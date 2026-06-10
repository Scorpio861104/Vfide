'use client';

/**
 * TrustBureauArchitecture — placeholder institutional structure for the future Trust Bureau wave.
 *
 * Per Wave 31: do NOT fully redesign the Trust Bureau yet — prepare the architecture. This lays out
 * the five institutional sections the full Bureau will be organized around, framed correctly:
 * trust is participant-OWNED history that reduces friction and expands opportunity — never a ranking
 * of people. These are forward-looking section shells, clearly marked as in-development.
 */

import { FileText, History, BadgeCheck, Network, KeyRound } from 'lucide-react';

interface BureauSection {
  id: string;
  title: string;
  description: string;
  icon: typeof FileText;
}

const SECTIONS: BureauSection[] = [
  {
    id: 'trust-record',
    title: 'Trust Record',
    description: 'A record you own of the trust you have earned — portable, yours to carry, never assigned to you by anyone.',
    icon: FileText,
  },
  {
    id: 'participation-history',
    title: 'Participation History',
    description: 'The honest dealing behind your standing: payments completed, credit repaid, peers vouched for — the evidence, kept by you.',
    icon: History,
  },
  {
    id: 'verification-systems',
    title: 'Verification Systems',
    description: 'Ways to confirm what you choose to confirm — identity, endorsements, credentials — on your terms, to open more doors.',
    icon: BadgeCheck,
  },
  {
    id: 'reputation-infrastructure',
    title: 'Reputation Infrastructure',
    description: 'The shared rails that let your record travel across commerce, governance, and opportunity — reducing friction wherever you go.',
    icon: Network,
  },
  {
    id: 'opportunity-access',
    title: 'Opportunity Access',
    description: 'What a stronger record unlocks: lower fees, more capability, wider participation. Trust expands what you can do.',
    icon: KeyRound,
  },
];

export function TrustBureauArchitecture() {
  return (
    <section className="mt-16" aria-label="Trust Bureau architecture">
      <div className="mb-8 max-w-2xl">
        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
          In development
        </span>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">Trust Bureau architecture</h2>
        <p className="mt-3 leading-relaxed text-zinc-400">
          The Bureau is being built around five institutions. Trust here is participant-owned history
          that reduces friction and expands opportunity — it is never a ranking of people.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.id}
              className="flex flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6"
            >
              <Icon size={20} className="text-cyan-300/80" aria-hidden="true" />
              <h3 className="mt-4 font-semibold text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{s.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}'use client';

/**
 * TrustBureauArchitecture — placeholder institutional structure for the future Trust Bureau wave.
 *
 * Per Wave 31: do NOT fully redesign the Trust Bureau yet — prepare the architecture. This lays out
 * the five institutional sections the full Bureau will be organized around, framed correctly:
 * trust is participant-OWNED history that reduces friction and expands opportunity — never a ranking
 * of people. These are forward-looking section shells, clearly marked as in-development.
 */

import { FileText, History, BadgeCheck, Network, KeyRound } from 'lucide-react';

interface BureauSection {
  id: string;
  title: string;
  description: string;
  icon: typeof FileText;
}

const SECTIONS: BureauSection[] = [
  {
    id: 'trust-record',
    title: 'Trust Record',
    description: 'A record you own of the trust you have earned — portable, yours to carry, never assigned to you by anyone.',
    icon: FileText,
  },
  {
    id: 'participation-history',
    title: 'Participation History',
    description: 'The honest dealing behind your standing: payments completed, credit repaid, peers vouched for — the evidence, kept by you.',
    icon: History,
  },
  {
    id: 'verification-systems',
    title: 'Verification Systems',
    description: 'Ways to confirm what you choose to confirm — identity, endorsements, credentials — on your terms, to open more doors.',
    icon: BadgeCheck,
  },
  {
    id: 'reputation-infrastructure',
    title: 'Reputation Infrastructure',
    description: 'The shared rails that let your record travel across commerce, governance, and opportunity — reducing friction wherever you go.',
    icon: Network,
  },
  {
    id: 'opportunity-access',
    title: 'Opportunity Access',
    description: 'What a stronger record unlocks: lower fees, more capability, wider participation. Trust expands what you can do.',
    icon: KeyRound,
  },
];

export function TrustBureauArchitecture() {
  return (
    <section className="mt-16" aria-label="Trust Bureau architecture">
      <div className="mb-8 max-w-2xl">
        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
          In development
        </span>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">Trust Bureau architecture</h2>
        <p className="mt-3 leading-relaxed text-zinc-400">
          The Bureau is being built around five institutions. Trust here is participant-owned history
          that reduces friction and expands opportunity — it is never a ranking of people.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.id}
              className="flex flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6"
            >
              <Icon size={20} className="text-cyan-300/80" aria-hidden="true" />
              <h3 className="mt-4 font-semibold text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{s.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
