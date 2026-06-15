'use client';

/**
 * Headquarters Environment (Platform Transformation, Wave 2).
 *
 * The shared environment behind each of the five headquarters. It opens with the headquarters' question, shows a
 * REAL status reading for the participant (wired to the existing subsystem hooks — ProofScore, continuity readiness,
 * merchant health), then lays out that domain's capabilities adaptive-ordered with honest availability. Sculpted
 * depth and the domain's jewel tone, not a widget wall.
 *
 * Honesty (Veritas Law): the status reading reflects real on-chain/read-model state where it exists, and says so
 * plainly where a participant has not connected or set something up. Availability is Ready / In progress / Coming.
 * Governance has no single composite metric, so it states what participation means rather than inventing a number.
 */
import { useMemo } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { useProofScore } from '@/hooks/useProofScore';
import { useContinuityStatus } from '@/hooks/useContinuityStatus';
import { useMerchantHealth } from '@/hooks/useMerchantHealth';
import { HQRoot, Surface, DomainBadge, StatusDot } from '@/components/headquarters/HQTheme';
import { PrimaryNav } from '@/components/headquarters/PrimaryNav';
import { SeerPanel } from '@/components/headquarters/SeerPanel';
import { HeadquartersAcademy } from '@/components/headquarters/HeadquartersAcademy';
import { PlaybooksPanel } from '@/components/headquarters/PlaybooksPanel';
import { HEADQUARTERS, type DomainId } from '@/lib/headquarters/model';
import { emphasisForDomain, NEUTRAL_SIGNALS, type Emphasis } from '@/lib/headquarters/adaptive';
import { DOMAIN_COLOR } from '@/lib/design/hqTokens';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';

type Tone = 'good' | 'partial' | 'neutral';
interface Reading { headline: string; detail: string; tone: Tone }

const EMPHASIS_GROUP: { key: Emphasis; label: string }[] = [
  { key: 'primary', label: 'Start here' },
  { key: 'suggested', label: 'Worth a look' },
  { key: 'available', label: 'Everything else' },
];

export function HeadquartersEnvironment({ domain }: { domain: DomainId }) {
  const { isConnected } = useAccount();
  const { score } = useProofScore();
  const continuity = useContinuityStatus();
  const merchant = useMerchantHealth();

  const hq = HEADQUARTERS[domain];
  const c = DOMAIN_COLOR[domain];
  const emphasis = useMemo(() => emphasisForDomain(NEUTRAL_SIGNALS, domain), [domain]);
  const reading = domainReading(domain, { isConnected, score, readiness: continuity.readiness, merchantLabel: merchant.healthLabel });

  const toneColor = reading.tone === 'good' ? '#5FA17F' : reading.tone === 'partial' ? '#CF9356' : 'var(--hq-ink-soft)';

  return (
    <HQRoot>
      <div className="mx-auto max-w-5xl px-6 py-10">
        <PrimaryNav />

        <Link href="/command-center" className="mt-8 inline-flex items-center gap-2 text-xs transition-colors hover:underline" style={{ color: 'var(--hq-ink-faint)' }}>
          <ArrowLeft size={13} /> Command Center
        </Link>

        {/* Headquarters header + real reading */}
        <div className="mt-4">
          <DomainBadge domain={domain}>{hq.label} Headquarters</DomainBadge>
          <h1 className="mt-3 text-3xl font-semibold leading-tight md:text-4xl" style={{ color: 'var(--hq-ink)' }}>
            {hq.question}
          </h1>
        </div>

        <Surface tone={domain} className="mt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-lg font-medium" style={{ color: toneColor }}>{reading.headline}</p>
              <p className="mt-1.5 max-w-lg text-sm leading-relaxed" style={{ color: 'var(--hq-ink-soft)' }}>{reading.detail}</p>
            </div>
            <Link href={hq.homeHref} className="shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
              style={{ background: c.wash, color: c.soft, border: `1px solid var(--hq-edge)` }}>
              Open {hq.label}
            </Link>
          </div>
        </Surface>

        {/* Capabilities, adaptive-ordered, grouped by emphasis */}
        <section className="mt-10 space-y-8">
          {EMPHASIS_GROUP.map((group) => {
            const items = emphasis.filter((e) => e.emphasis === group.key);
            if (items.length === 0) return null;
            return (
              <div key={group.key}>
                <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--hq-ink-faint)' }}>{group.label}</h2>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {items.map((e) => (
                    <Link key={e.capability.id} href={e.capability.href}
                      className="group flex items-start justify-between rounded-xl px-4 py-3 transition-colors"
                      style={{ background: 'var(--hq-graphite)', border: '1px solid var(--hq-edge)' }}>
                      <div>
                        <p className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--hq-ink)' }}>
                          <StatusDot status={e.capability.status} />
                          {e.capability.label}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--hq-ink-faint)' }}>{e.capability.summary}</p>
                      </div>
                      <ArrowUpRight size={15} className="mt-0.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" style={{ color: c.accent }} />
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        {/* Journeys — step-by-step playbooks for this domain */}
        <section className="mt-10">
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--hq-ink-faint)' }}>Step-by-step journeys</h2>
          <div className="mt-3">
            <PlaybooksPanel domain={domain} />
          </div>
        </section>

        {/* The Seer — live deterministic observations for this domain */}
        <div className="mt-10">
          <SeerPanel domain={domain} />
        </div>

        {/* Academy — learning embedded where it is relevant */}
        <section className="mt-10">
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--hq-ink-faint)' }}>Learn as you go</h2>
          <div className="mt-3">
            <HeadquartersAcademy domain={domain} />
          </div>
        </section>
      </div>
    </HQRoot>
  );
}


