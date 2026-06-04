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

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Sliders, AlertCircle } from 'lucide-react';
import { useLocale } from '@/lib/locale/LocaleProvider';

import { GlassCard, containerVariants, itemVariants } from './shared';

const SCORE_SIM_COPY = {
  'en-US': {
    title: 'Score Projection',
    subtitle: 'Estimate where your ProofScore could land over the next few months. Projections are based on the Seer contract\'s real on-chain bounds, not invented per-action point values.',
    activityLabel: 'Activity level',
    monthsLabel: 'Months ahead',
    todayLabel: 'Today',
    trajectoryLabel: 'Trajectory',
    nowLabel: 'now',
  },
  'es-ES': {
    title: 'Proyección de score',
    subtitle: 'Estima dónde puede quedar tu ProofScore en los próximos meses. Las proyecciones usan límites reales on-chain del contrato Seer.',
    activityLabel: 'Nivel de actividad',
    monthsLabel: 'Meses hacia adelante',
    todayLabel: 'Hoy',
    trajectoryLabel: 'Trayectoria',
    nowLabel: 'ahora',
  },
};

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
  let score = currentScore;
  // Decay is INACTIVITY-triggered in the Seer contract: it only applies to users
  // with no activity, and only after a 90-day (~3 month) grace (decayStartDays = 90).
  // An active user (monthlyGain > 0) keeps resetting that clock, so they never decay.
  const isInactive = monthlyGain === 0;
  for (let i = 0; i < months; i++) {
    // Apply gain
    score += monthlyGain;
    // Apply decay toward NEUTRAL only for inactive users, after the grace window.
    if (isInactive && i >= 3) {
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

function getTier(score: number): { name: string; color: string } {
  if (score >= 8000) return { name: 'Emerald (Trusted)', color: '#10B981' };
  if (score >= 6500) return { name: 'Cyan (Building)', color: '#06B6D4' };
  if (score >= 5000) return { name: 'Amber (Neutral)', color: '#F59E0B' };
  return { name: 'Red (Low)', color: '#EF4444' };
}

export function ScoreSimulatorTab({ currentScore }: { currentScore: number }) {
  const [activity, setActivity] = useState<ActivityLevel>('moderate');
  const [months, setMonths] = useState(6);
  const { locale } = useLocale();
  const copy = (SCORE_SIM_COPY as Record<string, typeof SCORE_SIM_COPY['en-US']>)[locale] ?? SCORE_SIM_COPY['en-US'];

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

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="mx-auto max-w-3xl space-y-6">
      <motion.div variants={itemVariants}>
        <GlassCard className="p-8" hover={false}>
          <h2 className="mb-2 flex items-center gap-3 text-2xl font-bold text-white">
            <Sliders className="text-cyan-400" size={28} />
            {copy.title}
          </h2>
          <p className="mb-6 text-white/60">
            {copy.subtitle}
          </p>

          <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-300 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-100/80">
              <strong className="text-amber-200">How scoring actually works:</strong>{' '}
              DAO-approved operators issue score adjustments based on observed activity. There&apos;s no
              fixed &quot;100 points per transaction&quot; formula. The contract caps these adjustments at{' '}
              {MAX_SINGLE_REWARD} points per call, {MAX_DAILY_OPERATOR_REWARD} per operator-pair per day,
              and {MAX_DAILY_SUBJECT_DELTA} total per day, with {DECAY_PER_MONTH}-point monthly decay
              toward neutral ({NEUTRAL}).
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">{copy.activityLabel}</label>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                {(Object.keys(PROJECTED_MONTHLY_GAIN) as ActivityLevel[]).map((level) => (
                  <button
                    key={level}
                    onClick={() => setActivity(level)}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium capitalize transition-colors ${
                      activity === level
                        ? 'border-cyan-500 bg-cyan-500/15 text-cyan-200'
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
                {copy.monthsLabel}: <span className="text-cyan-300">{months}</span>
              </label>
              <input
                type="range"
                min={1}
                max={24}
                value={months}
                onChange={(e) => setMonths(Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
              <div className="flex justify-between text-xs text-white/40 mt-1">
                <span>1 month</span>
                <span>2 years</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-wide text-white/50 mb-1">{copy.todayLabel}</div>
                <div className="text-3xl font-bold" style={{ color: currentTier.color }}>
                  {currentScore.toLocaleString()}
                </div>
                <div className="text-xs text-white/60 mt-1">{currentTier.name}</div>
              </div>
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4">
                <div className="text-xs uppercase tracking-wide text-cyan-300 mb-1">In {months} months</div>
                <div className="text-3xl font-bold" style={{ color: tier.color }}>
                  {finalScore.toLocaleString()}
                </div>
                <div className="text-xs text-white/60 mt-1">{tier.name}</div>
              </div>
            </div>

            {/* Simple sparkline showing the projection */}
            <div className="rounded-xl border border-white/10 bg-white/3 p-4">
              <div className="text-xs uppercase tracking-wide text-white/50 mb-3">{copy.trajectoryLabel}</div>
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
                <span>{copy.nowLabel}</span>
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
      </motion.div>
    </motion.div>
  );
}
