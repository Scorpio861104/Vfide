'use client';

/**
 * Shared particle primitive.
 *
 * Extracted from FeeFlowRiver so other "alive" visualizations
 * (TransactionTrail, BurnFurnace, etc.) share one rAF loop pattern,
 * one reduced-motion fallback, and one performance budget.
 *
 * Design constraints inherited from FeeFlowRiver:
 *   - Single requestAnimationFrame loop per system.
 *   - Particles live in a flat mutable array — never re-allocated.
 *   - React state is updated at most ~10 Hz via a throttled snapshot.
 *   - When prefers-reduced-motion is set, no animation loop runs;
 *     consumers render a static fallback.
 *
 * Usage:
 *   const system = useParticleSystem({
 *     spawn: () => ({ ... }),     // called when emit() is invoked
 *     update: (p, dt) => { ... }, // mutate the particle in place
 *     reap: (p, now) => p.t1 < now, // return true to remove
 *     onSnapshot: (particles) => setRenderState(particles),
 *   });
 *   // Later: system.emit() to spawn one.
 */

import { useCallback, useEffect, useRef } from 'react';

export interface BaseParticle {
  id: number;
  /** Spawn time (ms since the system started). Useful for easing. */
  t0: number;
  /** Live flag — set to false to remove from the system. */
  alive: boolean;
}

interface UseParticleSystemArgs<P extends BaseParticle> {
  /** Called to manufacture a particle when emit() fires. */
  spawn: (now: number) => Omit<P, 'id' | 't0' | 'alive'>;
  /** Mutates the particle in place each frame. dt is ms since last tick. */
  update?: (p: P, dt: number, now: number) => void;
  /** Returns true when the particle should be removed. */
  reap?: (p: P, now: number) => boolean;
  /** Called at most once per ~100ms with the current particle array. */
  onSnapshot?: (particles: P[]) => void;
  /** Hard cap on simultaneous particles (default 200). Older particles get culled. */
  maxParticles?: number;
  /** Whether the system loop should run. When false, no rAF runs. Default true. */
  enabled?: boolean;
}

export interface ParticleSystemHandle<P extends BaseParticle> {
  /** Spawn a particle now. Returns its id, or -1 if the system is disabled. */
  emit: () => number;
  /** Returns the current particle buffer (read-only — do not mutate). */
  snapshot: () => readonly P[];
  /** Remove all particles immediately. */
  clear: () => void;
}

/**
 * Particle system hook. Owns the rAF loop, the flat buffer, and the
 * throttled snapshot. Consumers call emit() and receive a stable handle.
 *
 * The hook does NOT render anything on its own — that's the consumer's job.
 * This separation matches FeeFlowRiver's pattern: the math lives in a hook,
 * the SVG markup lives in a component.
 */
export function useParticleSystem<P extends BaseParticle>(
  args: UseParticleSystemArgs<P>,
): ParticleSystemHandle<P> {
  const {
    spawn,
    update,
    reap,
    onSnapshot,
    maxParticles = 200,
    enabled = true,
  } = args;

  const particlesRef = useRef<P[]>([]);
  const idRef = useRef(0);
  const startedAtRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const lastSnapshotRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  // Pin the latest callbacks in refs so the rAF loop never restarts due to
  // identity changes in spawn/update/reap. This is what keeps long-running
  // animations smooth across consumer re-renders.
  const spawnRef = useRef(spawn);
  const updateRef = useRef(update);
  const reapRef = useRef(reap);
  const onSnapshotRef = useRef(onSnapshot);
  useEffect(() => {
    spawnRef.current = spawn;
    updateRef.current = update;
    reapRef.current = reap;
    onSnapshotRef.current = onSnapshot;
  }, [spawn, update, reap, onSnapshot]);

  const emit = useCallback((): number => {
    if (!enabled) return -1;
    const now = performance.now() - startedAtRef.current;
    const partial = spawnRef.current(now);
    const id = ++idRef.current;
    const p = { ...partial, id, t0: now, alive: true } as P;
    const buf = particlesRef.current;
    buf.push(p);
    // Cull oldest if the buffer overflows.
    while (buf.length > maxParticles) buf.shift();
    return id;
  }, [enabled, maxParticles]);

  const snapshot = useCallback((): readonly P[] => particlesRef.current, []);

  const clear = useCallback(() => {
    particlesRef.current = [];
    onSnapshotRef.current?.([]);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    startedAtRef.current = performance.now();
    lastTickRef.current = 0;

    const tick = () => {
      const nowAbs = performance.now();
      const now = nowAbs - startedAtRef.current;
      const dt = lastTickRef.current === 0 ? 16 : now - lastTickRef.current;
      lastTickRef.current = now;

      const buf = particlesRef.current;
      const u = updateRef.current;
      const r = reapRef.current;
      // Update + reap in a single forward sweep.
      let write = 0;
      for (let read = 0; read < buf.length; read++) {
        const p = buf[read]!;
        if (u) u(p, dt, now);
        if (p.alive && !(r && r(p, now))) {
          if (write !== read) buf[write] = p;
          write++;
        }
      }
      buf.length = write;

      // Throttled snapshot — ~10 Hz, never on the hot path.
      if (now - lastSnapshotRef.current > 100) {
        lastSnapshotRef.current = now;
        onSnapshotRef.current?.([...buf]);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [enabled]);

  return { emit, snapshot, clear };
}

/**
 * Cubic bezier evaluator. Used by trajectory functions so consumers can
 * sketch a curve with (start, ctrl1, ctrl2, end) and call this each frame.
 *
 * t ∈ [0, 1]. Returns (x, y) at t.
 */
export function cubicBezier(
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

/**
 * Cubic ease-out — standard "decelerating to rest" curve. Use for landings.
 */
export function easeOutCubic(t: number): number {
  const u = 1 - t;
  return 1 - u * u * u;
}

/**
 * Linear pulse 0→1→0 over the t∈[0,1] lifetime. Useful for opacity envelopes.
 */
export function pulseEnvelope(t: number): number {
  return t < 0.5 ? t * 2 : 1 - (t - 0.5) * 2;
}
