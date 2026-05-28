'use client';

/**
 * Council → OverviewTab — honest preview.
 *
 * Tier 2 Phase 5 (2026-05-17). Previously displayed "12 Council Seats /
 * 365 Days Term Length / 120d Pay Interval" as hard facts and marked
 * CouncilSalary / CouncilElection contracts as "Active" with
 * green badges — none of which is true at V1. Those contracts live in
 * `contracts/future/` (gated by `NEXT_PUBLIC_FUTURE_FEATURES_ENABLED`) and
 * are NOT in the V1 deploy script.
 *
 * This rewrite mirrors the pattern from `app/governance/components/CouncilTab.tsx`
 * (Tier 1 Phase 4 Turn 4): show what governance looks like at V1 (direct DAO
 * voting), describe what the Council will add when it ships, point users at
 * what they can do today.
 */

import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';
import {
  DollarSign,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
  Vote,
  Info,
  ArrowRight,
} from 'lucide-react';

export function OverviewTab() {
  return (
    <div className="space-y-8">
      {/* Hero — honest about V1 deferral */}
      <GlassCard className="p-8 text-center bg-gradient-to-br from-indigo-500/10 to-purple-500/5">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-indigo-500/30 inline-block mb-4">
          <Users className="w-12 h-12 text-indigo-400" />
        </div>
        <h2 className="text-3xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
          VFIDE Governance Council
        </h2>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/15 border border-amber-500/30 rounded-full text-xs font-bold text-amber-300 mb-4">
          <Sparkles size={12} /> Coming in a future release
        </div>
        <p className="text-gray-400 max-w-2xl mx-auto">
          The Council is a future-release governance layer adding elected representatives for
          proposal review and emergency response. It is{' '}
          <span className="text-zinc-300">not active at V1 launch</span>. The pages below preview
          what each tab will display once the council contracts ship.
        </p>
      </GlassCard>

      {/* What's parameterized but not yet deployed */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        {[
          {
            value: 'TBD',
            label: 'Council Seats',
            sub: 'set at contract deploy',
            gradient: 'from-accent/20 to-blue-500/10',
            border: 'border-accent/20',
            text: 'text-accent',
          },
          {
            value: '—',
            label: 'Active Members',
            sub: 'no election yet',
            gradient: 'from-emerald-500/20 to-green-500/10',
            border: 'border-emerald-500/20',
            text: 'text-emerald-400',
          },
          {
            value: 'TBD',
            label: 'Term Length',
            sub: 'set at contract deploy',
            gradient: 'from-amber-500/20 to-orange-500/10',
            border: 'border-amber-500/20',
            text: 'text-amber-400',
          },
          {
            value: 'TBD',
            label: 'Pay Interval',
            sub: 'set at contract deploy',
            gradient: 'from-purple-500/20 to-pink-500/10',
            border: 'border-purple-500/20',
            text: 'text-purple-400',
          },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            whileHover={{ scale: 1.02, y: -2 }}
            className={`bg-gradient-to-br ${stat.gradient} backdrop-blur-xl border ${stat.border} rounded-2xl p-6 text-center`}
          >
            <div className={`text-3xl font-bold ${stat.text} tabular-nums`}>{stat.value}</div>
            <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
            <div className="text-xs text-gray-500 mt-1">{stat.sub}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* How governance works at V1 */}
      <GlassCard className="p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-500/5">
            <Vote className="w-5 h-5 text-indigo-400" />
          </div>
          How governance works at V1
        </h3>
        <div className="space-y-3 text-sm text-zinc-300">
          <p>
            At V1, the DAO operates with direct ProofScore-weighted voting — no intermediate
            council. Any eligible token holder can submit proposals, vote, finalize them once the
            voting window closes, and execute passed proposals after the timelock.
          </p>
          <Link
            href="/governance"
            className="text-accent hover:text-accent inline-flex items-center gap-1 transition-colors"
          >
            See active proposals <ArrowRight size={12} />
          </Link>
        </div>
      </GlassCard>

      {/* What the council will add */}
      <GlassCard className="p-6">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-500/5">
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          What the Council will add
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              icon: Shield,
              color: 'text-accent',
              bg: 'from-accent/20 to-accent/5',
              border: 'border-accent/20',
              title: 'Protocol Security',
              desc: 'Monitor and respond to security incidents, manage emergency controls',
            },
            {
              icon: Vote,
              color: 'text-purple-400',
              bg: 'from-purple-500/20 to-purple-500/5',
              border: 'border-purple-500/20',
              title: 'Proposal Review',
              desc: 'Review and recommend DAO proposals before community voting',
            },
            {
              icon: DollarSign,
              color: 'text-emerald-400',
              bg: 'from-emerald-500/20 to-emerald-500/5',
              border: 'border-emerald-500/20',
              title: 'Treasury Oversight',
              desc: 'Approve multi-sig transactions and manage fund allocations',
            },
            {
              icon: TrendingUp,
              color: 'text-amber-400',
              bg: 'from-amber-500/20 to-amber-500/5',
              border: 'border-amber-500/20',
              title: 'Ecosystem Growth',
              desc: 'Drive partnerships, integrations, and community expansion',
            },
          ].map((item) => (
            <motion.div
              key={item.title}
              whileHover={{ scale: 1.02 }}
              className={`flex items-start gap-4 p-4 rounded-xl bg-gradient-to-br ${item.bg} border ${item.border}`}
            >
              <item.icon className={`${item.color} shrink-0`} size={24} />
              <div>
                <h4 className="text-white font-bold mb-1">{item.title}</h4>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </GlassCard>

      {/* Contracts — accurate "deferred" status, not the previous "Active" fakery */}
      <GlassCard className="p-6">
        <h3 className="text-xl font-bold text-white mb-4">Council Smart Contracts</h3>
        <p className="text-xs text-zinc-500 mb-4 flex items-start gap-1.5">
          <Info size={11} className="shrink-0 mt-0.5" />
          <span>
            These contracts live in <code className="bg-black/30 px-1 rounded">contracts/future/</code>{' '}
            and are NOT in the V1 mainnet deploy. They activate when{' '}
            <code className="bg-black/30 px-1 rounded">NEXT_PUBLIC_FUTURE_FEATURES_ENABLED</code> is
            set and the contracts are deployed in a future release.
          </span>
        </p>
        <div className="space-y-3">
          {[
            { name: 'CouncilSalary', desc: 'Daily score checks, salary distribution, removal voting' },
            { name: 'CouncilElection', desc: 'Election cycles and candidate registration' },
          ].map((c) => (
            <div
              key={c.name}
              className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl"
            >
              <div>
                <div className="text-white font-bold">{c.name}</div>
                <div className="text-xs text-gray-400">{c.desc}</div>
              </div>
              <span className="text-amber-300 text-xs font-bold px-3 py-1 bg-amber-500/15 border border-amber-500/30 rounded-full">
                Deferred
              </span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
