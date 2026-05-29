'use client';

/**
 * ScoreSimulatorTab — what your ProofScore could become over time.
 *
 * The previous version implied a fixed scoring formula
 *   (transactions * 50 + votes * 100 + endorsements * 150 + badges * 200)
 * which is NOT how the Seer contract actually works. Seer's scoring is
 * operator-driven within bounded daily limits; specific point values per
 * action don't exist on-chain.
 *
 * This rewrite shows the actual on-chain bounds (max 100/call, 200/day per
 * operator pair, 300/day total, decay of 100/month) and gives the user a
 * realistic projection of where their score CAN go in N months under
 * different scenarios — rather than pretending each completed transaction
 * is worth a deterministic number of points.
 */

import { useEffect, useMemo, useState } from 'react';
import { m } from 'framer-motion';
import { Sliders, AlertCircle } from 'lucide-react';

import { GlassCard, containerVariants, itemVariants } from './shared';
import { useMonumentOverride } from '@/components/layout/MonumentOverrideContext';

// Real Seer contract constants (see contracts/Seer.sol)
const MAX_SINGLE_REWARD = 100;         // max delta per operator call
const MAX_DAILY_OPERATOR_REWARD = 200; // max per operator-subject pair per day
const MAX_DAILY_SUBJECT_DELTA = 300;   // global cap per subject per day
const DECAY_PER_MONTH = 100;           // points lost per month toward NEUTRAL
const NEUTRAL = 5000;
const MAX_SCORE = 10000;

type ActivityLevel = 'inactive' | 'low' | 'moderate' | 'high' | 'maximum';

// Realistic monthly score gain estimates based on activity intensity. These
// are projections of "how many reward calls might an operator make for this
// user", not deterministic point values per action.
const PROJECTED_MONTHLY_GAIN: Record<ActivityLevel, number> = {
  inactive: 0,
  low: 200,        // ~7 reward calls/month at avg 30 points each
  moderate: 600,   // ~12 reward calls/month at avg 50 points each
  high: 1500,      // ~25 reward calls/month at avg 60 points each
  maximum: 3000,   // hitting the daily 300-point cap most days
};

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  inactive: 'Inactive — no protocol activity',
  low: 'Low — occasional payments, no governance',
  moderate: 'Moderate — regular payments, some endorsements',
  high: 'High — frequent payments, governance votes, mentorship',
  maximum: 'Maximum — sustained activity hitting daily caps',
};

function project(currentScore: number, monthlyGain: number, months: number): number {
  // Contract: Seer.decayPerMonth=100, decayStartDays=90.
  // Decay only triggers after 90 consecutive days of inactivity.
  // In this simulator, we apply decay only when the user selects "inactive" (monthlyGain === 0).
  // Active users (any gain > 0) are assumed to reset their inactivity clock each month.
  const applyDecay = monthlyGain === 0;
  let score = currentScore;
  for (let i = 0; i < months; i++) {
    // Apply gain
    score += monthlyGain;
    // Apply decay toward NEUTRAL only when inactive
    if (applyDecay) {
      if (score > NEUTRAL) {
        score = Math.max(NEUTRAL, score - DECAY_PER_MONTH);
      } else if (score < NEUTRAL) {
        score = Math.min(NEUTRAL, score + DECAY_PER_MONTH);
      }
    }
    score = Math.max(0, Math.min(MAX_SCORE, score));
  }
  return Math.round(score);
}

// Canonical 7-tier system (mirrors ScoringConstants.sol + lib/constants.ts PROOF_SCORE_TIERS)
// Scale: 0–10,000 (on-chain Seer.getScore() scale)
function getTier(score: number): { name: string; color: string } {
  if (score >= 8000) return { name: 'Elite',      color: '#a78bfa' };  // ≥8000
  if (score >= 7000) return { name: 'Council',    color: '#22d3ee' };  // 7000–7999
  if (score >= 5600) return { name: 'Trusted',    color: '#34d399' };  // 5600–6999
  if (score >= 5400) return { name: 'Governance', color: '#38bdf8' };  // 5400–5599
  if (score >= 5000) return { name: 'Neutral',    color: '#fbbf24' };  // 5000–5399
  if (score >= 4000) return { name: 'Low Trust',  color: '#fb923c' };  // 4000–4999
  return                     { name: 'Risky',     color: '#fb7185' };  // 0–3999
}

