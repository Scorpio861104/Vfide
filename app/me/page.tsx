'use client';

export const dynamic = 'force-dynamic';

/**
 * /me — User hub.
 *
 * The "Me" tab in the top nav previously mapped 18 routes (vault,
 * governance, council, elections, disputes, proofscore, etc.) to a
 * single section but only ever landed users on /profile. That meant
 * 17 of those 18 routes had no discoverable way to reach them from
 * the nav — the user had to know the URLs.
 *
 * This page is the missing map. It groups the destinations by what
 * the user is actually trying to do:
 *
 *   - Identity & trust:   profile, proofscore, badges, achievements, leaderboard
 *   - Money:              vault, payouts, rewards, sanctum
 *   - Security:           guardians, security-center, settings, notifications
 *   - Governance:         governance, dao-hub, council, elections, disputes
 *   - Engagement:         quests
 *
 * Each card shows what's there in one line so a user can decide where
 * to go without clicking around. Live data (your ProofScore, your tier,
 * your vault status) appears at the top when connected — the page also
 * works as a snapshot, not just a directory.
 */

import { useAccount } from 'wagmi';
import Link from 'next/link';
import { m, LazyMotion, domAnimation } from 'framer-motion';
import {
  User,
  Shield,
  Vote,
  Award,
  Trophy,
  Target,
  Briefcase,
  Heart,
  Gift,
  Settings,
  Bell,
  Lock,
  // NAV-5: Users, Gavel and ScrollText removed — GOVERNANCE section now uses a single hub link
  Crown,
  Sparkles,
  ArrowRight,
  Wallet,
} from 'lucide-react';
import { VfideConnectButton } from '@/components/crypto/VfideConnectButton';

import { Footer } from '@/components/layout/Footer';
import { HubSection, type HubLink } from '@/components/navigation/HubGrid';
import { Numeric } from '@/components/ui/Numeric';
import { ProofScoreRing } from '@/components/ui/ProofScoreRing';
import { useProofScore } from '@/hooks/useProofScore';

// ── Section groupings ──────────────────────────────────────────────

const IDENTITY: HubLink[] = [
  { href: '/profile',      icon: User,       label: 'Profile',       description: 'Display name, avatar, bio. Public side of your identity.' },
  { href: '/proofscore',   icon: Sparkles,   label: 'ProofScore',    description: 'Your trust score, the fee curve, and how to improve.' },
  { href: '/badges',       icon: Award,      label: 'Badges',        description: 'On-chain achievements badges earned on-chain.' },
  { href: '/achievements', icon: Trophy,     label: 'Achievements',  description: 'Milestone tracker with completion progress.' },
  { href: '/leaderboard',  icon: Crown,      label: 'Leaderboard',   description: 'Top ProofScores, top merchants, top contributors.' },
];

const MONEY: HubLink[] = [
  { href: '/vault',             icon: Wallet,    label: 'Vault',          description: 'Your non-custodial vault — balance, queue, spend limits.' },
  { href: '/merchant/payouts',  icon: Briefcase, label: 'Earnings',       description: 'Confirmed revenue and cash-out, for merchants.' },
  { href: '/rewards',           icon: Gift,      label: 'Rewards',        description: 'Stablecoin service fee distributions for verified merchant and referral work.' },
  { href: '/sanctum',           icon: Heart,     label: 'Sanctum',        description: 'Charity allocations and grants funded by protocol fees.' },
];

const SECURITY: HubLink[] = [
  { href: '/guardians',                icon: Shield,   label: 'Guardians',       description: 'Trusted addresses that can help with vault recovery.' },
  { href: '/security-center',          icon: Lock,     label: 'Security center', description: 'Session activity, signing keys, device trust.' },
  { href: '/settings',                 icon: Settings, label: 'Settings',        description: 'Account preferences, notifications, privacy.' },
  // NAV-5: /notifications redirects to /settings?tab=notifications — link directly to the tab
  { href: '/settings?tab=notifications', icon: Bell,   label: 'Notifications',   description: 'Activity stream and notification preferences.' },
];

// NAV-5: Governance section — single hub link instead of listing old standalone routes
// (/dao-hub, /council, /elections, /disputes all redirect to /governance now)
const GOVERNANCE: HubLink[] = [
  {
    href: '/governance',
    icon: Vote,
    label: 'Governance Hub',
    description: 'Proposals, Council, Elections, DAO Hub, and Disputes \u2014 all in one place.',
  },
];

const ENGAGEMENT: HubLink[] = [
  { href: '/quests', icon: Target, label: 'Quests', description: 'Time-bound objectives that build ProofScore through verified on-chain activity.' },
];

// ── Page ────────────────────────────────────────────────────────────

