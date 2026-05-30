'use client';

import { Footer } from '@/components/layout/Footer';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Shield, Zap, Users, Star, TrendingUp, Lock, Globe, ChevronRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { FeeSavingsCalculator } from '@/components/fees';
import { OnboardingPathChooser, useOnboarding } from '@/components/onboarding';
import { useRef } from 'react';
import { useLocale } from '@/lib/locale/LocaleProvider';
import { HOME_TRANSLATIONS, pickLocaleCopy } from '@/lib/i18n';

import { LiveProofScoreHero } from './components/LiveProofScoreHero';
import { FeeFlowRiver } from './components/FeeFlowRiver';
import { MonumentBackdrop } from './components/MonumentBackdrop';
import { FeatureCard } from './components/FeatureCard';
import { StatItem } from './components/StatItem';
import { Step } from './components/Step';

/* ── Feature data ──────────────────────────────────────────── */
const FEATURES = [
  {
    icon: 'Shield' as const,
    title: 'Guardian-Protected Vaults',
    description: 'You hold the keys. Guardians help rotate wallet access, protect queued transfers, and support recovery flows — non-custodial by design.',
    color: '#00F0FF',
    delay: 0,
  },
  {
    icon: 'Zap' as const,
    title: 'Zero Merchant Fees',
    description: "Sellers keep 100%. Buyers pay a trust fee that drops as ProofScore grows — the network rewards honesty with cheaper transactions.",
    color: '#FFD700',
    delay: 0.1,
  },
  {
    icon: 'Users' as const,
    title: 'Social Commerce',
    description: 'Buy, sell, share, endorse. Every transaction builds trust on-chain and grows your reputation across the entire ecosystem.',
    color: '#00FF88',
    delay: 0.2,
  },
  {
    icon: 'Store' as const,
    title: 'Instant Merchant Portal',
    description: 'Launch your store in 60 seconds. One link, any stablecoin, any device — no bank account, no approval, no gatekeeping.',
    color: '#A78BFA',
    delay: 0.3,
  },
  {
    icon: 'Heart' as const,
    title: 'ProofScore Reputation',
    description: "On-chain reputation that compounds over time. Build trust across payments, commerce, and social transactions — your score earns you lower fees.",
    color: '#F472B6',
    delay: 0.4,
  },
  {
    icon: 'ArrowRight' as const,
    title: 'DAO Governance',
    description: "Vote on protocol parameters, elect council members, and shape the future of decentralized commerce — governance that's actually on-chain.",
    color: '#FB923C',
    delay: 0.5,
  },
];

