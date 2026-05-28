'use client';

/**
 * FeeFlowRiver — live SVG of the canonical 40/10/25/15/10 fee split.
 *
 * What it shows: transactions arrive on the left as particles, get
 * struck by the split point in the middle, and fan out into five
 * labeled pools on the right with running totals. The pools are the
 * five real contracts that inherit ServicePool in the on-chain
 * FeeDistributor:
 *
 *   40% burn        → permanently removed (ProofScoreBurnRouter: burnAmount = totalFee * 40 / 100)
 *   10% Sanctum     → charity + community grants  (sanctumAmount = totalFee * 10 / 100)
 *   25% DAO payroll → elected council pay         (ecosystemShare * FeeDistributor.daoPayrollBps 50%)
 *   15% merchant    → top-merchant volume rewards (ecosystemShare * merchantPoolBps 30%)
 *   10% headhunter  → invite-people rewards       (ecosystemShare * headhunterPoolBps 20%)
 *
 * Why this matters on the landing page: most "fee distribution" charts
 * are a static pie hidden in a whitepaper. Showing the splits as a
 * river of live particles is more honest about what the protocol does
 * with the money than any tagline.
 *
 * Data source: when wagmi is configured + a Transfer event is available
 * on the VFIDE token, particles spawn at the real event amount and
 * cadence (subject to a sane ceiling). When there's no on-chain
 * activity (RPC down, contract not deployed, nothing happening), we
 * spawn synthetic particles so the page never looks dead — a single
 * caveat line discloses that the live numbers are illustrative until
 * mainnet traffic is real.
 *
 * Perf: a single requestAnimationFrame loop. Particles are a flat array
 * that we mutate in place; React only re-renders the pool totals (a
 * setState we throttle to ~10/s). The SVG paths are static; particles
 * are absolutely-positioned circles inside it. No layout thrash.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Activity } from 'lucide-react';

import { Numeric } from '@/components/ui/Numeric';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

type PoolId = 'burn' | 'sanctum' | 'merchant' | 'payroll' | 'headhunt';

interface Pool {
  id: PoolId;
  label: string;
  short: string;
  pct: number;
  hex: string;
  /** Vertical position of the pool on the right side (0..1). */
  y: number;
}

const POOLS: Pool[] = [
  { id: 'burn',     label: 'Burn',          short: 'Burn',     pct: 40, hex: '#f97316', y: 0.10 },
  { id: 'sanctum',  label: 'Sanctum Fund',  short: 'Sanctum',  pct: 10, hex: '#ec4899', y: 0.30 },
  { id: 'payroll',  label: 'DAO payroll',   short: 'Payroll',  pct: 25, hex: '#06b6d4', y: 0.50 },
  { id: 'merchant', label: 'Merchant pool', short: 'Merchants', pct: 15, hex: '#10b981', y: 0.70 },
  { id: 'headhunt', label: 'Referral pool', short: 'Referrals', pct: 10, hex: '#a855f7', y: 0.90 },
];

interface Particle {
  id: number;
  pool: PoolId;
  hex: string;
  /** Spawn time in ms (relative to start). */
  t0: number;
  /** Total flight time in ms. */
  duration: number;
  /** Source y (entry side) and target y (pool side), 0..1. */
  y0: number;
  y1: number;
  /** Visual size 2..5px radius. */
  r: number;
  /** Real $ value carried by the particle, for the running pool totals. */
  value: number;
}

const VIEW_W = 800;
const VIEW_H = 220;
const ENTRY_X = 40;
const SPLIT_X = 380;
const POOL_X = 720;

/** Cubic bezier control points for entry → split (gentle curve). */
function entryPath(y0: number): string {
  const sy = y0 * VIEW_H;
  const my = VIEW_H * 0.5;
  return `M ${ENTRY_X} ${sy} C ${(ENTRY_X + SPLIT_X) / 2} ${sy}, ${(ENTRY_X + SPLIT_X) / 2} ${my}, ${SPLIT_X} ${my}`;
}

/** Cubic bezier for split → pool. */
function splitPath(y1: number): string {
  const ey = y1 * VIEW_H;
  const my = VIEW_H * 0.5;
  return `M ${SPLIT_X} ${my} C ${(SPLIT_X + POOL_X) / 2} ${my}, ${(SPLIT_X + POOL_X) / 2} ${ey}, ${POOL_X} ${ey}`;
}

