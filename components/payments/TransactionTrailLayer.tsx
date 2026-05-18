'use client';

/**
 * TransactionTrailLayer — visual side of TransactionTrailProvider.
 *
 * Mounted once in AppShell. Subscribes to the trail registry and renders
 * one small card per active trail in the bottom-right, vertically
 * stacked above the Monument corner.
 *
 * Two animations per trail, both opt-in to reduced-motion:
 *
 *   1. Swarm-in (one-shot on mount, only when sourcePos is present).
 *      ~14 particles fly along a bezier curve from the captured click
 *      position to the card's center over ~700ms. This is the "your
 *      action lifted off and landed somewhere meaningful" feeling.
 *
 *   2. Orbital (continuous while pending).
 *      Particles converge toward the center dot. Always runs while
 *      pending, regardless of whether sourcePos was captured.
 *
 * Visual per trail:
 *   - Pending: a small dark card with the label + a 56×56 SVG ring of
 *     particles orbiting inward toward a central dot tinted to the
 *     trail's tier color.
 *   - Success: the ring snaps to a brief outward burst, the dot becomes
 *     a checkmark.
 *   - Error: ring snaps to a contraction, the dot becomes an X tinted red.
 *
 * Reduced motion: neither swarm nor orbital animates. Pending shows a
 * static dotted ring; resolution shows the static check/X. Information
 * stays correct.
 *
 * Positioning rationale: bottom-right corner is where the user's eye
 * already goes for the Monument; stacking the trail cards above the
 * Monument keeps them in peripheral vision without colonizing a new
 * region of the screen.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Loader2 } from 'lucide-react';
import {
  useTransactionTrail,
  type Trail,
  type SourcePos,
} from './TransactionTrailProvider';
import { usePrefersReducedMotion } from '@/app/components/usePrefersReducedMotion';
import {
  useParticleSystem,
  type BaseParticle,
  easeOutCubic,
} from '@/lib/animation/particles';

const CARD_SIZE = 56;            // square SVG area for the orbit
const CENTER = CARD_SIZE / 2;
const ORBIT_OUTER = 24;          // starting radius
const ORBIT_INNER = 4;           // ending radius (near the center dot)
const PARTICLE_LIFETIME_MS = 1500;
const SPAWN_INTERVAL_MS = 120;   // how often we emit a new orbital particle

const SWARM_DURATION_MS = 700;
const SWARM_PARTICLE_COUNT = 14;

interface OrbitParticle extends BaseParticle {
  /** Initial polar angle (radians). */
  angle0: number;
  /** Angular velocity (radians / sec). */
  omega: number;
  /** Current x,y (computed in update). */
  x: number;
  y: number;
  /** Current alpha (computed in update). */
  alpha: number;
  /** Current radius (computed in update). */
  r: number;
}

interface SwarmParticle {
  id: number;
  /** Start time relative to swarm start (ms). */
  t0: number;
  /** Total flight time (ms). */
  duration: number;
  /** Per-particle bezier control offsets so each takes a slightly different arc. */
  cx1: number;
  cy1: number;
  cx2: number;
  cy2: number;
  /** Per-particle visual radius (px). */
  r: number;
}

export function TransactionTrailLayer() {
  const { trails } = useTransactionTrail();
  // Anything to render?
  if (trails.length === 0) return null;
  return (
    <>
      {/* Cards stack — bottom-right. Above MonumentCorner (z-40). */}
      <div className="pointer-events-none fixed bottom-36 md:bottom-20 right-4 z-40 flex flex-col-reverse items-end gap-2">
        <AnimatePresence>
          {trails.map((trail) => (
            <TrailCard key={trail.id} trail={trail} />
          ))}
        </AnimatePresence>
      </div>
      {/* Global swarm overlay — covers the whole viewport. */}
      <SwarmOverlay trails={trails} />
    </>
  );
}

