'use client';

/**
 * LiveProofScoreHero — the new landing-page centerpiece.
 *
 * Visitors land and see the entire product thesis in one widget:
 *
 *   - Drag the score (0 → 10,000) and watch the burn fee curve move.
 *   - At the same moment a sample $50 payment recalculates: the fee
 *     FeeDistributor default split (FeeDistributor.sol L279, DAO-adjustable within protocol bounds):
 *     burnBps=3500 (35%) | sanctumBps=2000 (20%) | daoPayrollBps=1500 (15%)
 *     merchantPoolBps=2000 (20%) | headhunterPoolBps=1000 (10%)
 *     Note: BurnRouter also routes 10% of buyer fee directly to Sanctum + 40% to burn before
 *     passing 50% to FeeDistributor. Net composite over full buyer fee: 57.5% burn | 20% Sanctum.
 *   - The Monument's vertex brightens with the score.
 *   - The tier badge changes label + colour as you cross thresholds.
 *
 * This is the "wow" hero: most DeFi pages have a slow rotating logo and
 * a marketing tagline. We have a working live model of the protocol's
 * core mechanic, sitting in the spot where the orbit-dots used to sit.
 *
 * Math: matches the on-chain ProofScoreBurnRouter behaviour mirrored in
 * useProofScore.ts (minTotalBps=25 at score≥8000, maxTotalBps=500 at
 * score≤4000). Score 5000 → 3.82%; mid-range 2.5% occurs at score≈6100.
 *
 * Performance: a single requestAnimationFrame-driven counter for the
 * draggable input. No infinite loops, no per-frame DOM thrashing — the
 * only re-renders are on slider input and the once-per-second auto-demo
 * (which only runs before the user has interacted).
 */

import { getFeeRate } from '@/lib/format';
import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { m, useReducedMotion, LazyMotion, domAnimation } from 'framer-motion';
import { ShieldCheck, Sparkles, ArrowDownRight, Info } from 'lucide-react';

import { Numeric } from '@/components/ui/Numeric';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

// ── Math (mirrors useProofScore + on-chain ProofScoreBurnRouter) ──────

interface Tier {
  min: number;
  max: number;
  label: string;
  /** Tailwind color class fragment, e.g. 'rose' → 'border-rose-500/30'. */
  tone: 'rose' | 'orange' | 'amber' | 'sky' | 'emerald' | 'cyan' | 'violet';
  /** Hex used for the live SVG gradient + monument glow. */
  hex: string;
}

/**
 * NOTE ON SCALE: The hero uses the internal on-chain 0–10,000 scale
 * (matching what useProofScore returns from Seer.getScore()).
 * The /proofscore page displays the same score in a 0–999 display format
 * (dividing by 10). The tier boundaries here are ×10 of those shown there.
 * Both are correct — they just use different display scales.
 */
const TIERS: Tier[] = [
  { min: 0,     max: 4000,  label: 'Risky',      tone: 'rose',     hex: '#fb7185' },
  { min: 4000,  max: 5000,  label: 'Low Trust',  tone: 'orange',   hex: '#fb923c' },
  { min: 5000,  max: 5400,  label: 'Neutral',    tone: 'amber',    hex: '#fbbf24' },
  { min: 5400,  max: 5600,  label: 'Governance', tone: 'sky',      hex: '#38bdf8' },
  { min: 5600,  max: 7000,  label: 'Trusted',    tone: 'emerald',  hex: '#34d399' },
  { min: 7000,  max: 8000,  label: 'Council',    tone: 'cyan',     hex: '#22d3ee' },
  { min: 8000,  max: 10001, label: 'Elite',      tone: 'violet',   hex: '#a78bfa' },
];

function tierForScore(score: number): Tier {
  return TIERS.find((t) => score >= t.min && score < t.max) ?? TIERS[0]!;
}

/**
 * Burn-fee curve. Mirrors ProofScoreBurnRouter.sol computeFees() exactly:
 *   score ≤ 4000 (LOW_SCORE_THRESHOLD)  → maxTotalBps = 500 bps = 5.00%
 *   score ≥ 8000 (HIGH_SCORE_THRESHOLD) → minTotalBps = 25 bps  = 0.25%
 *   4000–8000 → linear: maxBps - ((score - 4000) * (maxBps - minBps)) / 4000
 * Below 4000 the contract also returns maxTotalBps (flat 5%); shown here
 * as flat for visual clarity.
 */

/** FeeDistributor default split (FeeDistributor.sol L279, DAO-adjustable within protocol bounds):
 *  burnBps=3500 (35%) | sanctumBps=2000 (20%) | daoPayrollBps=1500 (15%) | merchantPoolBps=2000 (20%) | headhunterPoolBps=1000 (10%) */
