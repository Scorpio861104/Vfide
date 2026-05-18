'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Zap, Vote, ShoppingCart, Star, TrendingUp, TrendingDown, Info } from 'lucide-react';

// ── Tier + fee helpers (mirrors useProofScore fallback logic) ──────────────────

interface SimTier {
  label: string;
  min: number;
  max: number;
  color: string;
  glowColor: string;
  icon: string;
  canVote: boolean;
  canMerchant: boolean;
  canCouncil: boolean;
  canEndorse: boolean;
}

const SIM_TIERS: SimTier[] = [
  { label: 'Risky',      min: 0,     max: 3500,  color: '#FF4444', glowColor: '#FF444440', icon: '⚠️', canVote: false, canMerchant: false, canCouncil: false, canEndorse: false },
  { label: 'Low Trust',  min: 3500,  max: 5000,  color: '#FFA500', glowColor: '#FFA50040', icon: '🔶', canVote: false, canMerchant: false, canCouncil: false, canEndorse: false },
  { label: 'Neutral',    min: 5000,  max: 5400,  color: '#FFD700', glowColor: '#FFD70040', icon: '🟡', canVote: false, canMerchant: false, canCouncil: false, canEndorse: false },
  { label: 'Governance', min: 5400,  max: 5600,  color: '#60A5FA', glowColor: '#60A5FA40', icon: '🗳️', canVote: true,  canMerchant: false, canCouncil: false, canEndorse: false },
  { label: 'Trusted',    min: 5600,  max: 7000,  color: '#34D399', glowColor: '#34D39940', icon: '✅', canVote: true,  canMerchant: true,  canCouncil: false, canEndorse: false },
  { label: 'Council',    min: 7000,  max: 8000,  color: '#A78BFA', glowColor: '#A78BFA40', icon: '⭐', canVote: true,  canMerchant: true,  canCouncil: true,  canEndorse: false },
  { label: 'Elite',      min: 8000,  max: 10001, color: '#00FF88', glowColor: '#00FF8840', icon: '🏆', canVote: true,  canMerchant: true,  canCouncil: true,  canEndorse: true  },
];

function getTier(score: number): SimTier {
  for (let i = SIM_TIERS.length - 1; i >= 0; i--) {
    if (score >= (SIM_TIERS[i]?.min ?? 0)) return SIM_TIERS[i]!;
  }
  return SIM_TIERS[0]!;
}

function getNextTier(score: number): SimTier | null {
  for (const t of SIM_TIERS) {
    if (score < t.min) return t;
  }
  return null;
}

function getFee(score: number): number {
  if (score >= 8000) return 0.25;
  if (score >= 7000) return 1.0;
  if (score >= 5000) return 2.5;
  if (score >= 4000) return 3.5;
  return 5.0;
}

// ── Boost / Risk tips ─────────────────────────────────────────────────────────

const BOOST_TIPS = [
  { icon: ShoppingCart, color: '#34D399', label: 'Complete transactions',      points: '+activity score' },
  { icon: Vote,         color: '#60A5FA', label: 'Vote on governance proposals', points: '+governance pts'  },
  { icon: Star,         color: '#FBBF24', label: 'Earn badges & achievements',  points: '+badge bonus'     },
  { icon: Shield,       color: '#A78BFA', label: 'Create & maintain a vault',   points: '+vault bonus'     },
  { icon: Zap,          color: '#F97316', label: 'Level up XP (up to Lv 15)',   points: '+100 per level'   },
  { icon: TrendingUp,   color: '#34D399', label: 'Get endorsed by Elite users', points: '+endorsement pts' },
  { icon: ShoppingCart, color: '#22D3EE', label: 'Register as a merchant',      points: '+merchant bonus'  },
];

const RISK_TIPS = [
  { icon: TrendingDown, color: '#FF4444', label: 'Disputed / failed transfers',  effect: 'Score penalty'          },
  { icon: TrendingDown, color: '#FF4444', label: 'Transaction reversals',        effect: 'Score penalty'          },
  { icon: TrendingDown, color: '#FFA500', label: 'Policy violations',            effect: 'Permanent XP reduction' },
  { icon: TrendingDown, color: '#FFA500', label: 'Inactivity over time',         effect: 'Activity pts decay'     },
  { icon: TrendingDown, color: '#FF4444', label: 'Losing all endorsements',      effect: 'Endorsement pts lost'   },
  { icon: Info,         color: '#6B7280', label: 'Council seat removal',         effect: 'Council pts forfeited'  },
];

// ── Main component ─────────────────────────────────────────────────────────────

