'use client';

/**
 * /roadmap — What's coming to VFIDE
 *
 * Phase assignments are derived from the canonical deploy-full.ts and
 * contracts/PRODUCTION_SET.md. Do not change phase labels without
 * updating both files.
 *
 * v1  (mainnet launch)   — contracts already in deploy-full.ts
 * v1.1 (post-testnet)   — built but deferred for surface-area discipline
 * v2  (governance)      — designed but not deployed; external-provider-gated
 *                         or user-vault-multi-sig (architectural design review needed)
 */

import { m } from 'framer-motion';
import { Clock, CheckCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Footer } from '@/components/layout/Footer';

interface RoadmapFeature {
  emoji: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  bullets: string[];
  cta: { label: string; href: string };
  phase: 'v1' | 'v1.1' | 'v2';
  contract?: string; // on-chain contract name, for transparency
}

const FEATURES: RoadmapFeature[] = [
  // ── V1: ships at mainnet launch ────────────────────────────────────────────
  {
    emoji: '🔄',
    slug: 'subscriptions',
    title: 'Recurring Subscriptions',
    tagline: 'Set-and-forget billing that the user can cancel any time.',
    description:
      'SubscriptionManager ships at mainnet launch as a Phase 1 contract. It uses the same pull-permit model as MerchantPortal — a user approves once, the merchant (or any keeper) triggers the pull within agreed limits. No custodian, no renewal surprises.',
    bullets: [
      'Customer approves once — merchant pulls on schedule within agreed limits',
      'Cancel at any time; no admin, no support ticket',
      'Grace period for failed payments before automatic suspension',
    ],
    cta: { label: 'Merchant subscriptions', href: '/merchant/subscriptions' },
    phase: 'v1',
    contract: 'SubscriptionManager.sol',
  },
  {
    emoji: '⚡',
    slug: 'flash-loans',
    title: 'Flash Loans',
    tagline: 'Zero-collateral liquidity for arbitrage, liquidations, and protocol operations.',
    description:
      'VFIDEFlashLoan ships at launch. Flash loans are single-transaction borrows: borrow, use, repay — all within one block. If the repayment fails, the entire transaction reverts. No risk to the protocol, no exposure window.',
    bullets: [
      'Borrow any amount from protocol liquidity within a single transaction',
      'Repay principal + fee before block closes — or the tx reverts',
      'Fee revenue flows to the Sanctum Fund and fee distributor',
    ],
    cta: { label: 'View vault', href: '/vault' },
    phase: 'v1',
    contract: 'VFIDEFlashLoan.sol',
  },
  // ── V1.1: built, deferred for surface-area discipline ────────────────────
  {
    emoji: '💧',
    slug: 'streaming',
    title: 'Payment Streaming',
    tagline: 'Continuous per-second VFIDE flows for payroll and creator payouts.',
    description:
      'Payment streaming is designed for payroll, subscriptions, and creator monetisation. It ships after the core payment layer is stable on mainnet.',
    bullets: [
      'Real-time per-second payment streams',
      'Time-locked payroll streams for verified council contributors',
      'Cancel or top-up a stream at any time',
    ],
    cta: { label: 'See Payroll instead', href: '/payroll' },
    phase: 'v1.1',
  },
  {
    emoji: '⏳',
    slug: 'time-locks',
    title: 'Scheduled Transfers',
    tagline: 'Queue a payment now, execute it at a future timestamp.',
    description:
      'Time-locks are live in the vault safety window for pending transfers. A full scheduled-transfer UI — for payroll, recurring grants, and timed releases — ships in V1.1.',
    bullets: [
      'Schedule a transfer to execute at a future block timestamp',
      '24-hour safety window: cancel any queued transfer before execution',
      'Recurring payment schedules for payroll and subscriptions',
    ],
    cta: { label: 'View pending vault changes', href: '/vault/pending-changes' },
    phase: 'v1.1',
  },
  {
    emoji: '📊',
    slug: 'reporting',
    title: 'Reporting & Analytics',
    tagline: 'Your full financial picture across all VFIDE activity.',
    description:
      'Merchants can access live revenue data from their dashboard today. Full cross-account reporting, tax-ready CSV exports, and cohort analysis are the V1.1 milestone.',
    bullets: [
      'Revenue, volume, and fee breakdown by period',
      'Tax-ready CSV exports for any jurisdiction',
      'Customer lifetime value and cohort analysis',
    ],
    cta: { label: 'Merchant analytics (available now)', href: '/merchant/analytics' },
    phase: 'v1.1',
  },
  {
    emoji: '🤖',
    slug: 'agent',
    title: 'VFIDE Agent',
    tagline: 'Automate routine vault operations with on-chain triggers.',
    description:
      'The VFIDE Agent handles routine tasks — sweeping dust, topping up Guardian pools, alerting on unusual activity — using on-chain triggers wired to your ProofScore profile.',
    bullets: [
      'Auto-sweep dust balances on a schedule',
      'Top up your Guardian pool when it drops below threshold',
      'Alert on unusual vault activity via on-chain event monitoring',
    ],
    cta: { label: 'Back to Dashboard', href: '/dashboard' },
    phase: 'v1.1',
  },
  // ── V2: governance / external-provider-gated ─────────────────────────────
  {
    emoji: '🔐',
    slug: 'multisig',
    title: 'Multi-Signature Vaults',
    tagline: 'Require multiple wallet signatures before funds move from a shared vault.',
    description:
      'User-facing vault multi-sig — M-of-N approval for shared treasuries and business accounts — is scheduled for the governance release. Guardian-assisted recovery provides a strong social recovery alternative today.',
    bullets: [
      'Require M-of-N signatures before any vault transfer executes',
      'Business treasury controls with designated co-signatories',
      'Time-locked execution with Guardian override path for recovery',
    ],
    cta: { label: 'Try Guardian Recovery instead', href: '/guardians' },
    phase: 'v2',
  },
  {
    emoji: '🏦',
    slug: 'term-lending',
    title: 'Term Lending',
    tagline: 'Collateral-backed loans with ProofScore-gated credit limits.',
    description:
      'Protocol-native term loans against VFIDE vault collateral are scheduled for V2. The ProofScore-gated credit limit is the key differentiator — trust earns cheaper borrowing, not capital.',
    bullets: [
      'ProofScore-gated credit limits — higher trust, lower rate',
      'Protocol-native loans against VFIDE vault collateral',
      'Liquidation-protected with Seer-constitution safeguards',
    ],
    cta: { label: 'Build your ProofScore', href: '/proofscore' },
    phase: 'v2',
  },
];

