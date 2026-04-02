'use client';

import dynamic from 'next/dynamic';
import { Footer } from '@/components/layout/Footer';
import { motion } from 'framer-motion';
import { Shield, Zap, Users, Store, Heart, ArrowRight, ChevronRight } from 'lucide-react';
import Link from 'next/link';

import { HeroVisualization } from './components/HeroVisualization';
import { FeatureCard } from './components/FeatureCard';
import { StatItem } from './components/StatItem';
import { Step } from './components/Step';
import { useAnimatedCounter } from './components/useAnimatedCounter';

export default function Home() {
  return (
    <>
      <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
        {/* Hero */}
        <section className="pt-32 pb-20 relative">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}>
                <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
                  Keep what you <span className="text-cyan-400">earn</span>
                </h1>
                <p className="text-xl text-gray-400 mb-8 max-w-lg">
                  Zero merchant fees. Non-custodial vaults. Trust-scored payments.
                  Built for everyone the platforms forgot.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link href="/merchant/setup"
                    className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold text-lg hover:scale-[1.02] transition-transform flex items-center gap-2">
                    Start selling <ArrowRight size={20} />
                  </Link>
                  <Link href="/marketplace"
                    className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-xl font-bold text-lg hover:bg-white/10 transition-colors">
                    Browse marketplace
                  </Link>
                </div>
              </motion.div>
              <HeroVisualization />
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-16 border-y border-white/5">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <StatItem value={0} label="Merchant Fees" suffix="%" color="cyan" />
              <StatItem value={10000} label="Max ProofScore" color="amber" />
              <StatItem value={35} label="Burn Rate" suffix="%" color="emerald" />
              <StatItem value={20} label="To Charity" suffix="%" color="pink" />
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20">
          <div className="container mx-auto px-4 max-w-6xl">
            <h2 className="text-3xl font-bold text-white text-center mb-12">How it works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FeatureCard icon="Shield" title="Non-Custodial Vaults" description="You hold the keys. Recovery via guardians. Inheritance via Next of Kin." color="cyan" />
              <FeatureCard icon="Zap" title="Zero Merchant Fees" description="Sellers keep 100%. Buyers pay a trust fee that drops as ProofScore grows." color="amber" />
              <FeatureCard icon="Users" title="Social Commerce" description="Buy, sell, share, endorse. Every transaction builds trust." color="emerald" />
            </div>
          </div>
        </section>

        {/* Steps */}
        <section className="py-20 bg-white/[0.02]">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-bold text-white text-center mb-12">Get started in 60 seconds</h2>
            <div className="space-y-6">
              <Step number={1} title="Create your account" description="Email, phone, or wallet. No crypto experience needed." time="10 sec" index={0} />
              <Step number={2} title="Set up your store" description="Name, category, add one product. You're live." time="30 sec" index={1} />
              <Step number={3} title="Share your link" description="Send to customers via WhatsApp, Instagram, anywhere." time="20 sec" index={2} />
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
