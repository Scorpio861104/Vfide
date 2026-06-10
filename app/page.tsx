'use client';

import { Footer } from '@/components/layout/Footer';
import { m as motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, ChevronRight, CheckCircle2, Wallet, TrendingDown, Lock, Shield, Heart, Scale } from 'lucide-react';
import Link from 'next/link';
import { FeeSavingsCalculator } from '@/components/fees';
import { OnboardingPathChooser, useOnboarding } from '@/components/onboarding';
import { useRef } from 'react';
import { useLocale } from '@/lib/locale/LocaleProvider';
import { HOME_TRANSLATIONS, pickLocaleCopy } from '@/lib/i18n';

import { LiveProofScoreHero } from './components/LiveProofScoreHero';
import { InstitutionalFlow } from '@/components/home/InstitutionalFlow';
import { VFIDEExplained } from '@/components/education/VFIDEExplained';
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
    description: "Hold value, recover from loss, build trust, and trade — and help steward the protocol's parameters through on-chain governance as it opens up.",
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
    { label: 'Guardian Nodes', value: '3-of-5', icon: '🔐' },
    { label: 'ProofScore Tiers', value: '7 Tiers', icon: '🎯' },
    { label: 'Self-Custody', value: '100%', icon: '🗝️' },
  ];

  return (
    <>
      <div className="ui-page-shell min-h-screen relative overflow-hidden">

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
            className="ui-container-breathing relative"
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

                  <p className="text-sm text-zinc-500 mb-8 max-w-md leading-relaxed">
                    VFIDE exists to help people hold value securely, recover from loss, build trust, and participate in commerce.
                  </p>

                {/* CTA buttons */}
                <div className="flex flex-col gap-3 mb-8 sm:flex-row sm:flex-wrap">
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
                <div className="glass-card-premium ui-card-sheen p-1">
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

        {/*
            WHAT IS VFIDE — plain-language explainer (before any mechanism)
         */}
        <section className="py-16 sm:py-20 border-b border-white/5 bg-zinc-950/40 relative">
          <div className="container mx-auto px-4 max-w-5xl relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-12 text-center"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
                {copy.whatKicker}
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white">
                {copy.whatTitlePrefix}{' '}
                <span className="gradient-text-cyan-blue">{copy.whatTitleAccent}</span>
              </h2>
              <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-zinc-400 sm:text-lg">
                VFIDE is a self-sovereign ownership network combining payments, trust infrastructure,
                asset protection, merchant commerce, and continuity systems into one platform.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {copy.whatItems.map((item, i) => {
                const Icon = [Wallet, TrendingDown, Lock][i] ?? Wallet;
                const accent = ['#00F0FF', '#FFD700', '#00FF88'][i] ?? '#00F0FF';
                return (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="glass-card-premium p-6"
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                      style={{ backgroundColor: `${accent}1a`, border: `1px solid ${accent}33` }}
                    >
                      <Icon size={20} style={{ color: accent }} />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{item.label}</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">{item.body}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <InstitutionalFlow />

        <section className="py-8 sm:py-12">
          <div className="container mx-auto max-w-6xl px-5 md:px-8">
            <VFIDEExplained />
          </div>
        </section>

        {/* ════════════════════════════════════════
            PROTOCOL METRICS MARQUEE
        ════════════════════════════════════════ */}
        <section className="ui-hairline-top py-5 border-y border-white/5 bg-zinc-950/80 backdrop-blur-sm overflow-hidden">
          <div className="marquee-wrapper">
            <div className="marquee-track">
              {[...protocolMetrics, ...protocolMetrics].map((m, i) => (
                <div key={i} className="metric-chip mx-3">
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
          <div className="ui-container-breathing relative">
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
            FOUR PROMISES (constitutional: promises before features)
        ════════════════════════════════════════ */}
        <section className="py-24 relative">
          <div className="ui-container-breathing relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-14 text-center"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Why VFIDE exists</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white">What VFIDE helps you do.</h2>
            </motion.div>

            <div className="grid gap-5 sm:grid-cols-2">
              {[
                { Icon: Lock,         title: 'Own value.',                body: 'Your funds are yours. No bank, no middleman, and no one - not even VFIDE - who can freeze or seize them.' },
                { Icon: CheckCircle2, title: 'Build trust.',               body: 'Trust is earned through honest dealing over time, and as it grows your fees fall. It is responsibility, not status.' },
                { Icon: Wallet,       title: 'Create opportunity.',        body: 'Get paid, sell, and grow a business. Zero merchant fees - the protocol takes nothing from sellers.' },
                { Icon: Shield,       title: 'Protect what you build.',    body: 'Lose your phone? Guardians and recovery mean losing access does not have to mean losing everything.' },
                { Icon: Heart,        title: 'Preserve continuity.',       body: 'Inheritance lets what you build survive you, passing to the people you choose.' },
                { Icon: Scale,        title: 'Participate in stewardship.', body: 'Help protect the parameters that affect everyone, through on-chain governance - as a participant, not a subject.' },
              ].map(({ Icon, title, body }, i) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6"
                >
                  <Icon size={22} className="text-cyan-400 mb-3" aria-hidden="true" />
                  <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{body}</p>
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

          <div className="ui-container-breathing relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-14 text-center"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">What you get</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Everything you need.{' '}
                <span className="gradient-text-purple-cyan">Nothing you don&apos;t.</span>
              </h2>
              <p className="text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                Three things working together: a wallet only you control, a reputation that
                earns you lower fees the more you trade, and zero fees for sellers.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURES.map((feature, i) => (
                <FeatureCard
                  key={feature.title}
                  {...feature}
                  title={copy.features[i]?.title ?? feature.title}
                  description={copy.features[i]?.description ?? feature.description}
                />
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
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">{copy.calcKicker}</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white">
                {copy.calcTitlePrefix}{' '}
                <span className="text-glow-cyan">{copy.calcTitleAccent}</span>
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
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">{copy.stepsKicker}</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white">
                {copy.stepsTitlePrefix}{' '}
                <span className="gradient-text-cyan-blue">{copy.stepsTitleAccent}</span>
              </h2>
            </motion.div>

            <div className="space-y-5">
              <Step number={1} title={copy.steps[0].title} description={copy.steps[0].description}  time="10 sec" index={0} />
              <Step number={2} title={copy.steps[1].title} description={copy.steps[1].description}             time="30 sec" index={1} />
              <Step number={3} title={copy.steps[2].title} description={copy.steps[2].description}     time="20 sec" index={2} />
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
                {copy.ctaBadge}
              </div>
              <h2 className="text-4xl sm:text-5xl font-black text-white mb-5 leading-tight tracking-tight">
                {copy.ctaTitlePrefix}{' '}
                <span className="gradient-text-hero">{copy.ctaTitleAccent}</span>
              </h2>
              <p className="text-zinc-400 text-lg mb-10 max-w-2xl mx-auto">
                Set up your store in about a minute and start accepting payments — no bank,
                no gatekeeper. Your ProofScore begins with your first transaction.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/merchant/setup"
                  className="btn-premium btn-premium-primary"
                >
                  {copy.ctaPrimary} <ArrowRight size={18} />
                </Link>
                <Link
                  href="/dashboard"
                  className="btn-premium btn-premium-ghost"
                >
                  {copy.ctaSecondary} <ChevronRight size={16} />
                </Link>
              </div>
              <p className="mt-8 text-xs text-zinc-500">
                {copy.ctaFootnote}
              </p>
            </motion.div>
          </div>
        </section>

      </div>
      <Footer />
    </>
  );
}
