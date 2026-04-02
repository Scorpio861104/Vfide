/**
 * ProofScore Visual System — The emotional center of VFIDE
 * 
 * ProofScore isn't just a number. It's your reputation, your fee tier,
 * your standing in the ecosystem. It should FEEL important.
 * 
 * Components:
 *   <ProofScoreRing score={4500} />           — Animated ring with tier glow
 *   <ProofScoreTierProgress score={4500} />   — Progress to next tier
 *   <ProofScoreBadge score={4500} />          — Compact inline badge
 *   <ProofScoreLevelUp previous={3999} current={4000} /> — Celebration on tier change
 *   <ProofScoreBreakdown score={4500} />      — What contributes to your score
 */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, TrendingUp, Star, Award, Zap, Users, ShoppingCart, Vote, Sparkles } from 'lucide-react';

// ── Tier System ─────────────────────────────────────────────────────────────

export interface Tier {
  name: string;
  minScore: number;
  maxScore: number;
  feeBps: number;        // Basis points (100 = 1%)
  color: string;
  glowColor: string;
  bgGradient: string;
  icon: string;
}

export const TIERS: Tier[] = [
  { name: 'Newcomer',   minScore: 0,    maxScore: 999,   feeBps: 100, color: '#71717a', glowColor: '#71717a40', bgGradient: 'from-zinc-500/20 to-zinc-600/20',    icon: '○' },
  { name: 'Verified',   minScore: 1000, maxScore: 2999,  feeBps: 75,  color: '#22d3ee', glowColor: '#22d3ee40', bgGradient: 'from-cyan-500/20 to-blue-500/20',    icon: '◉' },
  { name: 'Trusted',    minScore: 3000, maxScore: 4999,  feeBps: 50,  color: '#a78bfa', glowColor: '#a78bfa40', bgGradient: 'from-purple-500/20 to-violet-500/20', icon: '◈' },
  { name: 'Advocate',   minScore: 5000, maxScore: 6999,  feeBps: 35,  color: '#34d399', glowColor: '#34d39940', bgGradient: 'from-emerald-500/20 to-green-500/20', icon: '◆' },
  { name: 'Guardian',   minScore: 7000, maxScore: 7999,  feeBps: 30,  color: '#60a5fa', glowColor: '#60a5fa40', bgGradient: 'from-blue-500/20 to-indigo-500/20',  icon: '⬡' },
  { name: 'Champion',   minScore: 8000, maxScore: 10000, feeBps: 25,  color: '#fbbf24', glowColor: '#fbbf2440', bgGradient: 'from-amber-400/20 to-orange-500/20', icon: '★' },
];

export function getTier(score: number): Tier {
  return TIERS.findLast(t => score >= t.minScore) || TIERS[0];
}

export function getNextTier(score: number): Tier | null {
  const currentIdx = TIERS.findLastIndex(t => score >= t.minScore);
  return currentIdx < TIERS.length - 1 ? TIERS[currentIdx + 1] : null;
}

// ── ProofScore Ring ─────────────────────────────────────────────────────────