export default function MeHubPage() {
  const { address, isConnected } = useAccount();
  const { score, tierName, burnFee, isLoading } = useProofScore();

  if (!isConnected) {
    return (
      <LazyMotion features={domAnimation}>
        <>
        <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] text-white relative">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
              style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
            <div className="absolute top-1/3 -right-32 w-[500px] h-[500px] rounded-full opacity-[0.05]"
              style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
          </div>
          <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" />
          <div className="relative container mx-auto max-w-3xl px-4 py-20 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-sm text-accent mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              Account Hub
            </div>
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
              <User size={28} className="text-accent" />
            </div>
            <h1 className="mb-3 text-4xl font-black text-white tracking-tight">Your VFIDE</h1>
            <p className="mb-8 max-w-md mx-auto text-gray-400 text-lg">
              Connect your wallet to see your ProofScore, your vault, your governance position, and the rest of your VFIDE account.
            </p>
            <div className="inline-block">
              <VfideConnectButton size="md" />
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] text-white relative">
        {/* Ambient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
          <div className="absolute top-1/3 -right-32 w-[500px] h-[500px] rounded-full opacity-[0.05]"
            style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full opacity-[0.04]"
            style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)' }} />
        </div>
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" />

        <div className="relative container mx-auto max-w-5xl px-4 pb-16">

          {/* Header: tier badge + name + ProofScore snapshot */}
          <m.header
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-10 flex flex-wrap items-end justify-between gap-6 pt-8"
          >
            <div>
              <div className="badge-live mb-3">
                <User size={12} /> Account Hub
              </div>
              <h1 className="text-4xl font-black sm:text-5xl tracking-tight">
                <span className="bg-gradient-to-r from-white to-accent-light bg-clip-text text-transparent">Your VFIDE</span>
              </h1>
              {address && (
                <div className="mt-2 font-mono text-sm text-gray-500">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </div>
              )}
            </div>

            {/* Live ProofScore snapshot */}
            <div className="flex items-center gap-4 glass-card-premium px-4 py-3">
              {isLoading ? (
                <div className="h-14 w-14 animate-pulse rounded-full bg-white/5" />
              ) : (
                <ProofScoreRing score={score ?? 0} size="md" />
              )}
              <div>
                <div className="text-[11px] uppercase tracking-widest text-gray-500">ProofScore</div>
                <div className="flex items-baseline gap-2">
                  {isLoading ? (
                    <span className="font-numeric text-2xl text-gray-600">—</span>
                  ) : (
                    <Numeric value={score ?? 0} format="score" size="2xl" weight={700} className="text-white" />
                  )}
                  {!isLoading && (
                    <span className="text-sm text-accent">{tierName}</span>
                  )}
                </div>
                <div className="mt-0.5 text-[11px] text-gray-500">
                  Fee:{' '}
                  {isLoading ? (
                    <span className="font-numeric text-gray-600">—</span>
                  ) : (
                    <Numeric
                      value={burnFee ?? 0}
                      format="percent"
                      size="xs"
                      weight={600}
                      tone="positive"
                    />
                  )}{' '}
                  on your next payment
                </div>
              </div>
            </div>
          </m.header>

          {/* Discoverable map of everything under "Me" */}
          <div className="space-y-10">
            <HubSection title="Identity & trust" links={IDENTITY} />
            <HubSection title="Money"             links={MONEY} />
            <HubSection title="Security"          links={SECURITY} />
            <HubSection title="Governance"        links={GOVERNANCE} />
            <HubSection title="Engagement"        links={ENGAGEMENT} />
          </div>

          {/* Quick "what to do next" suggestion based on score tier */}
          {!isLoading && (
            <div className="mt-12 glass-card-premium border-accent/20 bg-accent/5 p-5">
              <div className="mb-2 text-xs uppercase tracking-widest text-accent">Next step</div>
              <NextStep score={score ?? 0} />
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}

// ── Next-step suggester ────────────────────────────────────────────

function NextStep({ score }: { score: number }) {
  // Map the user's current tier to a single concrete action they can
  // take to advance. Keeps the hub from feeling like a passive directory.
  if (score < 5000) {
    return (
      <p className="text-gray-300">
        Build your trust score by completing a few payments and{' '}
        <Link href="/quests" className="text-accent hover:text-accent">
          taking on a quest <ArrowRight size={12} className="inline" />
        </Link>
        . Most new users cross into Neutral after their first 5\u201310 confirmed transactions.
      </p>
    );
  }
  if (score < 5400) {
    return (
      <p className="text-gray-300">
        Almost at Governance tier. A few more confirmed payments unlocks the ability to{' '}
        <Link href="/governance" className="text-accent hover:text-accent">
          vote on proposals <ArrowRight size={12} className="inline" />
        </Link>
        .
      </p>
    );
  }
  if (score < 5600) {
    return (
      <p className="text-gray-300">
        You can vote now — try{' '}
        <Link href="/governance" className="text-accent hover:text-accent">
          the active proposals <ArrowRight size={12} className="inline" />
        </Link>
        . At 5,600 you also unlock merchant registration.
      </p>
    );
  }
  if (score < 7000) {
    return (
      <p className="text-gray-300">
        You&apos;re a Trusted user. Consider{' '}
        <Link href="/merchant/setup" className="text-accent hover:text-accent">
          opening a store <ArrowRight size={12} className="inline" />
        </Link>{' '}
        or building a higher ProofScore through{' '}
        <Link href="/quests" className="text-accent hover:text-accent">
          quests <ArrowRight size={12} className="inline" />
        </Link>
        .
      </p>
    );
  }
  if (score < 8000) {
    return (
      <p className="text-gray-300">
        Council-eligible. If you&apos;re active in the community, watch{' '}
        {/* NAV-5: /elections now redirects to /governance?tab=elections */}
        <Link href="/governance?tab=elections" className="text-accent hover:text-accent">
          upcoming elections <ArrowRight size={12} className="inline" />
        </Link>{' '}
        for a chance to stand for council.
      </p>
    );
  }
  return (
    <p className="text-gray-300">
      Elite tier. You can{' '}
      <Link href="/profile" className="text-accent hover:text-accent">
        endorse other users <ArrowRight size={12} className="inline" />
      </Link>{' '}
      to help them build trust, and you&apos;re paying the minimum 0.25% fee on every payment.
    </p>
    </LazyMotion>
  );
}