const PHASE_META: Record<RoadmapFeature['phase'], { label: string; badge: string; color: string }> = {
  'v1':   { label: 'V1 — Mainnet launch',     badge: 'Ships at launch', color: '#00FF88' },
  'v1.1': { label: 'V1.1 — Post-testnet',     badge: 'Next release',    color: '#06b6d4' },
  'v2':   { label: 'V2 — Governance release', badge: 'On roadmap',      color: '#a78bfa' },
};

export default function RoadmapPage() {
  const v1   = FEATURES.filter(f => f.phase === 'v1');
  const v11  = FEATURES.filter(f => f.phase === 'v1.1');
  const v2   = FEATURES.filter(f => f.phase === 'v2');

  return (
    <>
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] relative overflow-hidden text-white">
        {/* Ambient */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-40 left-1/3 w-[600px] h-[600px] rounded-full opacity-[0.06]"
            style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 -right-24 w-[500px] h-[500px] rounded-full opacity-[0.05]"
            style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
        </div>
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" aria-hidden="true" />

        <div className="relative container mx-auto max-w-3xl px-4 py-16">
          {/* Header */}
          <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12 text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-300 mb-4">
              <Clock size={10} /> In development
            </div>
            <h1 className="text-4xl font-black text-white mb-3">What&apos;s Coming</h1>
            <p className="text-zinc-400 text-sm max-w-md mx-auto">
              Phase assignments reflect the canonical{' '}
              <code className="text-xs text-zinc-500">deploy-full.ts</code> and{' '}
              <code className="text-xs text-zinc-500">PRODUCTION_SET.md</code>.
              No speculative promises — only what&apos;s built or actively in progress.
            </p>
          </m.div>

          {/* V1 — ships at launch */}
          <Section title="V1 — Mainnet launch" features={v1} phaseMeta={PHASE_META['v1']} />

          {/* V1.1 */}
          <Section title="V1.1 — Post-testnet" features={v11} phaseMeta={PHASE_META['v1.1']} />

          {/* V2 */}
          <Section title="V2 — Governance release" features={v2} phaseMeta={PHASE_META['v2']} />
        </div>
      </div>
      <Footer />
    </>
  );
}

interface SectionProps {
  title: string;
  features: RoadmapFeature[];
  phaseMeta: { label: string; badge: string; color: string };
}

function Section({ title, features, phaseMeta }: SectionProps) {
  const isLaunch = phaseMeta.badge === 'Ships at launch';
  return (
    <div className="mb-14">
      <div className="flex items-center gap-3 mb-5">
        {isLaunch
          ? <CheckCircle size={14} style={{ color: phaseMeta.color }} aria-hidden="true" />
          : <Clock size={14} className="text-zinc-500" aria-hidden="true" />
        }
        <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: isLaunch ? phaseMeta.color : '#71717a' }}>
          {title}
        </h2>
        <span
          className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${phaseMeta.color}18`, color: phaseMeta.color }}
        >
          {phaseMeta.badge}
        </span>
      </div>
      <div className="space-y-5">
        {features.map((f, i) => (
          <m.div
            key={f.slug}
            id={f.slug}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="glass-card-premium p-6 flex gap-5"
          >
            <div className="text-3xl flex-shrink-0 pt-0.5" aria-hidden="true">{f.emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-0.5">
                <h3 className="text-lg font-black text-white">{f.title}</h3>
                {f.contract && (
                  <span className="text-xs text-zinc-600 font-mono shrink-0 mt-1">{f.contract}</span>
                )}
              </div>
              <p className="text-zinc-400 text-sm font-medium mb-1">{f.tagline}</p>
              <p className="text-zinc-500 text-sm leading-relaxed mb-4">{f.description}</p>
              <ul className="space-y-1 mb-4">
                {f.bullets.map(b => (
                  <li key={b} className="flex items-start gap-2 text-sm text-zinc-300">
                    <span className="text-accent mt-0.5 flex-shrink-0" aria-hidden="true">→</span>{b}
                  </li>
                ))}
              </ul>
              <Link
                href={f.cta.href}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent-light transition-colors"
              >
                {f.cta.label} <ArrowRight size={13} aria-hidden="true" />
              </Link>
            </div>
          </m.div>
        ))}
      </div>
    </div>
  );
}
