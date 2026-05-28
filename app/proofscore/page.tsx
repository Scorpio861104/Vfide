'use client';

import { useAccount } from 'wagmi';
import { motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import {
  Shield, Zap, Vote, Store, Star, TrendingUp,
  ArrowRight, ExternalLink, Lock,
} from 'lucide-react';
import Link from 'next/link';
import { Footer } from '@/components/layout/Footer';
import { ProofScoreVisualizer } from '@/components/trust/ProofScoreVisualizer';
import { TrustChallenges } from '@/app/proofscore/components/TrustChallenges';
import { ScoreStoryFeed } from '@/app/proofscore/components/ScoreStoryFeed';
import { TIERS, getTier, getNextTier, ProofScoreRing, ProofScoreTierProgress } from '@/components/proofscore';

/* ─── Fee curve (mirrors ProofScoreBurnRouter.sol computeFees) ────────────── */
function computeFee(score: number): number {
  const maxBps = 500;
  const minBps = 25;
  const lo = 4000;
  const hi = 8000;
  if (score >= hi) return minBps / 100;
  if (score <= lo) return maxBps / 100;
  return (maxBps - ((score - lo) * (maxBps - minBps)) / (hi - lo)) / 100;
}

/* ─── Tier config ─────────────────────────────────────────────────────────── */
const TIER_HEX: Record<string, string> = {
  Risky:      '#FF4444',
  'Low Trust':'#FFA500',
  Neutral:    '#FFD700',
  Governance: '#60A5FA',
  Trusted:    '#34D399',
  Council:    '#A78BFA',
  Elite:      '#00FF88',
};

const TIER_UNLOCKS: Record<string, { icon: React.ElementType; label: string; color: string }[]> = {
  Risky:      [],
  'Low Trust':[],
  Neutral:    [{ icon: Zap,        label: 'Fee drops to 2.5%',    color: '#FFD700' }],
  Governance: [{ icon: Vote,       label: 'DAO voting',            color: '#60A5FA' }],
  Trusted:    [{ icon: Store,      label: 'Merchant registration', color: '#34D399' }],
  Council:    [{ icon: Star,       label: 'Endorsement rights',    color: '#A78BFA' },
               { icon: Shield,     label: 'Council election',      color: '#A78BFA' }],
  Elite:      [{ icon: Zap,        label: '0.25% minimum fee',     color: '#00FF88' },
               { icon: TrendingUp, label: 'Max reputation',        color: '#00FF88' }],
};

/* ─── Tier ladder ─────────────────────────────────────────────────────────── */
import type { FC } from 'react';

const TierTrack: FC = () => {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="relative">
      <div className="absolute left-[19px] top-6 bottom-6 w-px bg-gradient-to-b from-red-500/30 via-yellow-500/30 to-green-400/30" aria-hidden="true" />
      <div className="space-y-1.5">
        {[...TIERS].reverse().map((tier, idx) => {
          const hex = TIER_HEX[tier.name] ?? '#fff';
          const unlocks = TIER_UNLOCKS[tier.name] ?? [];
          const isHov = hovered === tier.name;
          return (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.06 }}
              onMouseEnter={() => setHovered(tier.name)}
              onMouseLeave={() => setHovered(null)}
              className="relative flex items-start gap-3 rounded-xl px-3 py-2.5 transition-all duration-150"
              style={{
                background: isHov ? `${hex}0a` : 'transparent',
                border: `1px solid ${isHov ? hex + '25' : 'transparent'}`,
              }}
            >
              <div
                className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 border"
                style={{ backgroundColor: `${hex}18`, borderColor: `${hex}40` }}
              >
                <span className="text-xs">{tier.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm" style={{ color: hex }}>{tier.name}</span>
                  <span className="text-xs text-zinc-600 tabular-nums">
                    {tier.minScore.toLocaleString()}–{tier.name === 'Elite' ? '10,000' : tier.maxScore.toLocaleString()}
                  </span>
                  <span className="ml-auto text-xs font-bold tabular-nums px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${hex}15`, color: hex }}>
                    {computeFee(
                      tier.minScore + Math.floor((Math.min(tier.maxScore, 10000) - tier.minScore) / 2)
                    ).toFixed(2)}%
                  </span>
                </div>
                {unlocks.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {unlocks.map(u => (
                      <span key={u.label}
                        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${u.color}12`, color: u.color }}>
                        <u.icon size={10} aria-hidden="true" />
                        {u.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── Fee bar ──────────────────────────────────────────────────────────────── */
const FeeCurveBar: FC<{ score: number }> = ({ score }) => {
  const pct = Math.max(0, Math.min(1, (score - 4000) / 4000));
  const fee = computeFee(score);
  const hex = TIER_HEX[getTier(score).name] ?? '#fff';

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-zinc-600 px-0.5">
        <span>5.00%</span><span>0.25%</span>
      </div>
      <div className="relative h-2.5 rounded-full bg-white/5 overflow-visible">
        <div className="absolute inset-0 rounded-full opacity-20"
          style={{ background: 'linear-gradient(to right,#FF4444,#FFA500,#FFD700,#34D399,#A78BFA,#00FF88)' }} />
        <motion.div className="absolute top-0 left-0 h-full rounded-full"
          style={{ background: `linear-gradient(to right,#FF4444,${hex})` }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }} />
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-zinc-950 shadow"
          style={{ backgroundColor: hex }}
          animate={{ left: `calc(${pct * 100}% - 8px)` }}
          transition={{ duration: 0.4, ease: 'easeOut' }} />
      </div>
      <div className="text-center pt-1">
        <span className="text-xl font-black tabular-nums" style={{ color: hex }}>{fee.toFixed(2)}%</span>
        <span className="text-zinc-500 text-xs ml-1.5">fee at this score</span>
      </div>
    </div>
  );
};

/* ─── Disconnected: interactive simulator ─────────────────────────────────── */
const DisconnectedHero: FC = () => {
  const [score, setScore] = useState(5000);
  const tier = getTier(score);
  const nextTier = getNextTier(score);
  const hex = TIER_HEX[tier.name] ?? '#fff';
  const toNext = nextTier ? nextTier.minScore - score : 0;
  const shouldReduce = useReducedMotion();

  return (
    <div className="relative rounded-3xl border border-white/[0.07] bg-white/[0.02] overflow-hidden p-6 sm:p-8">
      {!shouldReduce && (
        <motion.div className="pointer-events-none absolute inset-0 -z-10"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden="true">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
            style={{ background: `radial-gradient(circle,${hex}12 0%,transparent 65%)` }} />
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Ring + progress */}
        <div className="flex flex-col items-center gap-6">
          <ProofScoreRing score={score} size={220} />
          {nextTier ? (
            <div className="w-full max-w-xs"><ProofScoreTierProgress score={score} /></div>
          ) : (
            <div className="text-xs font-bold px-3 py-1.5 rounded-full"
              style={{ backgroundColor: `${hex}15`, color: hex }}>
              Maximum tier reached
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="space-y-5">
          {/* Score label */}
          <div className="flex items-end justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Simulated score</div>
              <div className="text-4xl font-black tabular-nums" style={{ color: hex }}>
                {score.toLocaleString()}
              </div>
            </div>
            <div className="px-3 py-1.5 rounded-full text-sm font-bold"
              style={{ backgroundColor: `${hex}18`, color: hex, border: `1px solid ${hex}30` }}>
              {tier.name} {tier.icon}
            </div>
          </div>

          {/* Slider */}
          <div>
            <input type="range" min={0} max={10000} step={50} value={score}
              onChange={e => setScore(Number(e.target.value))}
              className="w-full" style={{ accentColor: hex }}
              aria-label="Simulated ProofScore" />
            <div className="flex justify-between text-xs text-zinc-700 mt-1">
              <span>0</span><span>5,000</span><span>10,000</span>
            </div>
          </div>

          {/* Fee bar */}
          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
            <div className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Transaction fee</div>
            <FeeCurveBar score={score} />
          </div>

          {/* Unlocks */}
          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4 space-y-2">
            <div className="text-xs uppercase tracking-widest text-zinc-500">Privileges at this tier</div>
            {(TIER_UNLOCKS[tier.name] ?? []).length === 0
              ? <p className="text-xs text-zinc-600">Increase score to unlock protocol privileges.</p>
              : (TIER_UNLOCKS[tier.name] ?? []).map(u => (
                  <div key={u.label} className="flex items-center gap-2 text-sm">
                    <u.icon size={14} style={{ color: u.color }} aria-hidden="true" />
                    <span style={{ color: u.color }}>{u.label}</span>
                  </div>
                ))
            }
            {nextTier && toNext > 0 && (
              <p className="pt-2 mt-2 border-t border-white/5 text-xs text-zinc-500">
                <span className="font-bold" style={{ color: TIER_HEX[nextTier.name] }}>
                  +{toNext.toLocaleString()}
                </span>{' '}points to reach {nextTier.name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Connect CTA */}
      <div className="mt-8 pt-6 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white">See your real ProofScore</p>
          <p className="text-xs text-zinc-500 mt-0.5">Your score lives on-chain in the Seer contract on Base.</p>
        </div>
        <Link href="/onboarding"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-zinc-950 bg-accent hover:bg-accent/90 transition-colors shrink-0">
          Connect wallet <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
};

/* ─── Connected view ──────────────────────────────────────────────────────── */
const ConnectedView: FC<{ address: `0x${string}` }> = ({ address }) => (
  <div className="space-y-8">
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center">
      <ProofScoreVisualizer address={address} size="large"
        showDetails showBadges showBreakdown showEndorsements />
    </motion.div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
        <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Zap size={16} className="text-accent" aria-hidden="true" /> Trust Challenges
        </h2>
        <TrustChallenges />
      </motion.div>
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
        <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp size={16} className="text-emerald-400" aria-hidden="true" /> Score Story
        </h2>
        <ScoreStoryFeed />
      </motion.div>
    </div>
  </div>
);

/* ─── Page root ───────────────────────────────────────────────────────────── */
export default function ProofScorePage() {
  const { address, isConnected } = useAccount();

  return (
    <>
      <main className="min-h-screen bg-zinc-950 md:pt-[3.5rem] text-white relative overflow-hidden">

        {/* Ambient bg */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-60 left-1/4 w-[700px] h-[700px] rounded-full opacity-[0.05]"
            style={{ background: 'radial-gradient(circle,#06b6d4 0%,transparent 70%)' }} />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full opacity-[0.04]"
            style={{ background: 'radial-gradient(circle,#a78bfa 0%,transparent 70%)' }} />
        </div>
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-[0.12]" aria-hidden="true" />

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <section className="relative pt-20 pb-10 px-4">
          <div className="container mx-auto max-w-5xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}>
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs uppercase tracking-widest text-accent mb-6">
                <Shield size={12} aria-hidden="true" /> On-chain reputation · Seer contract on Base
              </div>
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.05] mb-3">
                    Proof
                    <span className="ml-2 text-transparent bg-clip-text"
                      style={{ backgroundImage: 'linear-gradient(135deg,#06b6d4 0%,#a78bfa 100%)' }}>
                      Score
                    </span>
                  </h1>
                  <p className="text-zinc-400 max-w-lg leading-relaxed text-sm">
                    Your reputation, earned on-chain. Every payment, vault creation, and honest
                    interaction compounds into a score that directly lowers your transaction fee —
                    the protocol literally rewards honesty with cheaper transactions.
                  </p>
                </div>
                <Link href="/seer-constitution"
                  className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-accent transition-colors shrink-0 pb-1">
                  <Lock size={11} aria-hidden="true" />Seer Constitution
                  <ExternalLink size={10} aria-hidden="true" />
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Hero (live or simulator) ────────────────────────────────────── */}
        <section className="relative px-4 pb-14">
          <div className="container mx-auto max-w-5xl">
            {isConnected && address
              ? <ConnectedView address={address} />
              : <DisconnectedHero />
            }
          </div>
        </section>

        {/* ── Tier ladder + how to build ──────────────────────────────────── */}
        <section className="relative px-4 pb-20 border-t border-white/[0.04] pt-14">
          <div className="container mx-auto max-w-5xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-14">

              <div>
                <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} className="mb-7">
                  <h2 className="text-2xl font-black text-white mb-1.5">All 7 tiers</h2>
                  <p className="text-sm text-zinc-500">Score range, average fee, and unlocks.</p>
                </motion.div>
                <TierTrack />
              </div>

              <div>
                <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} className="mb-7">
                  <h2 className="text-2xl font-black text-white mb-1.5">How to build score</h2>
                  <p className="text-sm text-zinc-500">Earned from on-chain behavior. Not bought.</p>
                </motion.div>
                <div className="space-y-3">
                  {[
                    { icon: Store,      color: '#34D399', label: 'Complete transactions',          desc: 'Every on-chain payment contributes activity score.' },
                    { icon: Shield,     color: '#06b6d4', label: 'Create a CardBound Vault',       desc: 'Vault ownership signals commitment. Applies vault bonus.' },
                    { icon: Vote,       color: '#60A5FA', label: 'Participate in governance',      desc: 'Voting and proposals demonstrate active engagement.' },
                    { icon: Star,       color: '#FBBF24', label: 'Earn badges',                    desc: 'Achievements compound into on-chain proofs.' },
                    { icon: TrendingUp, color: '#A78BFA', label: 'Receive endorsements',           desc: 'Council+ users endorsing you counts as social proof.' },
                  ].map((item, i) => (
                    <motion.div key={item.label}
                      initial={{ opacity: 0, x: 16 }} whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                      className="flex items-start gap-4 rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 hover:border-white/10 transition-colors">
                      <div className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: `${item.color}15`, border: `1px solid ${item.color}28` }}>
                        <item.icon size={16} style={{ color: item.color }} aria-hidden="true" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">{item.label}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">{item.desc}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
                  viewport={{ once: true }} transition={{ delay: 0.4 }}
                  className="mt-5 rounded-xl border border-accent/20 bg-accent/[0.04] p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-white">Interactive demo</div>
                    <div className="text-xs text-zinc-500">Explore what each action does to your score.</div>
                  </div>
                  <Link href="/demo"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-accent border border-accent/30 rounded-lg px-3 py-1.5 hover:bg-accent/10 transition-colors shrink-0">
                    Open <ArrowRight size={12} aria-hidden="true" />
                  </Link>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