function TrailCard({ trail }: { trail: Trail }) {
  const reduce = usePrefersReducedMotion();
  const isPending = trail.status === 'pending';
  const isSuccess = trail.status === 'success';
  const isError = trail.status === 'error';

  const ringColor = isError ? '#ef4444' : trail.tierHex;

  return (
    <motion.div
      data-trail-card-id={trail.id}
      initial={{ opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 32 }}
      transition={{ duration: 0.2 }}
      className="pointer-events-auto flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-950/95 px-3 py-2 shadow-2xl backdrop-blur-md max-w-[260px]"
      role="status"
      aria-live="polite"
    >
      {reduce ? (
        <StaticIcon status={trail.status} color={ringColor} />
      ) : (
        <OrbitVisual color={ringColor} status={trail.status} />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium text-white">
          {trail.label}
        </div>
        <div className="truncate text-[10px] text-gray-400">
          {isPending && 'Signing & confirming…'}
          {isSuccess && 'Confirmed'}
          {isError && (trail.errorMessage || 'Failed')}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Static fallback for reduced motion ──────────────────────────────────────

function StaticIcon({
  status,
  color,
}: {
  status: 'pending' | 'success' | 'error';
  color: string;
}) {
  if (status === 'success') {
    return (
      <div
        className="flex h-7 w-7 items-center justify-center rounded-full"
        style={{ background: `${color}22`, color }}
      >
        <Check size={14} />
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500/15 text-red-400">
        <X size={14} />
      </div>
    );
  }
  return (
    <div
      className="flex h-7 w-7 items-center justify-center rounded-full"
      style={{ background: `${color}22`, color }}
    >
      <Loader2 size={14} />
    </div>
  );
}

// ─── Animated orbit visual ───────────────────────────────────────────────────

function OrbitVisual({
  color,
  status,
}: {
  color: string;
  status: 'pending' | 'success' | 'error';
}) {
  const [, setRenderTick] = useState(0);
  const particlesRef = useRef<readonly OrbitParticle[]>([]);
  const spawnTimerRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(performance.now());

  const enabled = status === 'pending';

  // Memoize callbacks so the system's rAF loop doesn't see identity changes.
  const handlers = useMemo(
    () => ({
      spawn: (now: number) => {
        // Spawn at the OUTER ring, random angle.
        const angle0 = Math.random() * Math.PI * 2;
        const omega = 1.2 + Math.random() * 0.8; // ~70-120 deg/sec
        const x = CENTER + ORBIT_OUTER * Math.cos(angle0);
        const y = CENTER + ORBIT_OUTER * Math.sin(angle0);
        void now;
        return { angle0, omega, x, y, alpha: 0, r: ORBIT_OUTER };
      },
      update: (p: OrbitParticle, _dt: number, now: number) => {
        const t = Math.min(1, (now - p.t0) / PARTICLE_LIFETIME_MS);
        const eased = easeOutCubic(t);
        // Radius spirals from outer to inner.
        p.r = ORBIT_OUTER + (ORBIT_INNER - ORBIT_OUTER) * eased;
        // Angle rotates with omega.
        const angle = p.angle0 + p.omega * ((now - p.t0) / 1000);
        p.x = CENTER + p.r * Math.cos(angle);
        p.y = CENTER + p.r * Math.sin(angle);
        // Fade in for first 20%, fade out for last 20%.
        p.alpha = t < 0.2 ? t / 0.2 : t > 0.8 ? (1 - t) / 0.2 : 1;
      },
      reap: (p: OrbitParticle, now: number) =>
        now - p.t0 >= PARTICLE_LIFETIME_MS,
      onSnapshot: (particles: OrbitParticle[]) => {
        particlesRef.current = particles;
        setRenderTick((k) => k + 1);
      },
    }),
    [],
  );

  const system = useParticleSystem<OrbitParticle>({
    ...handlers,
    maxParticles: 32,
    enabled,
  });

  // Emit a particle every SPAWN_INTERVAL_MS while pending.
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const loop = (t: number) => {
      const dt = t - lastFrameRef.current;
      lastFrameRef.current = t;
      spawnTimerRef.current += dt;
      while (spawnTimerRef.current >= SPAWN_INTERVAL_MS) {
        system.emit();
        spawnTimerRef.current -= SPAWN_INTERVAL_MS;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [enabled, system]);

  const particles = particlesRef.current;
  const isSuccess = status === 'success';
  const isError = status === 'error';

  return (
    <svg
      width={CARD_SIZE}
      height={CARD_SIZE}
      viewBox={`0 0 ${CARD_SIZE} ${CARD_SIZE}`}
      aria-hidden="true"
    >
      {/* Outer reference ring — very faint */}
      <circle
        cx={CENTER}
        cy={CENTER}
        r={ORBIT_OUTER}
        fill="none"
        stroke={`${color}22`}
        strokeWidth={1}
      />
      {/* Particles */}
      {particles.map((p) => (
        <circle
          key={p.id}
          cx={p.x}
          cy={p.y}
          r={1.5}
          fill={color}
          opacity={p.alpha}
        />
      ))}
      {/* Center glyph */}
      {isSuccess ? (
        <g>
          <circle cx={CENTER} cy={CENTER} r={9} fill={color} opacity={0.18} />
          <path
            d={`M ${CENTER - 4} ${CENTER} L ${CENTER - 1} ${CENTER + 3} L ${CENTER + 5} ${CENTER - 3}`}
            stroke={color}
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>
      ) : isError ? (
        <g>
          <circle cx={CENTER} cy={CENTER} r={9} fill="#ef4444" opacity={0.18} />
          <path
            d={`M ${CENTER - 3} ${CENTER - 3} L ${CENTER + 3} ${CENTER + 3} M ${CENTER + 3} ${CENTER - 3} L ${CENTER - 3} ${CENTER + 3}`}
            stroke="#ef4444"
            strokeWidth={1.6}
            strokeLinecap="round"
            fill="none"
          />
        </g>
      ) : (
        <circle cx={CENTER} cy={CENTER} r={2.5} fill={color} />
      )}
    </svg>
  );
}

// ─── Global swarm overlay (button → corner card) ─────────────────────────────

interface ActiveSwarm {
  trailId: string;
  source: SourcePos;
  target: { x: number; y: number };
  startedAtMs: number;
  particles: SwarmParticle[];
  color: string;
}

function SwarmOverlay({ trails }: { trails: Trail[] }) {
  const reduce = usePrefersReducedMotion();
  const [active, setActive] = useState<ActiveSwarm[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const [, forceRender] = useState(0);

  // For each new trail with a sourcePos, queue a swarm.
  useEffect(() => {
    if (reduce) return;
    const newSwarms: ActiveSwarm[] = [];
    for (const trail of trails) {
      if (!trail.sourcePos) continue;
      if (seenIdsRef.current.has(trail.id)) continue;
      seenIdsRef.current.add(trail.id);

      // Find the card's DOM rect to use as the swarm target. The card
      // mounts on the same render tick as the trail entering the array,
      // so we query in a microtask to give React a chance to paint.
      queueMicrotask(() => {
        const cardEl = document.querySelector<HTMLElement>(
          `[data-trail-card-id="${trail.id}"]`,
        );
        const targetRect = cardEl?.getBoundingClientRect();
        if (!targetRect) return;

        // Build a per-particle bezier with slight randomization so each
        // particle takes its own arc.
        const dx = (targetRect.left + targetRect.width / 2) - trail.sourcePos!.x;
        const dy = (targetRect.top + targetRect.height / 2) - trail.sourcePos!.y;
        const particles: SwarmParticle[] = [];
        for (let i = 0; i < SWARM_PARTICLE_COUNT; i++) {
          // Bezier control points: midpoint pulled toward an angle that
          // varies per-particle so the arcs fan out a bit.
          const spread = (Math.random() - 0.5) * 0.6;
          const cx1 = trail.sourcePos!.x + dx * 0.3 + dy * spread;
          const cy1 = trail.sourcePos!.y + dy * 0.3 - dx * spread;
          const cx2 = trail.sourcePos!.x + dx * 0.7 + dy * spread * 0.5;
          const cy2 = trail.sourcePos!.y + dy * 0.7 - dx * spread * 0.5;
          particles.push({
            id: i,
            t0: i * 25, // stagger start by 25ms — visual "stream"
            duration: SWARM_DURATION_MS - 200 + Math.random() * 200,
            cx1,
            cy1,
            cx2,
            cy2,
            r: 1.6 + Math.random() * 1.2,
          });
        }

        setActive((prev) => [
          ...prev,
          {
            trailId: trail.id,
            source: trail.sourcePos!,
            target: {
              x: targetRect.left + targetRect.width / 2,
              y: targetRect.top + targetRect.height / 2,
            },
            startedAtMs: performance.now(),
            particles,
            color: trail.tierHex,
          },
        ]);
      });
    }

    // Prune `seenIds` for trails that have disappeared so the cache doesn't grow.
    const liveIds = new Set(trails.map((t) => t.id));
    seenIdsRef.current = new Set(
      Array.from(seenIdsRef.current).filter((id) => liveIds.has(id)),
    );

    void newSwarms;
  }, [trails, reduce]);

  // rAF loop: advance/reap swarms; force a re-render each frame while any are active.
  useEffect(() => {
    if (active.length === 0) return;
    let raf = 0;
    const tick = () => {
      // Reap swarms whose particles have all finished.
      const now = performance.now();
      setActive((prev) => {
        const next = prev.filter((s) => {
          const elapsed = now - s.startedAtMs;
          // Each particle is alive until t0 + duration; swarm is dead when
          // the last particle finishes.
          const lastEnd = Math.max(...s.particles.map((p) => p.t0 + p.duration));
          return elapsed < lastEnd;
        });
        return next.length === prev.length ? prev : next;
      });
      forceRender((k) => k + 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active.length]);

  if (active.length === 0 || reduce) return null;

  return (
    <svg
      className="pointer-events-none fixed inset-0 z-40 h-full w-full"
      aria-hidden="true"
    >
      {active.map((swarm) => (
        <SwarmGroup key={swarm.trailId} swarm={swarm} />
      ))}
    </svg>
  );
}

function SwarmGroup({ swarm }: { swarm: ActiveSwarm }) {
  const now = performance.now();
  const elapsed = now - swarm.startedAtMs;
  return (
    <g>
      {swarm.particles.map((p) => {
        const localT = (elapsed - p.t0) / p.duration;
        if (localT < 0 || localT > 1) return null;
        const eased = easeOutCubic(localT);
        const point = cubicBezier(
          eased,
          swarm.source.x,
          swarm.source.y,
          p.cx1,
          p.cy1,
          p.cx2,
          p.cy2,
          swarm.target.x,
          swarm.target.y,
        );
        // Fade out for last 25% so the particle visually "lands" into the card.
        const alpha = localT > 0.75 ? (1 - localT) / 0.25 : 1;
        return (
          <circle
            key={p.id}
            cx={point.x}
            cy={point.y}
            r={p.r}
            fill={swarm.color}
            opacity={alpha}
          />
        );
      })}
    </g>
  );
}

/** Local cubic bezier — duplicates the helper in lib/animation/particles.ts
 *  so the SVG overlay file is self-contained. Same math. */
function cubicBezier(
  t: number,
  x0: number, y0: number,
  cx1: number, cy1: number,
  cx2: number, cy2: number,
  x1: number, y1: number,
): { x: number; y: number } {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;
  return {
    x: uuu * x0 + 3 * uu * t * cx1 + 3 * u * tt * cx2 + ttt * x1,
    y: uuu * y0 + 3 * uu * t * cy1 + 3 * u * tt * cy2 + ttt * y1,
  };
}