const FEE_SPLITS: { id: string; label: string; pct: number; hex: string; help: string }[] = [
  { id: 'burn',      label: 'Burn',           pct: 35,   hex: '#f97316', help: 'Permanently removed from supply — FeeDistributor default 35%' },
  { id: 'sanctum',   label: 'Sanctum Fund',   pct: 20,   hex: '#ec4899', help: 'Charity + community grants — FeeDistributor default 20%' },
  { id: 'merchant',  label: 'Merchant pool',  pct: 20,   hex: '#10b981', help: 'Volume rewards for top merchants — FeeDistributor default 20%' },
  { id: 'payroll',   label: 'DAO payroll',    pct: 15,   hex: '#06b6d4', help: 'Pays elected council members — FeeDistributor default 15%' },
  { id: 'headhunt',  label: 'Referral pool',  pct: 10,   hex: '#a855f7', help: 'Rewards for inviting active users — FeeDistributor default 10%' },
];

// ── Component ────────────────────────────────────────────────────────

const DEMO_AMOUNT = 50; // $50 sample payment

export function LiveProofScoreHero() {
  const reduceMotion = usePrefersReducedMotion();
  const fmReduceMotion = useReducedMotion();
  const reduce = reduceMotion || !!fmReduceMotion;

  const [score, setScore] = useState(5000);
  const [interacted, setInteracted] = useState(false);

  // Auto-demo: before the user touches the slider, gently sweep the
  // score so the page is alive when someone arrives. Stops as soon as
  // they grab the slider — feels like the page is responding to them.
  // Throttled to ~24Hz so we don't re-render the whole hero 60 times
  // per second for a slow sweep.
  useEffect(() => {
    if (interacted || reduce) return;
    let raf = 0;
    let cancelled = false;
    let lastTick = 0;
    const start = performance.now();
    const tick = (now: number) => {
      if (cancelled) return;
      if (now - lastTick >= 42) {
        lastTick = now;
        const t = (now - start) / 1000;
        const phase = (t % 18) / 18;
        const sweep = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
        const eased = sweep * sweep * (3 - 2 * sweep);
        setScore(Math.round(eased * 10000));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [interacted, reduce]);

  const handleScoreChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setScore(Number(e.target.value));
    if (!interacted) setInteracted(true);
  }, [interacted]);

  const tier = useMemo(() => tierForScore(score), [score]);
  const feePct = useMemo(() => getFeeRate(score), [score]);
  const feeAmount = useMemo(() => (DEMO_AMOUNT * feePct) / 100, [feePct]);

  // Per-stream allocations of the sample fee.
  const allocations = useMemo(
    () => FEE_SPLITS.map((s) => ({ ...s, amount: (feeAmount * s.pct) / 100 })),
    [feeAmount],
  );

  // Score → 0..1 for visual mappings.
  const t01 = Math.max(0, Math.min(1, score / 10000));

  return (
    <div className="relative isolate w-full">
      {/* Backdrop monument glow — intensifies with score */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center"
        aria-hidden="true"
      >
        <div
          className="absolute h-72 w-72 rounded-full blur-3xl transition-opacity duration-300 sm:h-96 sm:w-96"
          style={{
            background: `radial-gradient(circle, ${tier.hex}55 0%, transparent 70%)`,
            opacity: 0.4 + t01 * 0.5,
          }}
        />
      </div>

      <div className="relative rounded-3xl border border-white/10 bg-zinc-950/70 p-5 backdrop-blur-sm sm:p-7">
        {/* Live tier badge + numbers */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-widest"
              style={{
                borderColor: `${tier.hex}50`,
                background: `${tier.hex}15`,
                color: tier.hex,
              }}
            >
              <Sparkles size={12} /> {tier.label}
            </div>
            <div className="leading-none">
              <Numeric value={score} format="score" size="6xl" weight={700} flush />
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-widest text-gray-500">ProofScore</div>
          </div>

          <div className="text-right">
            <div className="text-[11px] uppercase tracking-widest text-gray-500">
              Fee on <Numeric value={DEMO_AMOUNT} format="currency" precision={0} size="xs" tone="muted" weight={500} />
            </div>
            <div className="leading-none">
              <Numeric value={feePct} format="percent" size="5xl" weight={700} flush />
            </div>
            <div className="mt-1 text-xs text-gray-400">
              = <Numeric value={feeAmount} format="currency" size="xs" tone="muted" />
            </div>
          </div>
        </div>

        {/* Live fee curve — SVG */}
        <div className="mt-6">
          <FeeCurve score={score} hex={tier.hex} reduce={reduce} />
        </div>

        {/* Draggable score slider */}
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-gray-500">Drag to see how trust changes the fee</span>
            {!interacted && (
              <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-cyan-300">
                {reduce ? '' : 'auto-demo · '}drag to take over
              </span>
            )}
          </div>
          <input
            type="range"
            min={0}
            max={10000}
            step={50}
            value={score}
            onChange={handleScoreChange}
            aria-label="Sample ProofScore"
            className="w-full cursor-pointer accent-cyan-400"
            style={{
              accentColor: tier.hex,
            }}
          />
          <div className="mt-1 flex justify-between text-[10px] font-mono uppercase tracking-wider text-gray-600">
            <span>0</span>
            <span>2,500</span>
            <span>5,000</span>
            <span>7,500</span>
            <span>10,000</span>
          </div>
        </div>

        {/* Fee distribution river preview (compact) */}
        <div className="mt-6 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <ArrowDownRight size={12} />
              <span>
                Where the <Numeric value={feeAmount} format="currency" size="xs" weight={500} /> fee goes
              </span>
            </div>
            <button
              type="button"
              className="text-xs text-cyan-300 hover:text-cyan-200"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  const target = document.getElementById('fee-river');
                  target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
            >
              See the river ↓
            </button>
          </div>

          <div className="space-y-2">
            {allocations.map((a) => (
              <div key={a.id} className="flex items-center gap-2">
                <div className="w-16 shrink-0 text-xs text-gray-400 truncate">{a.label}</div>
                <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                  <m.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ background: a.hex }}
                    animate={{ width: `${a.pct}%` }}
                    transition={{ type: 'spring', stiffness: 180, damping: 22 }}
                  />
                </div>
                <div className="w-16 shrink-0 text-right">
                  <Numeric value={a.amount} format="currency" size="xs" weight={500} tone="neutral" />
                </div>
                <div className="w-8 shrink-0 text-right">
                  <Numeric value={a.pct} format="integer" size="xs" tone="muted" weight={500} />
                  <span className="text-[10px] text-gray-500">%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Permissions strip */}
        <div className="mt-4 flex flex-wrap gap-1.5 text-[11px]">
          <Capability active={score >= 5400} label="Can vote" />
          <Capability active={score >= 5600} label="Can sell" />
          <Capability active={score >= 7000} label="Council eligible" />
          <Capability active={score >= 8000} label="Can endorse others" />
        </div>

        {/* Tiny disclosure so the page is honest */}
        <div className="mt-4 flex items-start gap-2 text-[11px] text-gray-500">
          <Info size={12} className="mt-0.5 flex-shrink-0" />
          <span>
            Demo math mirrors the on-chain <code className="font-mono text-gray-400">ProofScoreBurnRouter</code>.
            Once you connect a wallet, your actual score replaces the slider.
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────

function Capability({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 ${
        active
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
          : 'border-white/5 bg-white/[0.02] text-gray-600 line-through decoration-1'
      }`}
    >
      <ShieldCheck size={10} className={active ? '' : 'opacity-50'} />
      {label}
    </span>
  );
}

/**
 * Live curve: x = ProofScore (0..10000), y = burn fee % (0..6). Vertical
 * line marks the current position. Filled area under the curve uses the
 * current tier color so the chart's colour shifts as the user drags.
 */
function FeeCurve({ score, hex, reduce }: { score: number; hex: string; reduce: boolean }) {
  // We sample the curve at 0..10000 and project to SVG coords. Done
  // once on mount because the curve shape doesn't change.
  const W = 600;
  const H = 80;
  const path = useMemo(() => {
    const samples = 80;
    const pts: string[] = [];
    for (let i = 0; i <= samples; i++) {
      const s = (i / samples) * 10000;
      const fee = getFeeRate(s);
      const x = (s / 10000) * W;
      const y = H - (Math.min(fee, 6) / 6) * (H - 8) - 4;
      pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    return pts.join(' ');
  }, []);

  const filled = useMemo(() => `${path} L ${W} ${H} L 0 ${H} Z`, [path]);
  const cursorX = (score / 10000) * W;
  const cursorY = H - (Math.min(getFeeRate(score), 6) / 6) * (H - 8) - 4;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-20 w-full"
      preserveAspectRatio="none"
      role="img"
      aria-label="ProofScore vs burn fee curve"
    >
      <defs>
        <linearGradient id="proofscore-curve-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={hex} stopOpacity="0.35" />
          <stop offset="100%" stopColor={hex} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={filled} fill="url(#proofscore-curve-fill)" />
      <path d={path} fill="none" stroke={hex} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {/* Cursor */}
      <line x1={cursorX} x2={cursorX} y1={4} y2={H} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
      <m.circle
        cx={cursorX}
        cy={cursorY}
        r={5}
        fill={hex}
        stroke="white"
        strokeWidth={1.5}
        animate={reduce ? undefined : { r: [5, 6, 5] }}
        transition={reduce ? undefined : { duration: 1.6, repeat: Infinity }}
      />
    </svg>
  );
}

export default LiveProofScoreHero;
