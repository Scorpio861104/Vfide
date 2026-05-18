'use client';

/**
 * MonumentBackdrop — the VF Monument as a structural page element, not a logo.
 *
 * What this is: a large faint version of the canonical Monument SVG
 * (the V's faceted arms + the luminous vertex at the bottom) sitting
 * behind the hero. It's not a watermark — at the largest breakpoint
 * the mark fills roughly half the viewport vertically. The vertex glow
 * modulates with `intensity` (0..1).
 *
 * Why this is part of the wow set: the brand identity Vanta designed
 * (the Monument) was being used as a 140px logo and nothing else. As a
 * page-scale element it anchors the entire visual system — the rest of
 * the components (LiveProofScoreHero, FeeFlowRiver) sit on top of it
 * rather than competing with it.
 *
 * Honest constraint: this stays decorative. It pulses but doesn't pretend
 * to display real-time data. The `intensity` prop can be wired up to the
 * connected user's ProofScore, the global activity stream, or both —
 * but if nothing's wired in, the default is a calm autonomous pulse
 * that suggests "the system is breathing."
 */

import { useEffect, useState } from 'react';

import { usePrefersReducedMotion } from './usePrefersReducedMotion';

interface MonumentBackdropProps {
  /**
   * 0..1 glow intensity. If undefined, the component runs a gentle
   * autonomous pulse so the page never looks dead.
   */
  intensity?: number;
  /**
   * Position: 'hero' anchors it behind the hero area; 'full' makes it
   * fill the section it's placed in.
   */
  variant?: 'hero' | 'full';
  /** Override the vertex tier color (hex). Defaults to brand cyan. */
  vertexHex?: string;
  className?: string;
}

export function MonumentBackdrop({
  intensity,
  variant = 'hero',
  vertexHex = '#17E8F0',
  className = '',
}: MonumentBackdropProps) {
  const reduce = usePrefersReducedMotion();

  // Autonomous pulse when no intensity prop is given. We keep it slow
  // (4–6 sec period) so it never competes with the foreground. The
  // sine wave changes slowly enough that we can sample at 20Hz without
  // any visible stutter, which saves React from re-rendering 60 times
  // per second for what is essentially decorative motion.
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    if (intensity !== undefined || reduce) return;
    let raf = 0;
    let cancelled = false;
    let lastTick = 0;
    const start = performance.now();
    const tick = (now: number) => {
      if (cancelled) return;
      if (now - lastTick >= 50) {
        // ~20 Hz
        lastTick = now;
        const t = (now - start) / 1000;
        const v = 0.5 + 0.5 * Math.sin((t / 6) * Math.PI * 2);
        setPulse(v);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [intensity, reduce]);

  const effective = intensity !== undefined ? Math.max(0, Math.min(1, intensity)) : pulse;

  // Drive the visible attributes from `effective`:
  //   - vertex glow opacity (0.4..1.0)
  //   - aura ellipse scale (1.0..1.2)
  //   - edge stroke opacity (0.25..0.6)
  const vertexOpacity = 0.4 + effective * 0.6;
  const auraScale = 1 + effective * 0.2;
  const edgeOpacity = 0.25 + effective * 0.35;

  return (
    <div
      className={`pointer-events-none absolute inset-0 -z-10 select-none overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 400 440"
        preserveAspectRatio="xMidYMid meet"
        className={
          variant === 'full'
            ? 'absolute left-1/2 top-1/2 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 opacity-90'
            : 'absolute left-1/2 top-1/2 h-[140%] max-h-[1100px] w-auto min-w-[700px] -translate-x-1/2 -translate-y-1/2 opacity-80'
        }
      >
        <defs>
          <linearGradient id="mbd-vLeft" x1="84" y1="56" x2="188" y2="334" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#1E2E3C" />
            <stop offset="1" stopColor="#0B151D" />
          </linearGradient>
          <linearGradient id="mbd-vRight" x1="316" y1="56" x2="212" y2="334" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#2A3F4F" />
            <stop offset="1" stopColor="#101C25" />
          </linearGradient>
          <linearGradient id="mbd-vEdge" x1="200" y1="56" x2="200" y2="370" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={vertexHex} stopOpacity={(edgeOpacity * 0.9).toFixed(3)} />
            <stop offset="0.5" stopColor={vertexHex} stopOpacity={(edgeOpacity * 0.35).toFixed(3)} />
            <stop offset="1" stopColor={vertexHex} stopOpacity={edgeOpacity.toFixed(3)} />
          </linearGradient>
          <radialGradient
            id="mbd-vGlow"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform={`translate(200 364) rotate(90) scale(${(24 * auraScale).toFixed(2)} ${(72 * auraScale).toFixed(2)})`}
          >
            <stop offset="0" stopColor={vertexHex} stopOpacity={(vertexOpacity * 0.45).toFixed(3)} />
            <stop offset="1" stopColor={vertexHex} stopOpacity="0" />
          </radialGradient>
          {/* Bottom-mounted vertex bloom */}
          <radialGradient id="mbd-bloom" cx="0.5" cy="1" r="0.6">
            <stop offset="0" stopColor={vertexHex} stopOpacity={(vertexOpacity * 0.25).toFixed(3)} />
            <stop offset="1" stopColor={vertexHex} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Bottom bloom — large diffuse glow under the vertex. */}
        <rect x="0" y="200" width="400" height="240" fill="url(#mbd-bloom)" />

        {/* Vertex glow ellipse (matches /public/icon.svg) */}
        <ellipse
          cx="200"
          cy="386"
          rx={88 * auraScale}
          ry={18 * auraScale}
          fill="url(#mbd-vGlow)"
        />

        {/* The V — two faceted arms. Faint so foreground text reads. */}
        <path d="M72 56H114L192 320L176 320L72 56Z" fill="url(#mbd-vLeft)" />
        <path d="M328 56H286L208 320H224L328 56Z" fill="url(#mbd-vRight)" />

        {/* Inner traced edge that lights the V from the vertex. */}
        <path
          d="M72 56L200 370L328 56"
          stroke="url(#mbd-vEdge)"
          strokeWidth="2"
          fill="none"
        />

        {/* The luminous vertex dot. */}
        <circle cx="200" cy="370" r={6} fill={vertexHex} fillOpacity={vertexOpacity.toFixed(3)} />
        <circle cx="200" cy="370" r={13} fill={vertexHex} fillOpacity={(vertexOpacity * 0.18).toFixed(3)} />
        <circle cx="200" cy="370" r={22} fill={vertexHex} fillOpacity={(vertexOpacity * 0.08).toFixed(3)} />
        <circle cx="200" cy="370" r={36} fill={vertexHex} fillOpacity={(vertexOpacity * 0.04).toFixed(3)} />
      </svg>
    </div>
  );
}

export default MonumentBackdrop;
