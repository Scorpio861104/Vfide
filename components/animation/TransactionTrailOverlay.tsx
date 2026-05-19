'use client';

/**
 * TransactionTrailOverlay — renders all active trails as particle streams.
 *
 * One fixed-position SVG overlay; computes source/destination screen
 * positions each frame from the DOM anchors so scrolling and layout
 * shifts don't desync the trail. A single rAF loop drives all trails
 * — particles count is bounded (~120 across all trails).
 *
 * Visual story per status:
 *   pending   — slow drift along the path (waiting for user to sign)
 *   signing   — particles slow and pulse
 *   submitted — particles accelerate toward destination
 *   confirmed — final burst at the destination
 *   failed    — particles reverse and fade back to source
 *
 * Reduced motion: no particles. Instead, a static dotted line between
 * source and destination with a small status icon at the midpoint.
 * The user still gets feedback; just without movement.
 */

import { useEffect, useRef, useState } from 'react';
import { useTransactionTrails, Trail } from '@/lib/animation/transactionTrail';
import { usePrefersReducedMotion } from '@/app/components/usePrefersReducedMotion';
import { cubicBezier, easeOutCubic } from '@/lib/animation/particles';

interface Particle {
  trailId: string;
  spawnT: number;
  /** Per-particle phase 0..1 along the bezier path. */
  phase: number;
  /** Speed factor 0..1 applied to phase per ms. */
  speed: number;
  /** Color hex. */
  color: string;
  /** Radius px. */
  r: number;
  /** When true, particle is going BACKWARD (failure case). */
  reverse: boolean;
}

const MAX_PARTICLES = 120;

interface Endpoint {
  x: number;
  y: number;
}

function elementCenter(el: HTMLElement | null | undefined): Endpoint | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** When dest is missing, target the right edge of the viewport at midline. */
function fallbackDest(): Endpoint {
  return { x: window.innerWidth - 40, y: Math.max(60, window.innerHeight / 2) };
}