export function ProofScoreRing({ score, size = 180, showLabel = true }: {
  score: number;
  size?: number;
  showLabel?: boolean;
}) {
  const tier = getTier(score);
  const nextTier = getNextTier(score);
  const progress = nextTier
    ? (score - tier.minScore) / (nextTier.minScore - tier.minScore)
    : 1;

  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Glow */}
      <div
        className="absolute inset-0 rounded-full blur-2xl opacity-30"
        style={{ backgroundColor: tier.color }}
      />

      {/* Background ring */}
      <svg width={size} height={size} className="absolute">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={8}
        />
      </svg>

      {/* Progress ring */}
      <svg width={size} height={size} className="absolute -rotate-90">
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={tier.color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
      </svg>

      {/* Center content */}
      <div className="relative text-center z-10">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
          className="text-3xl font-black"
          style={{ color: tier.color }}
        >
          {score.toLocaleString()}
        </motion.div>
        {showLabel && (
          <div className="text-xs text-gray-400 mt-0.5 font-bold uppercase tracking-wider">
            {tier.name}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tier Progress Bar ───────────────────────────────────────────────────────

export function ProofScoreTierProgress({ score }: { score: number }) {
  const tier = getTier(score);
  const nextTier = getNextTier(score);

  if (!nextTier) {
    return (
      <div className="bg-amber-400/10 border border-amber-400/30 rounded-xl p-4 text-center">
        <div className="text-amber-400 font-bold flex items-center justify-center gap-2">
          <Sparkles size={16} /> Maximum tier reached
        </div>
        <div className="text-gray-400 text-xs mt-1">You're in the top tier — 0.25% fee rate</div>
      </div>
    );
  }

  const pointsNeeded = nextTier.minScore - score;
  const progress = ((score - tier.minScore) / (nextTier.minScore - tier.minScore)) * 100;
  const feeDrop = ((tier.feeBps - nextTier.feeBps) / 100).toFixed(2);

  return (
    <div className={`bg-gradient-to-r ${tier.bgGradient} border border-white/10 rounded-xl p-4`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg" style={{ color: tier.color }}>{tier.icon}</span>
          <span className="text-white font-bold text-sm">{tier.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">{nextTier.icon}</span>
          <span className="text-gray-400 font-bold text-sm">{nextTier.name}</span>
        </div>
      </div>

      <div className="w-full h-2.5 bg-black/30 rounded-full overflow-hidden mb-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: tier.color }}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">
          <span className="font-bold" style={{ color: tier.color }}>{pointsNeeded.toLocaleString()}</span> points to next tier
        </span>
        <span className="text-emerald-400 font-bold">
          Unlocks {feeDrop}% lower fee
        </span>
      </div>
    </div>
  );
}

// ── Compact Badge ───────────────────────────────────────────────────────────

export function ProofScoreBadge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const tier = getTier(score);

  const sizes = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-3 py-1 text-sm gap-1.5',
    lg: 'px-4 py-1.5 text-base gap-2',
  };

  return (
    <div
      className={`inline-flex items-center font-bold rounded-lg ${sizes[size]}`}
      style={{
        backgroundColor: `${tier.color}15`,
        border: `1px solid ${tier.color}40`,
        color: tier.color,
      }}
    >
      <Shield size={size === 'sm' ? 10 : size === 'md' ? 14 : 16} />
      <span>{score.toLocaleString()}</span>
    </div>
  );
}

// ── Level Up Celebration ────────────────────────────────────────────────────

export function ProofScoreLevelUp({ previous, current, onDismiss }: {
  previous: number;
  current: number;
  onDismiss: () => void;
}) {
  const oldTier = getTier(previous);
  const newTier = getTier(current);

  if (oldTier.name === newTier.name) return null; // No tier change

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onDismiss}
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          onClick={e => e.stopPropagation()}
          className="text-center max-w-sm"
        >
          {/* Glow */}
          <div className="absolute inset-0 rounded-full blur-[100px] opacity-20" style={{ backgroundColor: newTier.color }} />

          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 0.5, repeat: 3 }}
            className="text-6xl mb-4"
          >
            {newTier.icon}
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">Tier Promotion</div>
            <h2 className="text-3xl font-black text-white mb-2">
              <span style={{ color: newTier.color }}>{newTier.name}</span>
            </h2>
            <p className="text-gray-400 mb-4">
              ProofScore {current.toLocaleString()} • Fee rate now {(newTier.feeBps / 100).toFixed(2)}%
            </p>

            <div className="flex items-center justify-center gap-3 text-sm">
              <span className="text-gray-500">{oldTier.name} {oldTier.icon}</span>
              <span className="text-gray-600">→</span>
              <span className="font-bold" style={{ color: newTier.color }}>{newTier.name} {newTier.icon}</span>
            </div>
          </motion.div>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            onClick={onDismiss}
            className="mt-8 px-8 py-3 rounded-xl font-bold text-white"
            style={{ backgroundColor: newTier.color }}
          >
            Continue
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Score Breakdown ─────────────────────────────────────────────────────────

interface ScoreSource {
  label: string;
  points: number;
  icon: typeof Shield;
  color: string;
}

export function ProofScoreBreakdown({ sources }: { sources: ScoreSource[] }) {
  const total = sources.reduce((s, src) => s + src.points, 0);

  return (
    <div className="space-y-2">
      {sources.sort((a, b) => b.points - a.points).map((source, i) => {
        const pct = total > 0 ? (source.points / total) * 100 : 0;
        return (
          <motion.div
            key={source.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3"
          >
            <source.icon size={16} className={source.color} />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-300 text-sm">{source.label}</span>
                <span className="text-white font-mono text-sm font-bold">+{source.points.toLocaleString()}</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, delay: 0.2 + i * 0.05 }}
                  className={`h-full rounded-full ${source.color.replace('text-', 'bg-')}`}
                />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Example usage of breakdown ──────────────────────────────────────────────

export const EXAMPLE_SOURCES: ScoreSource[] = [
  { label: 'Transactions completed', points: 1800, icon: ShoppingCart, color: 'text-cyan-400' },
  { label: 'Governance participation', points: 900, icon: Vote, color: 'text-purple-400' },
  { label: 'Peer endorsements', points: 600, icon: Users, color: 'text-emerald-400' },
  { label: 'Account age bonus', points: 500, icon: Shield, color: 'text-blue-400' },
  { label: 'Merchant activity', points: 400, icon: Star, color: 'text-amber-400' },
  { label: 'Quest completions', points: 300, icon: Zap, color: 'text-orange-400' },
];
