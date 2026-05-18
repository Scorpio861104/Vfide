'use client';

/**
 * TierAurora — ambient identity strip at the top of every page.
 *
 * 4px tall, full-width gradient tinted to the user's current ProofScore
 * tier color. Never demands attention; never absent. When the score
 * crosses a tier boundary, the gradient briefly intensifies before
 * settling.
 *
 * Reduced motion: no intensify animation; gradient transitions are CSS
 * `transition: opacity` only, which the user agent already respects.
 *
 * Cost: one read of useProofScore (already cached across the app).
 */

import { useEffect, useState } from 'react';
import { useProofScore } from '@/hooks/useProofScore';
import { usePrefersReducedMotion } from '@/app/components/usePrefersReducedMotion';

/** Tier color map mirrors hooks/useProofScore getTierColor — kept private here so
 *  the Aurora doesn't need that helper exported. */
function tierColor(score: number): string {
  if (score >= 8000) return '#00FF88';
  if (score >= 7000) return '#00F0FF';
  if (score >= 5000) return '#FFD700';
  if (score >= 3500) return '#FFA500';
  return '#FF4444';
}

/** Which tier bucket the score is in — used to detect cross-events for the flash. */
function tierBucket(score: number): number {
  if (score >= 8000) return 4;
  if (score >= 7000) return 3;
  if (score >= 5000) return 2;
  if (score >= 3500) return 1;
  return 0;
}

export function TierAurora() {
  const { score, isLoading } = useProofScore();
  const reducedMotion = usePrefersReducedMotion();
  const numericScore = typeof score === 'number' ? score : 0;

  const [intensify, setIntensify] = useState(false);
  const [lastBucket, setLastBucket] = useState<number | null>(null);

  useEffect(() => {
    if (isLoading) return;
    const bucket = tierBucket(numericScore);
    if (lastBucket === null) {
      setLastBucket(bucket);
      return;
    }
    if (bucket !== lastBucket) {
      setLastBucket(bucket);
      if (reducedMotion) return;
      setIntensify(true);
      const id = window.setTimeout(() => setIntensify(false), 1800);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [numericScore, isLoading, lastBucket, reducedMotion]);

  // When loading we still render a faint neutral strip so the layout
  // doesn't shift on initial paint.
  const color = isLoading ? '#666' : tierColor(numericScore);
  const opacity = isLoading ? 0.25 : intensify ? 0.95 : 0.55;

  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 z-50 pointer-events-none"
      style={{
        height: 4,
        background: `linear-gradient(90deg, transparent 0%, ${color} 25%, ${color} 75%, transparent 100%)`,
        opacity,
        transition: 'opacity 600ms ease-out, background 1200ms ease-out',
      }}
    />
  );
}