export function ProofScoreSimulator() {
  const [score, setScore] = useState(5000);

  const tier     = getTier(score);
  const nextTier = getNextTier(score);
  const fee      = getFee(score);
  const progress = nextTier
    ? ((score - tier.min) / (nextTier.min - tier.min)) * 100
    : 100;
  const pointsToNext = nextTier ? nextTier.min - score : 0;

  const radius        = 54;
  const circumference = 2 * Math.PI * radius;
  const dashOffset    = circumference * (1 - score / 10000);

  return (
    <div className="space-y-6">
      {/* ── Simulator card ── */}
      <div className="rounded-2xl border border-white/10 bg-white/3 p-6">
        <h2 className="text-xl font-bold text-white mb-1">Score Simulator</h2>
        <p className="text-sm text-white/50 mb-6">
          Drag the slider to explore tiers, fees, and permissions at any score.
        </p>

        <div className="flex flex-col sm:flex-row gap-8 items-center">
          {/* Ring */}
          <div className="relative flex-shrink-0 flex items-center justify-center" style={{ width: 140, height: 140 }}>
            {/* Glow */}
            <div
              className="absolute inset-0 rounded-full blur-2xl opacity-25 transition-colors duration-500"
              style={{ backgroundColor: tier.color }}
            />
            <svg width={140} height={140} className="-rotate-90 absolute">
              <circle cx={70} cy={70} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
              <motion.circle
                cx={70} cy={70} r={radius}
                fill="none"
                stroke={tier.color}
                strokeWidth={10}
                strokeLinecap="round"
                strokeDasharray={circumference}
                animate={{ strokeDashoffset: dashOffset }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                style={{ filter: `drop-shadow(0 0 6px ${tier.color})` }}
              />
            </svg>
            <div className="relative text-center z-10">
              <motion.div
                key={score}
                className="text-3xl font-black"
                style={{ color: tier.color }}
              >
                {score.toLocaleString()}
              </motion.div>
              <div className="text-[11px] font-semibold uppercase tracking-widest mt-0.5" style={{ color: tier.color, opacity: 0.75 }}>
                {tier.icon} {tier.label}
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 space-y-3 w-full">
            {/* Fee chip */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-white/50">Transfer fee</span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={fee}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="text-xl font-black"
                  style={{ color: tier.color }}
                >
                  {fee.toFixed(2)}%
                </motion.span>
              </AnimatePresence>
            </div>

            {/* Permissions */}
            <div className="flex flex-wrap gap-2">
              {tier.canVote && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-400/15 text-blue-300 border border-blue-400/30">🗳️ Voting</span>
              )}
              {tier.canMerchant && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-400/15 text-amber-300 border border-amber-400/30">🛒 Merchant</span>
              )}
              {tier.canCouncil && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-400/15 text-purple-300 border border-purple-400/30">⭐ Council</span>
              )}
              {tier.canEndorse && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-400/15 text-emerald-300 border border-emerald-400/30">✅ Endorse</span>
              )}
              {!tier.canVote && !tier.canMerchant && (
                <span className="text-xs text-white/30">No permissions yet — raise your score</span>
              )}
            </div>

            {/* Progress to next tier */}
            {nextTier && (
              <div>
                <div className="flex justify-between text-xs text-white/40 mb-1">
                  <span>{tier.label}</span>
                  <span>{nextTier.label} at {nextTier.min.toLocaleString()}</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: tier.color }}
                    animate={{ width: `${Math.min(progress, 100)}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <div className="text-xs text-white/40 mt-1">
                  <span className="font-semibold" style={{ color: tier.color }}>
                    {pointsToNext.toLocaleString()} pts
                  </span>{' '}
                  to unlock{' '}
                  <span className="font-semibold" style={{ color: nextTier.color }}>{nextTier.label}</span>
                  {nextTier.label === 'Governance' && ' (enables voting)'}
                  {nextTier.label === 'Trusted' && ' (enables merchant + lower fee)'}
                  {nextTier.label === 'Council' && ' (enables council eligibility)'}
                  {nextTier.label === 'Elite' && ' (0.25% fee + endorse others)'}
                </div>
              </div>
            )}

            {!nextTier && (
              <div className="text-xs font-semibold text-emerald-400">
                🏆 Maximum tier — 0.25% fee forever
              </div>
            )}
          </div>
        </div>

        {/* Slider */}
        <div className="mt-6">
          <div className="flex justify-between text-xs text-white/30 mb-2">
            <span>0</span>
            <span>5,000</span>
            <span>10,000</span>
          </div>
          <input
            type="range"
            min={0}
            max={10000}
            step={50}
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, ${tier.color} ${score / 100}%, rgba(255,255,255,0.08) ${score / 100}%)`,
            }}
          />
          {/* Preset buttons */}
          <div className="flex flex-wrap gap-2 mt-4">
            {[
              { label: 'New User', value: 5000 },
              { label: 'Governance', value: 5400 },
              { label: 'Trusted', value: 5600 },
              { label: 'Council', value: 7000 },
              { label: 'Elite', value: 8000 },
            ].map(({ label, value }) => (
              <button
                key={label}
                onClick={() => setScore(value)}
                className="px-3 py-1 rounded-lg text-xs font-semibold border transition-colors duration-150"
                style={
                  score === value
                    ? { backgroundColor: `${tier.color}20`, color: tier.color, borderColor: `${tier.color}60` }
                    : { backgroundColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', borderColor: 'rgba(255,255,255,0.1)' }
                }
              >
                {label} ({value.toLocaleString()})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tips ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Boost tips */}
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-emerald-400" />
            <h3 className="text-base font-bold text-emerald-400">How to raise your score</h3>
          </div>
          <ul className="space-y-3">
            {BOOST_TIPS.map(({ icon: Icon, color, label, points }) => (
              <li key={label} className="flex items-start gap-3">
                <div
                  className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${color}18`, border: `1px solid ${color}40` }}
                >
                  <Icon size={14} style={{ color }} />
                </div>
                <div>
                  <div className="text-sm text-white/80">{label}</div>
                  <div className="text-xs mt-0.5" style={{ color }}>{points}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Risk tips */}
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown size={18} className="text-red-400" />
            <h3 className="text-base font-bold text-red-400">What lowers your score</h3>
          </div>
          <ul className="space-y-3">
            {RISK_TIPS.map(({ icon: Icon, color, label, effect }) => (
              <li key={label} className="flex items-start gap-3">
                <div
                  className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${color}18`, border: `1px solid ${color}40` }}
                >
                  <Icon size={14} style={{ color }} />
                </div>
                <div>
                  <div className="text-sm text-white/80">{label}</div>
                  <div className="text-xs text-red-400/70 mt-0.5">{effect}</div>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-white/30 leading-relaxed">
            Tip: Policy violations permanently reduce your XP level, which also reduces your effective ProofScore.
          </p>
        </div>
      </div>
    </div>
  );
}
