'use client';

/**
 * MonumentBackdrop — the VF Monument as a structural page element, not a logo.
 *
 * VARIANTS
 * --------
 * 'hero'     — absolute, clipped to its parent section (original behaviour).
 *              Use when you want the monument to live only inside a specific section.
 * 'full'     — absolute, fills the section it's placed in at a larger scale.
 * 'fixed'    — fixed to the viewport, z-index -20, persists through scroll.
 *              Fades with scroll via the scrollFade prop. Use once per layout
 *              (typically ClientLayout or a page root) so it follows the user.
 *
 * PROPS
 * -----
 * intensity   — 0..1 glow. Undefined → autonomous sine pulse.
 * scrollFade  — when true (default for 'fixed'), the component listens to
 *               window.scrollY and dims the monument after the first viewport.
 *               Keeps it visible at the top, near-invisible deep in the page.
 * vertexHex   — override the vertex/edge colour. Defaults to brand cyan.
 */

import { useEffect, useState } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

interface MonumentBackdropProps {
  intensity?: number;
  variant?: 'hero' | 'full' | 'fixed';
  scrollFade?: boolean;
  vertexHex?: string;
  className?: string;
}

export function MonumentBackdrop({
  intensity,
  variant = 'hero',
  scrollFade,
  vertexHex = '#17E8F0',
  className = '',
}: MonumentBackdropProps) {
  const reduce = usePrefersReducedMotion();

  // ── Autonomous glow pulse (when intensity not supplied) ───────────────────
  const [pulse, setPulse] = useState(0.5);
  useEffect(() => {
    if (intensity !== undefined || reduce) return;
    let raf = 0;
    let cancelled = false;
    let lastTick = 0;
    const start = performance.now();
    const tick = (now: number) => {
      if (cancelled) return;
      if (now - lastTick >= 50) {
        lastTick = now;
        const t = (now - start) / 1000;
        setPulse(0.5 + 0.5 * Math.sin((t / 6) * Math.PI * 2));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }, [intensity, reduce]);

  // ── Scroll-based opacity fade (for 'fixed' variant) ──────────────────────
  const shouldFade = scrollFade ?? (variant === 'fixed');
  const [scrollOpacity, setScrollOpacity] = useState(1);
  useEffect(() => {
    if (!shouldFade) return;
    const onScroll = () => {
      const vh = window.innerHeight;
      const y = window.scrollY;
      // Full opacity in the first 30% of the viewport, gone by 120% of viewport
      const raw = 1 - Math.max(0, (y - vh * 0.3) / (vh * 0.9));
      setScrollOpacity(Math.max(0, Math.min(1, raw)));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // set initial
    return () => window.removeEventListener('scroll', onScroll);
  }, [shouldFade]);

  const effective = intensity !== undefined ? Math.max(0, Math.min(1, intensity)) : pulse;

  const vertexOpacity = 0.4 + effective * 0.6;
  const auraScale = 1 + effective * 0.2;
  const edgeOpacity = 0.25 + effective * 0.35;

  // ── Position class by variant ─────────────────────────────────────────────
  const wrapClass =
    variant === 'fixed'
      ? `pointer-events-none fixed inset-0 -z-20 select-none overflow-hidden ${className}`
      : `pointer-events-none absolute inset-0 -z-10 select-none overflow-hidden ${className}`;

  // ── SVG position class by variant ─────────────────────────────────────────
  const svgClass =
    variant === 'full'
      ? 'absolute left-1/2 top-1/2 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 opacity-90'
      : variant === 'fixed'
      // For fixed: anchor the vertex near the bottom-centre of the viewport
      ? 'absolute left-1/2 bottom-[-5%] w-[min(900px,90vw)] h-auto -translate-x-1/2 opacity-70'
      : 'absolute left-1/2 top-1/2 h-[140%] max-h-[1100px] w-auto min-w-[700px] -translate-x-1/2 -translate-y-1/2 opacity-80';

  return (
    <div
      className={wrapClass}
      style={variant === 'fixed' ? { opacity: scrollOpacity, transition: 'opacity 0.1s linear' } : undefined}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 400 440"
        preserveAspectRatio="xMidYMid meet"
        className={svgClass}
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
            cx="0" cy="0" r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform={`translate(200 364) rotate(90) scale(${(24 * auraScale).toFixed(2)} ${(72 * auraScale).toFixed(2)})`}
          >
            <stop offset="0" stopColor={vertexHex} stopOpacity={(vertexOpacity * 0.45).toFixed(3)} />
            <stop offset="1" stopColor={vertexHex} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="mbd-bloom" cx="0.5" cy="1" r="0.6">
            <stop offset="0" stopColor={vertexHex} stopOpacity={(vertexOpacity * 0.25).toFixed(3)} />
            <stop offset="1" stopColor={vertexHex} stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect x="0" y="200" width="400" height="240" fill="url(#mbd-bloom)" />
        <ellipse
          cx="200" cy="386"
          rx={88 * auraScale} ry={18 * auraScale}
          fill="url(#mbd-vGlow)"
        />
        <path d="M72 56H114L192 320L176 320L72 56Z" fill="url(#mbd-vLeft)" />
        <path d="M328 56H286L208 320H224L328 56Z" fill="url(#mbd-vRight)" />
        <path d="M72 56L200 370L328 56" stroke="url(#mbd-vEdge)" strokeWidth="2" fill="none" />
        <circle cx="200" cy="370" r={6}  fill={vertexHex} fillOpacity={vertexOpacity.toFixed(3)} />
        <circle cx="200" cy="370" r={13} fill={vertexHex} fillOpacity={(vertexOpacity * 0.18).toFixed(3)} />
        <circle cx="200" cy="370" r={22} fill={vertexHex} fillOpacity={(vertexOpacity * 0.08).toFixed(3)} />
        <circle cx="200" cy="370" r={36} fill={vertexHex} fillOpacity={(vertexOpacity * 0.04).toFixed(3)} />
      </svg>
    </div>
  );
}

export default MonumentBackdrop;