export function ScoreSimulatorTab({ currentScore }: { currentScore: number }) {
  const [activity, setActivity] = useState<ActivityLevel>('moderate');
  const [months, setMonths] = useState(6);

  const monthlyGain = PROJECTED_MONTHLY_GAIN[activity];

  const projection = useMemo(() => {
    const points = [{ month: 0, score: currentScore }];
    for (let m = 1; m <= months; m++) {
      points.push({ month: m, score: project(currentScore, monthlyGain, m) });
    }
    return points;
  }, [currentScore, monthlyGain, months]);

  const finalScore = projection[projection.length - 1]?.score ?? currentScore;
  const tier = getTier(finalScore);
  const currentTier = getTier(currentScore);

  // Live-wire projected score into the global MonumentBackdrop so vertex
  // colour + intensity update as the user adjusts activity level / months.
  const { setOverride } = useMonumentOverride();
  useEffect(() => {
    setOverride({ score: finalScore });
    return () => setOverride(null); // restore autonomous pulse on unmount
  }, [finalScore, setOverride]);

  return (
    <m.div variants={containerVariants} initial="hidden" animate="show" className="mx-auto max-w-3xl space-y-6">
      <m.div variants={itemVariants}>
        <GlassCard className="p-8" hover={false}>
          <h2 className="mb-2 flex items-center gap-3 text-2xl font-bold text-white">
            <Sliders className="text-accent" size={28} />
            Score Projection
          </h2>
          <p className="mb-6 text-white/60">
            Estimate where your ProofScore could land over the next few months. Projections are based on
            the Seer contract&apos;s real on-chain bounds, not invented per-action point values.
          </p>

          <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-300 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-100/80">
              <strong className="text-amber-200">How scoring actually works:</strong>{' '}
              DAO-approved operators issue score adjustments based on observed activity. There&apos;s no
              fixed &quot;100 points per transaction&quot; formula. The contract caps these adjustments at{' '}
              {MAX_SINGLE_REWARD} points per call, {MAX_DAILY_OPERATOR_REWARD} per operator-pair per day,
              and {MAX_DAILY_SUBJECT_DELTA} total per day. Inactive wallets (no activity for 90+ days) lose {DECAY_PER_MONTH} points per month
              toward neutral ({NEUTRAL}); active wallets do not decay.
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">Activity level</label>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                {(Object.keys(PROJECTED_MONTHLY_GAIN) as ActivityLevel[]).map((level) => (
                  <button
                    key={level}
                    onClick={() => setActivity(level)}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium capitalize transition-colors ${
                      activity === level
                        ? 'border-accent bg-accent/15 text-accent'
                        : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-white/50">{ACTIVITY_LABELS[activity]}</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                Months ahead: <span className="text-accent">{months}</span>
              </label>
              <input
                type="range"
                min={1}
                max={24}
                value={months}
                onChange={(e) => setMonths(Number(e.target.value))}
                className="w-full accent-accent"
              />
              <div className="flex justify-between text-xs text-white/40 mt-1">
                <span>1 month</span>
                <span>2 years</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-wide text-white/50 mb-1">Today</div>
                <div className="text-3xl font-bold" style={{ color: currentTier.color }}>
                  {currentScore.toLocaleString()}
                </div>
                <div className="text-xs text-white/60 mt-1">{currentTier.name}</div>
              </div>
              <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
                <div className="text-xs uppercase tracking-wide text-accent mb-1">In {months} months</div>
                <div className="text-3xl font-bold" style={{ color: tier.color }}>
                  {finalScore.toLocaleString()}
                </div>
                <div className="text-xs text-white/60 mt-1">{tier.name}</div>
              </div>
            </div>

            {/* Simple sparkline showing the projection */}
            <div className="rounded-xl border border-white/10 bg-white/3 p-4">
              <div className="text-xs uppercase tracking-wide text-white/50 mb-3">Trajectory</div>
              <div className="flex items-end gap-1 h-32">
                {projection.map((p, i) => {
                  const height = (p.score / MAX_SCORE) * 100;
                  const t = getTier(p.score);
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-t transition-all hover:opacity-80"
                      style={{
                        height: `${Math.max(height, 2)}%`,
                        backgroundColor: t.color,
                        opacity: 0.3 + (i / projection.length) * 0.7,
                      }}
                      title={`Month ${p.month}: ${p.score}`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-white/40 mt-2">
                <span>now</span>
                <span>month {months}</span>
              </div>
            </div>

            <div className="text-xs text-white/40 italic">
              Projections are illustrative estimates based on observed operator behavior in the
              Seer contract&apos;s reward bounds. Actual score changes depend on whether DAO-approved
              operators choose to reward your specific activity. Operators can also punish — those
              adjustments aren&apos;t shown here.
            </div>
          </div>
        </GlassCard>
      </m.div>
    </m.div>
  );
}
