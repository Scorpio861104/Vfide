'use client';

import { Footer } from '@/components/layout/Footer';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { FeeSavingsCalculator } from '@/components/fees';
import { OnboardingPathChooser, useOnboarding } from '@/components/onboarding';

import { LiveProofScoreHero } from './components/LiveProofScoreHero';
import { FeeFlowRiver } from './components/FeeFlowRiver';
import { MonumentBackdrop } from './components/MonumentBackdrop';
import { FeatureCard } from './components/FeatureCard';
import { StatItem } from './components/StatItem';
import { Step } from './components/Step';

export default function Home() {
  const { state } = useOnboarding();

  return (
    <>
      <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
        {/* Hero: text + live ProofScore widget. Monument anchors the section. */}
        <section className="relative isolate pt-28 pb-20 sm:pt-32 sm:pb-24">
          <MonumentBackdrop variant="hero" />

          <div className="container mx-auto px-4 max-w-6xl relative">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="lg:col-span-5"
              >
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 px-3 py-1 text-xs uppercase tracking-widest text-cyan-300">
                  Trust-scored payments
                </div>
                <h1 className="text-5xl md:text-6xl font-bold text-white mb-5 leading-[1.05]">
                  Keep what you{' '}
                  <span className="bg-gradient-to-br from-cyan-300 via-cyan-200 to-violet-300 bg-clip-text text-transparent">
                    earn
                  </span>
                </h1>
                <p className="text-lg text-gray-400 mb-7 max-w-md leading-relaxed">
                  Zero merchant fees. Guardian-protected self-custody. Reputation that pays you back.
                  Built for everyone the platforms forgot.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/merchant/setup"
                    className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform flex items-center gap-2 shadow-lg shadow-cyan-500/20"
                  >
                    Start selling <ArrowRight size={18} />
                  </Link>
                  <Link
                    href="/marketplace"
                    className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-medium hover:bg-white/10 transition-colors"
                  >
                    Browse marketplace
                  </Link>
                </div>
                <div className="mt-5 text-xs text-gray-500">
                  Try the slider on the right — drag your trust score and see the fee curve respond.
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="lg:col-span-7"
              >
                <LiveProofScoreHero />
              </motion.div>
            </div>
          </div>
        </section>

        {/* Onboarding path chooser (shown to undecided visitors) */}
        {state.path === 'undecided' && (
          <section className="py-10 border-y border-white/5">
            <OnboardingPathChooser />
          </section>
        )}

        {/* The fee river — second wow moment */}
        <section className="relative isolate py-16 sm:py-20 overflow-hidden">
          <MonumentBackdrop variant="full" />
          <div className="container mx-auto px-4 max-w-6xl relative">
            <FeeFlowRiver />
          </div>
        </section>

        {/* Stat strip */}
        <section className="py-14 border-y border-white/5">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <StatItem value={0} label="Merchant Fees" suffix="%" color="cyan" />
              <StatItem value={10000} label="Max ProofScore" color="amber" />
              <StatItem value={35} label="Burn Rate" suffix="%" color="emerald" />
              <StatItem value={20} label="Sanctum Fund" suffix="%" color="pink" />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-20">
          <div className="container mx-auto px-4 max-w-6xl">
            <h2 className="text-3xl font-bold text-white text-center mb-3">How it works</h2>
            <p className="text-center text-gray-400 max-w-2xl mx-auto mb-12">
              Three primitives that work together: a vault you control, a reputation engine, and a fee model that funds the network.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FeatureCard
                icon="Shield"
                title="Guardian-Protected Vaults"
                description="You hold the keys. Guardians help rotate wallet access, protect queued transfers, and support recovery flows."
                color="cyan"
              />
              <FeatureCard
                icon="Zap"
                title="Zero Merchant Fees"
                description="Sellers keep 100%. Buyers pay a trust fee that drops as ProofScore grows."
                color="amber"
              />
              <FeatureCard
                icon="Users"
                title="Social Commerce"
                description="Buy, sell, share, endorse. Every transaction builds trust."
                color="emerald"
              />
            </div>
          </div>
        </section>

        {/* Fee savings calculator */}
        <section className="py-20 bg-white/[0.02]">
          <div className="container mx-auto px-4">
            <FeeSavingsCalculator />
          </div>
        </section>

        {/* 60-second start */}
        <section className="py-20">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-bold text-white text-center mb-12">
              Get started in 60 seconds
            </h2>
            <div className="space-y-6">
              <Step number={1} title="Create your account" description="Connect your wallet to continue." time="10 sec" index={0} />
              <Step number={2} title="Set up your store" description="Name, category, add one product. You are live." time="30 sec" index={1} />
              <Step number={3} title="Share your link" description="Send to customers via WhatsApp, Instagram, anywhere." time="20 sec" index={2} />
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
