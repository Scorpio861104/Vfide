'use client';

/**
 * ProofScoreCrystal — the user's score as a faceted Monument-shaped crystal.
 *
 * Visual encoding:
 *   - Tier color   ← brightness of all facets
 *   - Score (0-10000) ← number of "lit" facets (out of 6)
 *   - Score change ← subtle ripple animation on each render where the score moved
 *
 * Drop-in: same footprint as a typical score badge. Pass `size` to scale.
 *
 * Reduced motion: no ripple, no pulse — just the lit facets at the current score.
 */

import { useEffect, useState } from 'react';
import { useProofScore } from '@/hooks/useProofScore';
import { usePrefersReducedMotion } from '@/app/components/usePrefersReducedMotion';

interface ProofScoreCrystalProps {
  /** Height in px. Width is 0.6× height. Default 40. */
  size?: number;
  /** Show the numeric score next to the crystal. Default true. */
  showScore?: boolean;
}

function tierColor(score: number): string {
  if (score >= 8000) return '#00FF88';
  if (score >= 7000) return '#00F0FF';
  if (score >= 5000) return '#FFD700';
  if (score >= 3500) return '#FFA500';
  return '#FF4444';
}

export function ProofScoreCrystal({ size = 40, showScore = true }: ProofScoreCrystalProps) {
  const { score, tierName, isLoading } = useProofScore();
  const reducedMotion = usePrefersReducedMotion();
  const numeric = typeof score === 'number' ? score : 0;

  // 0..6 lit facets — each represents 1666 points.
  const lit = Math.max(0, Math.min(6, Math.floor(numeric / 1666)));
  const color = isLoading ? '#666' : tierColor(numeric);

  // Ripple on score change.
  const [rippleKey, setRippleKey] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  useEffect(() => {
    if (isLoading) return;
    if (prev !== null && prev !== numeric) {
      setRippleKey((k) => k + 1);
    }
    setPrev(numeric);
  }, [numeric, isLoading, prev]);

  const h = size;
  const w = Math.round(size * 0.6);
  const cx = w / 2;
  const top = h * 0.08;
  const bottom = h * 0.92;
  const midY = h * 0.5;
  const halfW = w * 0.4;

  // Six facets — three on the left, three on the right, stacked top→bottom.
  const facetPaths = [
    // Top-left
    `M ${cx} ${top} L ${cx - halfW} ${midY * 0.7} L ${cx} ${midY * 0.5} Z`,
    // Top-right
    `M ${cx} ${top} L ${cx + halfW} ${midY * 0.7} L ${cx} ${midY * 0.5} Z`,
    // Middle-left
    `M ${cx - halfW} ${midY * 0.7} L ${cx - halfW} ${midY * 1.3} L ${cx} ${midY * 1.1} L ${cx} ${midY * 0.5} Z`,
    // Middle-right
    `M ${cx + halfW} ${midY * 0.7} L ${cx + halfW} ${midY * 1.3} L ${cx} ${midY * 1.1} L ${cx} ${midY * 0.5} Z`,
    // Bottom-left
    `M ${cx - halfW} ${midY * 1.3} L ${cx} ${bottom} L ${cx} ${midY * 1.1} Z`,
    // Bottom-right
    `M ${cx + halfW} ${midY * 1.3} L ${cx} ${bottom} L ${cx} ${midY * 1.1} Z`,
  ];

  return (
    <div
      className="inline-flex items-center gap-2"
      title={isLoading ? 'Loading score…' : `${numeric.toLocaleString()} (${tierName || ''})`}
    >
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
        {/* Background glow on the crystal when active. */}
        {!reducedMotion && lit > 0 && (
          <ellipse
            cx={cx}
            cy={midY}
            rx={halfW * 1.5}
            ry={h * 0.5}
            fill={color}
            opacity={0.08}
          />
        )}

        {/* Each facet — lit if its index is within `lit`. */}
        {facetPaths.map((d, i) => {
          const isLit = i < lit;
          return (
            <path
              key={i}
              d={d}
              fill={isLit ? color : 'rgba(255,255,255,0.06)'}
              fillOpacity={isLit ? 0.65 : 1}
              stroke={isLit ? color : 'rgba(255,255,255,0.25)'}
              strokeWidth={0.8}
              strokeOpacity={isLit ? 0.9 : 0.5}
            />
          );
        })}

        {/* Ripple — appears once on score change, then expires. */}
        {!reducedMotion && rippleKey > 0 && (
          <circle
            key={`ripple-${rippleKey}`}
            cx={cx}
            cy={midY}
            r={2}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            opacity={0.8}
          >
            <animate attributeName="r" from={2} to={Math.max(w, h) * 0.55} dur="1.4s" fill="freeze" />
            <animate attributeName="opacity" from="0.8" to="0" dur="1.4s" fill="freeze" />
          </circle>
        )}
      </svg>
      {showScore && (
        <div className="text-sm font-bold tabular-nums" style={{ color }}>
          {isLoading ? '—' : numeric.toLocaleString()}
        </div>
      )}
    </div>
  );
}