export function TransactionTrailOverlay() {
  const trails = useTransactionTrails();
  const reducedMotion = usePrefersReducedMotion();
  const particlesRef = useRef<Particle[]>([]);
  const lastTickRef = useRef<number>(0);
  const lastEmitRef = useRef<Map<string, number>>(new Map());
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (reducedMotion) return;
    if (trails.length === 0) {
      particlesRef.current = [];
      return;
    }

    let rafId: number;
    const loop = (now: number) => {
      const dt = lastTickRef.current === 0 ? 16 : now - lastTickRef.current;
      lastTickRef.current = now;

      // Spawn particles per trail at status-dependent cadence.
      for (const trail of trails) {
        const last = lastEmitRef.current.get(trail.id) ?? 0;
        const spawnEveryMs = (() => {
          switch (trail.status) {
            case 'pending':   return 220;
            case 'signing':   return 480;
            case 'submitted': return 90;
            case 'confirmed': return Number.POSITIVE_INFINITY; // burst handled below
            case 'failed':    return Number.POSITIVE_INFINITY;
          }
        })();
        if (now - last >= spawnEveryMs && particlesRef.current.length < MAX_PARTICLES) {
          particlesRef.current.push({
            trailId: trail.id,
            spawnT: now,
            phase: 0,
            speed: trail.status === 'submitted' ? 0.0015 : trail.status === 'signing' ? 0.0006 : 0.0009,
            color: trail.tierHex ?? '#22d3ee',
            r: trail.status === 'signing' ? 1.8 : 2.4,
            reverse: false,
          });
          lastEmitRef.current.set(trail.id, now);
        }

        // On 'confirmed' status emission, do a one-shot burst at the destination.
        if (trail.status === 'confirmed' && !lastEmitRef.current.has(trail.id + ':burst')) {
          for (let i = 0; i < 12; i++) {
            if (particlesRef.current.length >= MAX_PARTICLES) break;
            particlesRef.current.push({
              trailId: trail.id,
              spawnT: now,
              phase: 0.85 + Math.random() * 0.1, // near destination
              speed: 0.001 + Math.random() * 0.0015,
              color: trail.tierHex ?? '#10b981',
              r: 1.5 + Math.random() * 2,
              reverse: false,
            });
          }
          lastEmitRef.current.set(trail.id + ':burst', now);
        }

        // On 'failed', reverse existing particles for this trail.
        if (trail.status === 'failed' && !lastEmitRef.current.has(trail.id + ':reversed')) {
          for (const p of particlesRef.current) {
            if (p.trailId === trail.id) p.reverse = true;
          }
          lastEmitRef.current.set(trail.id + ':reversed', now);
        }
      }

      // Advance + reap.
      const alive: Particle[] = [];
      for (const p of particlesRef.current) {
        const delta = p.speed * dt;
        p.phase = p.reverse ? p.phase - delta : p.phase + delta;
        if (p.phase >= 0 && p.phase <= 1) alive.push(p);
      }
      particlesRef.current = alive;

      // Trigger a render so React picks up the latest particle positions.
      setParticles([...alive]);

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      lastTickRef.current = 0;
    };
  }, [trails, reducedMotion]);

  if (trails.length === 0) return null;

  // Compute endpoint geometry per trail.
  const trailGeo = new Map<string, { src: Endpoint; dst: Endpoint }>();
  for (const t of trails) {
    const src = elementCenter(t.sourceEl) ?? fallbackDest();
    const dst = elementCenter(t.destEl) ?? fallbackDest();
    trailGeo.set(t.id, { src, dst });
  }

  if (reducedMotion) {
    return (
      <svg
        aria-hidden
        className="fixed inset-0 pointer-events-none z-40"
        width="100%"
        height="100%"
      >
        {trails.map((t) => {
          const geo = trailGeo.get(t.id);
          if (!geo) return null;
          const statusColor =
            t.status === 'failed' ? '#ef4444'
            : t.status === 'confirmed' ? '#10b981'
            : t.tierHex ?? '#22d3ee';
          return (
            <g key={t.id}>
              <line
                x1={geo.src.x}
                y1={geo.src.y}
                x2={geo.dst.x}
                y2={geo.dst.y}
                stroke={statusColor}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                opacity={0.6}
              />
            </g>
          );
        })}
      </svg>
    );
  }

  // Particles render as positioned circles. We compute each particle's
  // current (x, y) via cubicBezier with control points pulled toward
  // a midpoint above the chord, giving a gentle arc.
  //
  // Trails WITHOUT anchors render as status pills in the bottom-left
  // corner — the "every payment automatically feels alive" tier.
  const anchoredTrails = trails.filter((t) => t.sourceEl && t.destEl);
  const pillTrails = trails.filter((t) => !t.sourceEl || !t.destEl);

  return (
    <>
      <svg
        aria-hidden
        className="fixed inset-0 pointer-events-none z-40"
        width="100%"
        height="100%"
      >
        {particles.map((p, i) => {
          const trail = trails.find((t) => t.id === p.trailId);
          if (!trail || !trail.sourceEl || !trail.destEl) return null;
          const geo = trailGeo.get(p.trailId);
          if (!geo) return null;
          // Bezier control points: lift the curve halfway up and toward viewport center.
          const cx1 = geo.src.x + (geo.dst.x - geo.src.x) * 0.3;
          const cy1 = Math.min(geo.src.y, geo.dst.y) - 60;
          const cx2 = geo.src.x + (geo.dst.x - geo.src.x) * 0.7;
          const cy2 = Math.min(geo.src.y, geo.dst.y) - 30;
          const pt = cubicBezier(
            p.phase,
            geo.src.x, geo.src.y,
            cx1, cy1,
            cx2, cy2,
            geo.dst.x, geo.dst.y,
          );
          const fadeIn = Math.min(1, p.phase * 6);
          const fadeOut = trail.status === 'failed'
            ? Math.max(0, p.phase * 1.5)
            : 1 - Math.abs(0.5 - p.phase) * 0.6;
          const opacity = Math.max(0, fadeIn * fadeOut);
          return (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={p.r}
              fill={p.color}
              opacity={opacity}
            />
          );
        })}
        {anchoredTrails.length === 0 && null}
      </svg>

      {/* Status pills for unanchored trails. */}
      {pillTrails.length > 0 && (
        <div className="fixed bottom-24 left-4 md:bottom-8 z-40 flex flex-col gap-2 pointer-events-none">
          {pillTrails.map((trail) => {
            const isTerminal = trail.status === 'confirmed' || trail.status === 'failed';
            const bg =
              trail.status === 'failed' ? 'bg-red-500/15 border-red-500/40 text-red-200'
              : trail.status === 'confirmed' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
              : 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200';
            const label = trail.label ?? 'Transaction';
            const statusText = (() => {
              switch (trail.status) {
                case 'pending':   return 'Preparing…';
                case 'signing':   return 'Awaiting signature…';
                case 'submitted': return 'Submitted, waiting for confirmation…';
                case 'confirmed': return 'Confirmed';
                case 'failed':    return trail.error ? `Failed: ${trail.error.slice(0, 60)}` : 'Failed';
              }
            })();
            return (
              <div
                key={trail.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border backdrop-blur-md text-xs font-medium ${bg} ${
                  isTerminal ? 'opacity-100' : ''
                }`}
                style={{ minWidth: 200 }}
              >
                {/* Tiny pulsing dot indicates non-terminal status. */}
                {!isTerminal && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                )}
                <span className="font-semibold">{label}</span>
                <span className="opacity-80">·</span>
                <span>{statusText}</span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
