'use client';

import { motion } from 'framer-motion';
import { Clock, ArrowRight } from 'lucide-react';
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
  phase: 'v1.1' | 'v2';
}

const FEATURES: RoadmapFeature[] = [
  {
    emoji: '🔄',
    slug: 'subscriptions',
    title: 'Recurring Subscriptions',
    tagline: 'Set up and manage subscription billing for your customers.',
    description:
      'The SubscriptionManager contract is finalised but deployment is deferred to V1.1 to keep the mainnet surface area minimal. Merchants can set up subscription products from their portal today.',
    bullets: [
      'Pull-permit model — customer authorises a merchant once',
      'Merchant sets amount + cadence; contract enforces limits',
      'Cancel at any time with no admin involvement',
    ],
    cta: { label: 'Merchant subscriptions (available now)', href: '/merchant/subscriptions' },
    phase: 'v1.1',
  },
  {
    emoji: '💧',
    slug: 'streaming',
    title: 'Payment Streaming',
    tagline: 'Continuous per-second USDC flows.',
    description:
      'Payment streaming is designed for payroll, subscriptions, and creator monetisation. It ships after the core payment layer is stable on mainnet.',
    bullets: [
      'Real-time per-second payment streams (à la Sablier)',
      'Time-locked payroll streams for verified council contributors',
      'Cancel or top-up a stream at any time',
    ],
    cta: { label: 'See Payroll instead', href: '/payroll' },
    phase: 'v1.1',
  },
  {
    emoji: '⏳',
    slug: 'time-locks',
    title: 'Time-Locked Transfers',
    tagline: 'Schedule payments to execute at a future time.',
    description:
      'Time-locks are live in the Vault safety window for pending transfers. Full scheduled-transfer UI is in the next release.',
    bullets: [
      'Schedule transfers to execute at a future timestamp',
      '24-hour safety window: cancel any queued transfer before it executes',
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
      'Comprehensive reporting is in the merchant analytics milestone. Merchants can access live revenue data and export CSVs from their dashboard today.',
    bullets: [
      'Revenue, volume, and fee breakdown by period',
      'Tax-ready CSV exports for every jurisdiction',
      'Customer lifetime value and cohort analysis',
    ],
    cta: { label: 'Merchant analytics (available now)', href: '/merchant/analytics' },
    phase: 'v1.1',
  },
  {
    emoji: '🤖',
    slug: 'agent',
    title: 'VFIDE Agent',
    tagline: 'AI-powered payment automation and smart alerts.',
    description:
      'The VFIDE Agent automates routine financial tasks — sweep dust balances, auto-top-up Guardians, alert on unusual activity — using on-chain triggers and your ProofScore profile.',
    bullets: [
      'Sweep dust balances automatically on schedule',
      'Auto-top-up Guardian pool when it drops below threshold',
      'Alert on unusual vault activity using on-chain triggers',
    ],
    cta: { label: 'Back to Dashboard', href: '/dashboard' },
    phase: 'v1.1',
  },
  {
    emoji: '🔐',
    slug: 'multisig',
    title: 'Multi-Signature Vaults',
    tagline: 'Require multiple signers before funds move.',
    description:
      'Multi-sig is scheduled for the post-testnet governance release. Guardian-assisted recovery provides a strong social recovery alternative in the meantime.',
    bullets: [
      'Require M-of-N signatures before any vault transfer executes',
      'Business treasury controls with designated signatories',
      'Time-locked execution with Guardian override path',
    ],
    cta: { label: 'Try Guardian Recovery instead', href: '/guardians' },
    phase: 'v2',
  },
  {
    emoji: '🏦',
    slug: 'lending',
    title: 'DeFi Lending',
    tagline: 'Collateral-backed loans against your vault balance.',
    description:
      'Protocol-native lending against VFIDE vault collateral is planned for V2. ProofScore-gated credit limits are the key differentiator.',
    bullets: [
      'ProofScore-gated credit limits — trust earns you cheaper borrowing',
      'Protocol-native loans against VFIDE vault collateral',
      'Liquidation-protected with Seer-constitution safeguards',
    ],
    cta: { label: 'Build your ProofScore', href: '/proofscore' },
    phase: 'v2',
  },
];

const PHASE_LABELS: Record<RoadmapFeature['phase'], string> = {
  'v1.1': 'V1.1 · Post-testnet',
  'v2': 'V2 · Governance release',
};

export default function RoadmapPage() {
  const v11 = FEATURES.filter(f => f.phase === 'v1.1');
  const v2  = FEATURES.filter(f => f.phase === 'v2');

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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12 text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-300 mb-4">
              <Clock size={10} /> In development
            </div>
            <h1 className="text-4xl font-black text-white mb-3">What&apos;s Coming</h1>
            <p className="text-zinc-400 text-sm max-w-md mx-auto">
              These features are built or in progress. They ship after the core protocol is
              proven stable on mainnet — no speculative promises.
            </p>
          </motion.div>

          {/* V1.1 */}
          <Section title="V1.1 — Post-testnet" features={v11} />

          {/* V2 */}
          <Section title="V2 — Governance release" features={v2} />
        </div>
      </div>
      <Footer />
    </>
  );
}

function Section({ title, features }: { title: string; features: RoadmapFeature[] }) {
  return (
    <div className="mb-12">
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-5">{title}</h2>
      <div className="space-y-5">
        {features.map((f, i) => (
          <motion.div
            key={f.slug}
            id={f.slug}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="glass-card-premium p-6 flex gap-5"
          >
            <div className="text-3xl flex-shrink-0 pt-0.5" aria-hidden="true">{f.emoji}</div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-black text-white mb-0.5">{f.title}</h3>
              <p className="text-zinc-400 text-sm font-medium mb-1">{f.tagline}</p>
              <p className="text-zinc-500 text-sm leading-relaxed mb-4">{f.description}</p>
              <ul className="space-y-1 mb-4">
                {f.bullets.map(b => (
                  <li key={b} className="flex items-start gap-2 text-sm text-zinc-300">
                    <span className="text-accent mt-0.5 flex-shrink-0">→</span>{b}
                  </li>
                ))}
              </ul>
              <Link
                href={f.cta.href}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent-light transition-colors"
              >
                {f.cta.label} <ArrowRight size={13} />
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
