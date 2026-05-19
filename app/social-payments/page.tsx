'use client';

export const dynamic = 'force-dynamic';

/**
 * Social Payments Dashboard
 *
 * Pre-cleanup, this page mounted the legacy `SocialFeed` component in
 * its "Social Feed" tab, which rendered SEED_POSTS as if real. Dropped
 * that tab — the production social feed lives at /social-hub with real
 * /api/community/posts data. The remaining tabs ("All Activity",
 * "Earnings") are already honest: they say "live data pending" or
 * "not available yet" until backend indexers exist.
 */

import { UnifiedActivityFeed } from '@/components/social/UnifiedActivityFeed';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowDownLeft, ArrowUpRight, Award, DollarSign, Heart,
  Lock, Sparkles, TrendingUp, Users,
} from 'lucide-react';
import { useState } from 'react';
import { Footer } from '@/components/layout/Footer';

export default function SocialPaymentsDashboard() {
  const { address: _address, isConnected: _isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'activity' | 'earnings'>('activity');
  const statsUnavailable = 'Live data pending';

  return (
    <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] pb-8 relative">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        <div className="grid-pattern absolute inset-0 opacity-[0.03]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="badge-live"><span className="badge-live-dot" />Social Finance</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-3">
              <Sparkles className="text-purple-400" size={32} />Social Payments
            </span>
          </h1>
          <p className="text-white/50">Seamlessly integrated cryptocurrency and social interactions — Tip · Earn · Grow</p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: ArrowDownLeft, label: 'Tips Received', sub: '', color: 'emerald' },
            { icon: ArrowUpRight, label: 'Tips Sent', sub: '', color: 'purple' },
            { icon: Lock, label: 'Content Sales', sub: 'Index sales events to populate', color: 'cyan' },
            { icon: Award, label: 'Endorsement Rewards', sub: '', color: 'amber' },
          ].map((stat, i) => (
            <motion.div key={stat.label}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * (i + 1) }}
              className="analytics-card p-5">
              <div className="flex items-center justify-between mb-3">
                <stat.icon size={22} className={`text-${stat.color}-400`} />
                <Users size={14} className="text-white/20" />
              </div>
              <div className="text-2xl font-bold text-white mb-1">{statsUnavailable}</div>
              <div className={`text-sm text-${stat.color}-400 font-medium`}>{stat.label}</div>
              {stat.sub && <div className="text-xs text-white/30 mt-1">{stat.sub}</div>}
            </motion.div>
          ))}
        </div>

        {/* Top Supporters */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="glass-card-premium p-6 mb-6">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <Sparkles size={18} className="text-purple-400" />Top Supporters
          </h3>
          <div className="p-4 bg-white/5 rounded-xl text-sm text-white/40">
            Top supporter rankings will appear once payment-tip events are indexed.
          </div>
        </motion.div>

        {/* Social Hub CTA */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="mb-8 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-sm text-cyan-200 flex items-center gap-3">
          <Heart size={16} className="text-cyan-400 shrink-0" />
          Looking for the community feed?{' '}
          <Link href="/social-hub" className="underline hover:text-cyan-100 font-medium">Go to Social Hub</Link>
          {' '}— it pulls live posts from the community API.
        </motion.div>

        {/* Tabs */}
        <div className="sticky top-7 md:top-[5.25rem] z-30 backdrop-blur-xl bg-zinc-950/80 border-b border-white/5 -mx-4 px-4 mb-8 py-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {([
              { id: 'activity' as const, label: 'All Activity', icon: <TrendingUp size={14} /> },
              { id: 'earnings' as const, label: 'Earnings', icon: <DollarSign size={14} /> },
            ]).map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={activeTab === t.id ? 'tab-pill-active' : 'tab-pill-inactive'}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}>
            {activeTab === 'activity' && (
              <UnifiedActivityFeed filter="all" limit={50} />
            )}

            {activeTab === 'earnings' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-card-premium p-6">
                  <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                    <ArrowDownLeft size={18} className="text-emerald-400" />Recent Tips Received
                  </h3>
                  <div className="p-4 bg-white/5 rounded-xl text-sm text-white/40">
                    Live tip history is not available yet.
                  </div>
                </div>
                <div className="glass-card-premium p-6">
                  <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                    <Lock size={18} className="text-cyan-400" />Content Sales
                  </h3>
                  <div className="p-4 bg-white/5 rounded-xl text-sm text-white/40">
                    Live content-sale settlements are not available yet.
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <Footer />
    </div>
  );
}