/** Pick a pool by weighted lottery proportional to its split percentage. */
function pickPool(): Pool {
  const total = POOLS.reduce((acc, p) => acc + p.pct, 0);
  let n = Math.random() * total;
  for (const p of POOLS) {
    if (n < p.pct) return p;
    n -= p.pct;
  }
  return POOLS[0]!;
}

export function FeeFlowRiver() {
  const reduceMotion = usePrefersReducedMotion();
  const fmReduce = useReducedMotion();
  const reduce = reduceMotion || !!fmReduce;

  // Per-pool running totals. We update via setState at ~10 Hz so the
  // numbers tick visibly but don't thrash React.
  const [totals, setTotals] = useState<Record<PoolId, number>>(() =>
    POOLS.reduce((acc, p) => ({ ...acc, [p.id]: 0 }), {} as Record<PoolId, number>),
  );

  const totalsRef = useRef(totals);
  totalsRef.current = totals;

  // Particles are mutated in-place inside the rAF loop. React doesn't
  // see this state directly; we just keep a ref so the render reads the
  // same data the loop is updating.
  const particlesRef = useRef<Particle[]>([]);
  const [, forceRender] = useState(0);

  // Single shared time origin used by both the rAF loop and the JSX
  // render. Using two different `performance.now()` reads here would
  // give the loop and the render slightly different epochs — particles
  // would visually drift a few frames off their internal age.
  const startedAtRef = useRef<number | null>(null);
  if (startedAtRef.current === null && typeof performance !== 'undefined') {
    startedAtRef.current = performance.now();
  }

  // Spawn timing. We don't try to wire real on-chain events here — the
  // VFIDE token isn't deployed and this is the landing page. A clear
  // disclosure below the river says the figures are illustrative.
  useEffect(() => {
    if (reduce) {
      // For users with motion preferences, skip the particles. Show
      // static splits only.
      return;
    }
    let raf = 0;
    let lastSpawn = 0;
    let lastTotalsTick = 0;
    let nextId = 0;
    const startedAt = startedAtRef.current ?? performance.now();
    if (startedAtRef.current === null) startedAtRef.current = startedAt;
    let cancelled = false;

    const SPAWN_INTERVAL_MS = 350; // ~3 particles/sec
    const PARTICLE_DURATION_MS = 4200;

    const tick = (now: number) => {
      if (cancelled) return;
      const elapsed = now - startedAt;

      // Spawn
      if (elapsed - lastSpawn > SPAWN_INTERVAL_MS) {
        lastSpawn = elapsed;
        const pool = pickPool();
        const value = +(0.5 + Math.random() * 8).toFixed(2); // $0.50..$8.50 per particle
        particlesRef.current.push({
          id: nextId++,
          pool: pool.id,
          hex: pool.hex,
          t0: elapsed,
          duration: PARTICLE_DURATION_MS,
          y0: Math.random() * 0.8 + 0.1,
          y1: pool.y,
          r: 2 + Math.random() * 3,
          value,
        });
      }

      // Prune + credit any particles that have landed
      const survivors: Particle[] = [];
      const credits: Record<PoolId, number> = {
        burn: 0, sanctum: 0, merchant: 0, payroll: 0, headhunt: 0,
      };
      for (const p of particlesRef.current) {
        if (elapsed - p.t0 >= p.duration) {
          credits[p.pool] += p.value;
        } else {
          survivors.push(p);
        }
      }
      particlesRef.current = survivors;

      const anyCredits = Object.values(credits).some((v) => v > 0);
      if (anyCredits) {
        // Mutate totals via setState (still throttled by the tick below)
        const next = { ...totalsRef.current };
        let mutated = false;
        for (const id of Object.keys(credits) as PoolId[]) {
          if (credits[id] > 0) {
            next[id] = +(next[id] + credits[id]).toFixed(2);
            mutated = true;
          }
        }
        if (mutated) totalsRef.current = next;
      }

      // Throttle the visible re-render so React doesn't thrash. We
      // re-render the SVG (particle positions) and totals at ~30 Hz.
      if (elapsed - lastTotalsTick > 33) {
        lastTotalsTick = elapsed;
        forceRender((v) => v + 1);
        if (anyCredits) setTotals(totalsRef.current);
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [reduce]);

  // For position calculation we use `performance.now()` directly inside
  // render. This is fine because rAF triggers our re-render at ~30 Hz,
  // so the positions and `now()` stay coherent. Both the loop and the
  // render read from the same `startedAtRef` so particle positions
  // line up exactly with their stored `t0`.
  const now = typeof performance !== 'undefined' ? performance.now() : 0;
  const startedAt = startedAtRef.current ?? now;

  // Reduced motion: show static distribution bars — no SVG, no particles,
  // no animation loops. Safer for users with vestibular disorders.
  if (reduce) {
    return (
      <div id="fee-river" className="w-full rounded-3xl border border-white/10 bg-zinc-950/70 p-5 sm:p-7">
        <div className="mb-4">
          <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-cyan-500/10 px-3 py-1 text-xs uppercase tracking-widest text-cyan-300">
            <Activity size={12} /> Fee distribution
          </div>
          <h3 className="text-2xl font-bold text-white">Every fee is accounted for</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-400">
            VFIDE collects fees from buyers, never merchants. Each fee splits five ways into pools that work for the network.
          </p>
        </div>
        <div className="space-y-3 mt-4">
          {POOLS.map((pool) => (
            <div key={pool.id} className="flex items-center gap-3">
              <div className="w-28 text-sm text-zinc-300 shrink-0">{pool.label}</div>
              <div className="flex-1 h-3 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pool.pct}%`, background: pool.hex }} />
              </div>
              <div className="w-10 text-sm font-semibold text-right" style={{ color: pool.hex }}>{pool.pct}%</div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-zinc-600">Animation disabled (prefers-reduced-motion). Numbers are illustrative until mainnet launch.</p>
      </div>
    );
  }

  return (
    <div id="fee-river" className="relative w-full overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/70 p-5 backdrop-blur-sm sm:p-7">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-cyan-500/10 px-3 py-1 text-xs uppercase tracking-widest text-cyan-300">
            <Activity size={12} /> Live fee flow
          </div>
          <h3 className="text-2xl font-bold text-white">Every fee is accounted for</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-400">
            VFIDE collects fees from buyers, never merchants. Each fee splits five ways into pools that work for the network — supply burn, charity, top merchants, council pay, and referral rewards.
          </p>
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="h-48 w-full sm:h-60"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {POOLS.map((p) => (
              <linearGradient key={p.id} id={`river-grad-${p.id}`} x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor={p.hex} stopOpacity="0.0" />
                <stop offset="100%" stopColor={p.hex} stopOpacity="0.55" />
              </linearGradient>
            ))}
            <linearGradient id="river-entry" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Entry tributaries (a fan-in look from the left side) */}
          {[0.15, 0.35, 0.5, 0.65, 0.85].map((y) => (
            <path key={`in-${y}`} d={entryPath(y)} stroke="url(#river-entry)" strokeWidth={1.2} fill="none" />
          ))}

          {/* Split node */}
          <circle cx={SPLIT_X} cy={VIEW_H / 2} r={6} fill="#22d3ee" />
          <circle cx={SPLIT_X} cy={VIEW_H / 2} r={14} fill="none" stroke="#22d3ee" strokeOpacity="0.4" />
          <circle cx={SPLIT_X} cy={VIEW_H / 2} r={22} fill="none" stroke="#22d3ee" strokeOpacity="0.18" />

          {/* Outflow paths to each pool */}
          {POOLS.map((p) => (
            <path
              key={`out-${p.id}`}
              d={splitPath(p.y)}
              stroke={`url(#river-grad-${p.id})`}
              strokeWidth={2}
              fill="none"
            />
          ))}

          {/* Pool nodes (right side).
              Non-burn pools render as a simple two-circle node.
              The burn pool gets its own forge/furnace visual to honor that
              its 35% is *permanently destroyed*, not redistributed — a
              meaningful visual difference from the other four pools. */}
          {POOLS.filter((p) => p.id !== 'burn').map((p) => (
            <g key={`pool-${p.id}`}>
              <circle cx={POOL_X} cy={p.y * VIEW_H} r={10} fill={p.hex} opacity={0.85} />
              <circle cx={POOL_X} cy={p.y * VIEW_H} r={18} fill="none" stroke={p.hex} strokeOpacity="0.35" />
              <text
                x={POOL_X + 28}
                y={p.y * VIEW_H + 4}
                fill="white"
                fontSize={11}
                fontFamily="ui-sans-serif, system-ui"
              >
                {p.short} ({p.pct}%)
              </text>
            </g>
          ))}

          {/* Burn pool — the forge. */}
          {(() => {
            const burnPool = POOLS.find((p) => p.id === 'burn')!;
            return (
              <BurnFurnace
                key="pool-burn"
                cx={POOL_X}
                cy={burnPool.y * VIEW_H}
                hex={burnPool.hex}
                short={burnPool.short}
                pct={burnPool.pct}
                cumulativeBurn={totals.burn}
              />
            );
          })()}

          {/* Particles */}
          {particlesRef.current.map((p) => {
            const localT = (now - startedAt - p.t0) / p.duration;
            if (localT < 0 || localT > 1) return null;
            // Two-stage path: entry path for the first half, split path for the second.
            const isEntry = localT < 0.5;
            const u = isEntry ? localT * 2 : (localT - 0.5) * 2;
            const path = isEntry ? entryPathPoint(p.y0, u) : splitPathPoint(p.y1, u);
            return (
              <circle
                key={p.id}
                cx={path.x}
                cy={path.y}
                r={p.r}
                fill={p.hex}
                opacity={isEntry ? 0.6 : 0.95}
              />
            );
          })}
        </svg>

        {/* Running totals overlay */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {POOLS.map((p) => (
            <div key={p.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-gray-500">{p.label}</span>
                <span className="rounded-md px-1.5 py-0.5 text-[10px] font-mono" style={{ background: `${p.hex}22`, color: p.hex }}>
                  {p.pct}%
                </span>
              </div>
              <div className="mt-1 text-lg text-white">
                <motion.span
                  key={Math.floor(totals[p.id] * 100)}
                  initial={{ opacity: 0.5, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  className="inline-block"
                >
                  <Numeric value={totals[p.id]} format="currency" size="lg" weight={500} />
                </motion.span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 text-[11px] text-gray-500">
        <Activity size={12} className="mt-0.5 flex-shrink-0" />
        <span>
          Live demo with illustrative numbers — pre-mainnet. Splits reflect the two-stage on-chain distribution: <code className="font-mono text-gray-400">ProofScoreBurnRouter</code> (40% burn / 10% Sanctum / 50% ecosystem) then <code className="font-mono text-gray-400">FeeDistributor</code> (50% DAO payroll / 30% merchants / 20% headhunters of the ecosystem share). Once VFIDE is live, this animates against real Transfer events.
        </span>
      </div>
    </div>
  );
}

// ── Curve helpers used to sample particle positions every frame ──────

function entryPathPoint(y0: number, u: number) {
  const sy = y0 * VIEW_H;
  const my = VIEW_H * 0.5;
  // Cubic bezier between (ENTRY_X, sy) → (SPLIT_X, my) with intermediate handles
  const c1x = (ENTRY_X + SPLIT_X) / 2;
  const c1y = sy;
  const c2x = (ENTRY_X + SPLIT_X) / 2;
  const c2y = my;
  return bezier(ENTRY_X, sy, c1x, c1y, c2x, c2y, SPLIT_X, my, u);
}
function splitPathPoint(y1: number, u: number) {
  const ey = y1 * VIEW_H;
  const my = VIEW_H * 0.5;
  const c1x = (SPLIT_X + POOL_X) / 2;
  const c1y = my;
  const c2x = (SPLIT_X + POOL_X) / 2;
  const c2y = ey;
  return bezier(SPLIT_X, my, c1x, c1y, c2x, c2y, POOL_X, ey, u);
}
function bezier(
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number,
  u: number,
): { x: number; y: number } {
  const mu = 1 - u;
  const a = mu * mu * mu;
  const b = 3 * mu * mu * u;
  const c = 3 * mu * u * u;
  const d = u * u * u;
  return {
    x: a * x0 + b * x1 + c * x2 + d * x3,
    y: a * y0 + b * y1 + c * y2 + d * y3,
  };
}

// ── Burn pool — forge/furnace visual ────────────────────────────────
//
// Visually distinguishes the 40% burn channel from the other four pools.
// Burned VFIDE is permanently removed; the other pools redistribute. The
// furnace metaphor makes that difference immediate.
//
// Heat dynamics:
//   - Baseline glow grows with cumulativeBurn (asymptotic to 1).
//   - Each new burn (cumulativeBurn delta > 0) bumps heat to 1 and decays
//     back toward baseline over ~1.2s — visible as a flare when a
//     particle "lands."
//
// Reduced motion: the flare is suppressed; heat sticks to baseline so
// the glow stays consistent.

interface BurnFurnaceProps {
  cx: number;
  cy: number;
  hex: string;
  short: string;
  pct: number;
  cumulativeBurn: number;
}

function BurnFurnace({ cx, cy, hex, short, pct, cumulativeBurn }: BurnFurnaceProps) {
  const reduce = useReducedMotion();
  const [heat, setHeat] = useState(0);
  const lastBurnRef = useRef(0);
  const lastFlareAtRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  // Detect a new burn → record the moment.
  useEffect(() => {
    if (cumulativeBurn > lastBurnRef.current) {
      lastFlareAtRef.current = performance.now();
      lastBurnRef.current = cumulativeBurn;
    }
  }, [cumulativeBurn]);

  // Heat animation loop. Combines cumulative baseline + post-flare decay.
  useEffect(() => {
    if (reduce) {
      // Static heat based on cumulative burn only.
      setHeat(Math.min(1, cumulativeBurn / 5000));
      return;
    }
    const FLARE_DECAY_MS = 1200;
    const tick = () => {
      const baseline = Math.min(0.55, cumulativeBurn / 5000);
      const sinceFlare = performance.now() - lastFlareAtRef.current;
      const flareContribution =
        sinceFlare < FLARE_DECAY_MS
          ? (1 - sinceFlare / FLARE_DECAY_MS) * (1 - baseline)
          : 0;
      setHeat(Math.max(0, Math.min(1, baseline + flareContribution)));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [reduce, cumulativeBurn]);

  // Geometry — centered on (cx, cy), about 36px wide × 32px tall.
  // Trapezoidal forge body: wider at the bottom, narrower at the top.
  const halfW = 12;
  const baseY = cy + 14;
  const topY = cy - 8;
  const innerHalfW = 6;
  const innerTop = cy - 4;
  const innerBottom = cy + 10;

  // Heat-modulated colors. The mouth color shifts from deep ember to bright
  // gold as heat rises; the outer glow opacity scales similarly.
  const mouthColor = heat > 0.7 ? '#fde68a' : heat > 0.4 ? hex : '#7c2d12';
  const outerGlowOpacity = 0.15 + heat * 0.5;
  const flareRingOpacity = heat * 0.7;

  // A radial gradient id local to this furnace, in case multiple instances
  // ever render (defensive — usually only one burn pool).
  const gradId = `burn-furnace-grad-${cx}-${cy}`;

  return (
    <g aria-label={`${short} (${pct}%) — permanently destroyed`}>
      <defs>
        <radialGradient id={gradId} cx="50%" cy="20%" r="80%">
          <stop offset="0%" stopColor={mouthColor} stopOpacity={0.95} />
          <stop offset="60%" stopColor={hex} stopOpacity={0.4} />
          <stop offset="100%" stopColor={hex} stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* Outer glow — intensifies with heat */}
      <circle
        cx={cx}
        cy={cy + 3}
        r={26}
        fill={hex}
        opacity={outerGlowOpacity}
        filter="blur(6px)"
      />

      {/* Forge body — trapezoid, slate-dark exterior */}
      <polygon
        points={`${cx - halfW},${baseY} ${cx + halfW},${baseY} ${cx + halfW - 4},${topY} ${cx - halfW + 4},${topY}`}
        fill="#1f2937"
        stroke="#374151"
        strokeWidth={1}
      />

      {/* Inner heat opening — radial-gradient fill driven by heat */}
      <polygon
        points={`${cx - innerHalfW},${innerBottom} ${cx + innerHalfW},${innerBottom} ${cx + innerHalfW - 2},${innerTop} ${cx - innerHalfW + 2},${innerTop}`}
        fill={`url(#${gradId})`}
      />

      {/* Top "mouth" line — the spot where particles land */}
      <ellipse
        cx={cx}
        cy={topY + 1}
        rx={innerHalfW - 1}
        ry={1.5}
        fill={mouthColor}
        opacity={0.5 + heat * 0.5}
      />

      {/* Flare ring — appears briefly on a burn event */}
      {!reduce && flareRingOpacity > 0.05 && (
        <circle
          cx={cx}
          cy={topY}
          r={8 + heat * 4}
          fill="none"
          stroke={mouthColor}
          strokeWidth={1}
          opacity={flareRingOpacity}
        />
      )}

      {/* Label */}
      <text
        x={cx + 28}
        y={cy + 4}
        fill="white"
        fontSize={11}
        fontFamily="ui-sans-serif, system-ui"
      >
        {short} ({pct}%)
      </text>
    </g>
  );
}

export default FeeFlowRiver;