export default function Home() {
  const { state } = useOnboarding();
  const { locale } = useLocale();
  const copy = pickLocaleCopy(HOME_TRANSLATIONS, locale);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '15%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const protocolMetrics = [
    { label: copy.merchantFeesLabel, value: '0%', icon: '💸' },
    { label: copy.maxProofScoreLabel, value: '10,000', icon: '🏆' },
    { label: copy.burnRateLabel, value: '40%', icon: '🔥' },
    { label: copy.sanctumFundLabel, value: '10%', icon: '🛡️' },
    { label: 'Avg Settlement', value: '<3s', icon: '⚡' },
    { label: 'Guardian Nodes', value: '3-of-5', icon: '🔐' },
    { label: 'ProofScore Tiers', value: '7 Tiers', icon: '🎯' },
    { label: 'Self-Custody', value: '100%', icon: '🗝️' },
  ];

  return (
    <>
      <div className="min-h-screen bg-zinc-950 relative overflow-hidden">

        {/* ════════════════════════════════════════
            HERO SECTION — Cinematic
        ════════════════════════════════════════ */}
        <section ref={heroRef} className="hero-section relative isolate pt-28 pb-24 sm:pt-36 sm:pb-32 overflow-hidden">
          {/* Animated mesh background */}
          <div className="hero-mesh-bg" aria-hidden="true">
            <div className="mesh-orb-cyan" style={{ width: '60%', height: '60%', top: '-15%', left: '-10%' }} />
            <div className="mesh-orb-purple" style={{ width: '50%', height: '50%', bottom: '-20%', right: '-5%' }} />
            <div className="mesh-orb-blue" style={{ width: '40%', height: '40%', top: '30%', left: '30%' }} />
          </div>

          {/* Grid overlay */}
          <div className="grid-pattern absolute inset-0 -z-10" aria-hidden="true" />

          <MonumentBackdrop variant="hero" />

          <motion.div
            style={{ y: heroY, opacity: heroOpacity }}
            className="container mx-auto px-4 max-w-6xl relative"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Text column */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                className="lg:col-span-5"
              >
                {/* Animated badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="badge-live mb-6 w-fit"
                >
                  {copy.liveBadge}
                </motion.div>

                <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-white mb-6 leading-[1.02] tracking-tight">
                  {copy.heroPrefix}{' '}
                  <span className="gradient-text-hero">
                    {copy.heroAccent}
                  </span>
                </h1>

                <p className="text-lg sm:text-xl text-zinc-400 mb-8 max-w-md leading-relaxed">
                  {copy.heroDescription}
                </p>

                {/* CTA buttons */}
                <div className="flex flex-wrap gap-3 mb-8">
                  <Link
                    href="/merchant/setup"
                    className="btn-premium btn-premium-primary text-sm"
                  >
                    {copy.primaryCta} <ArrowRight size={16} />
                  </Link>
                  <Link
                    href="/marketplace"
                    className="btn-premium btn-premium-ghost text-sm"
                  >
                    {copy.secondaryCta}
                  </Link>
                </div>

                {/* Trust points */}
                <div className="space-y-2">
                  {copy.trustPoints.map((point, i) => (
                    <motion.div
                      key={point}
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 + i * 0.08 }}
                      className="flex items-center gap-2 text-sm text-zinc-400"
                    >
                      <CheckCircle2 size={14} className="text-cyan-400 shrink-0" />
                      {point}
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Widget column */}
              <motion.div
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.25 }}
                className="lg:col-span-7"
              >
                <div className="glass-card-premium p-1">
                  <LiveProofScoreHero />
                </div>
                <p className="mt-3 text-center text-xs text-zinc-500">
                  {copy.sliderHint}
                </p>
              </motion.div>
            </div>
          </motion.div>

          {/* Bottom glow */}
          <div className="hero-glow-bottom" aria-hidden="true" />
        </section>

        {/* ════════════════════════════════════════
            PROTOCOL METRICS MARQUEE
        ════════════════════════════════════════ */}
        <section className="py-5 border-y border-white/5 bg-zinc-950/80 backdrop-blur-sm overflow-hidden">
          <div className="marquee-wrapper">
            <div className="marquee-track">
              {[...protocolMetrics, ...protocolMetrics].map((m, i) => (
                <div key={i} className="metric-chip mx-3">
                  <span>{m.icon}</span>
                  <span className="metric-chip-value">{m.value}</span>
                  <span className="text-zinc-500">{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════
            ONBOARDING PATH CHOOSER
        ════════════════════════════════════════ */}
        {state.path === 'undecided' && (
          <section className="py-12 border-b border-white/5 bg-zinc-950/50">
            <OnboardingPathChooser />
          </section>
        )}

        {/* ════════════════════════════════════════
            FEE RIVER — second wow moment
        ════════════════════════════════════════ */}
        <section className="relative isolate py-20 sm:py-28 overflow-hidden">
          <MonumentBackdrop variant="full" />
          <div className="container mx-auto px-4 max-w-6xl relative">
            <FeeFlowRiver />
          </div>
        </section>

        {/* ════════════════════════════════════════
            STATS STRIP — neon numbers
        ════════════════════════════════════════ */}
        <section className="py-16 border-y border-white/5">
          <div className="container mx-auto px-4 max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-12 text-center"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">{copy.statsKicker}</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white">
                {copy.statsTitlePrefix}{' '}
                <span className="gradient-text-cyan-blue">{copy.statsTitleAccent}</span>
              </h2>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { value: 0,     label: copy.merchantFeesLabel,  suffix: '%',   color: 'cyan'    },
                { value: 10000, label: copy.maxProofScoreLabel, suffix: '',    color: 'amber'   },
                { value: 40,    label: copy.burnRateLabel,      suffix: '%',   color: 'emerald' },
                { value: 10,    label: copy.sanctumFundLabel,   suffix: '%',   color: 'pink'    },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="glass-card-premium p-6 text-center"
                >
                  <StatItem
                    value={stat.value}
                    label={stat.label}
                    suffix={stat.suffix}
                    color={stat.color}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════
            FEATURES GRID
        ════════════════════════════════════════ */}
        <section className="py-24 relative">
          <div className="absolute inset-0 hero-mesh-bg opacity-40" aria-hidden="true">
            <div className="mesh-orb-cyan" style={{ width: '50%', height: '50%', top: '10%', right: '-10%' }} />
          </div>

          <div className="container mx-auto px-4 max-w-6xl relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-14 text-center"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Core primitives</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Everything you need.{' '}
                <span className="gradient-text-purple-cyan">Nothing you don&apos;t.</span>
              </h2>
              <p className="text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                Three primitives that compose into a complete financial layer: a vault you control,
                a reputation engine that rewards honesty, and a fee model that funds the network.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURES.map((feature) => (
                <FeatureCard key={feature.title} {...feature} />
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════
            FEE SAVINGS CALCULATOR
        ════════════════════════════════════════ */}
        <section className="py-24 bg-zinc-950/60">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-12 text-center"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Savings calculator</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white">
                See how much you{' '}
                <span className="text-glow-cyan">save</span>
              </h2>
            </motion.div>
            <FeeSavingsCalculator />
          </div>
        </section>

        {/* ════════════════════════════════════════
            HOW IT WORKS — premium steps
        ════════════════════════════════════════ */}
        <section className="py-24">
          <div className="container mx-auto px-4 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-14 text-center"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Quick start</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white">
                Get started in{' '}
                <span className="gradient-text-cyan-blue">60 seconds</span>
              </h2>
            </motion.div>

            <div className="space-y-5">
              <Step number={1} title="Create your account"  description="Connect your wallet — that's it. No email, no KYC for basic use, no approval wait."  time="10 sec" index={0} />
              <Step number={2} title="Set up your store"    description="Name, category, add one product. One shareable payment link. You are live."             time="30 sec" index={1} />
              <Step number={3} title="Share your link"      description="Send via WhatsApp, Instagram, Discord, anywhere. Customers pay with any stablecoin."     time="20 sec" index={2} />
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════
            CTA SECTION
        ════════════════════════════════════════ */}
        <section className="py-24 px-4">
          <div className="container mx-auto max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="cta-gradient-bg p-12 text-center"
            >
              <div className="badge-live mb-6 w-fit mx-auto">
                Zero fees. Open source. Self-custody.
              </div>
              <h2 className="text-4xl sm:text-5xl font-black text-white mb-5 leading-tight tracking-tight">
                Ready to own your{' '}
                <span className="gradient-text-hero">payments?</span>
              </h2>
              <p className="text-zinc-400 text-lg mb-10 max-w-2xl mx-auto">
                Join thousands building the future of decentralized commerce.
                Your ProofScore starts now.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/merchant/setup"
                  className="btn-premium btn-premium-primary"
                >
                  Launch your store <ArrowRight size={18} />
                </Link>
                <Link
                  href="/dashboard"
                  className="btn-premium btn-premium-ghost"
                >
                  View dashboard <ChevronRight size={16} />
                </Link>
              </div>
              <p className="mt-8 text-xs text-zinc-500">
                No credit card. No bank account. Just your wallet.
              </p>
            </motion.div>
          </div>
        </section>

      </div>
      <Footer />
    </>
  );
}