function domainReading(
  domain: DomainId,
  s: { isConnected: boolean; score: number | null; readiness: string; merchantLabel: string },
): Reading {
  if (!s.isConnected) {
    return { headline: 'Connect to see your status', detail: `Your ${HEADQUARTERS[domain].label.toLowerCase()} status appears here once your wallet is connected.`, tone: 'neutral' };
  }
  switch (domain) {
    case 'ownership':
    case 'preparedness': {
      if (s.readiness === 'protected') return { headline: domain === 'ownership' ? 'You are protected' : 'You are well prepared', detail: 'Your vault, recovery, and inheritance are set up and active.', tone: 'good' };
      if (s.readiness === 'partial') return { headline: 'Partly set up', detail: 'A few protections are still open — closing them takes a few minutes.', tone: 'partial' };
      if (s.readiness === 'incomplete') return { headline: 'Needs setup', detail: 'Start with your vault and naming a guardian.', tone: 'partial' };
      return { headline: 'Getting started', detail: 'Set up your vault to begin building protection.', tone: 'neutral' };
    }
    case 'trust': {
      if (s.score === null) return { headline: 'Build your trust', detail: 'Your ProofScore grows from real outcomes — completed payments, fulfilled orders, honored agreements.', tone: 'neutral' };
      const band = s.score >= 8000 ? 'good' : s.score >= 4000 ? 'partial' : 'neutral';
      const note = s.score >= 8000 ? 'Strong standing — you earn the lowest fees.' : s.score >= 4000 ? 'A solid record that keeps improving with each good outcome.' : 'Early days — every completed, honored transaction builds this.';
      return { headline: `ProofScore ${s.score.toLocaleString()}`, detail: note, tone: band };
    }
    case 'business':
      return { headline: s.merchantLabel || 'Your business', detail: 'A live read of your sales, fulfillment, and standing across the network.', tone: 'neutral' };
    case 'governance':
      return { headline: 'Your voice in the ecosystem', detail: 'Vote on proposals, choose stewards, and follow exactly where ecosystem funds go.', tone: 'neutral' };
  }
}
