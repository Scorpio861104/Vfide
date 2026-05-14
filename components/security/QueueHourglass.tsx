'use client';

/**
 * QueueHourglass — falling-sand SVG for a single timelocked item.
 *
 * Used by:
 *   - LockVaultPanel cancel-queue section (per queued withdrawal/payment)
 *   - GuardianPendingQueueWidget (per item across guarded vaults)
 *
 * Visual story: the top bulb empties as time passes; the bottom bulb
 * fills. When executeAfter is reached, the bottom bulb pulses to signal
 * "this can fire now".
 *
 * Math: progress = elapsed / total_window (default 7 days). The top bulb
 * shows (1 - progress) worth of sand; the bottom shows progress worth.
 * A thin stream of falling sand connects them while in flight, with a
 * subtle sway over time. We update at ~2 Hz — sand isn't supposed to
 * jitter every frame.
 *
 * Reduced motion: no animation loop runs. We compute progress once at
 * mount and render the equivalent static shape. The component never
 * lies about state — the static view shows where the timer is right now.
 */

import { useEffect, useState, useMemo } from 'react';
import { timelockProgress, formatTimelockRemaining } from '@/hooks/useTimelocks';
import { usePrefersReducedMotion } from '@/app/components/usePrefersReducedMotion';

const SEVEN_DAYS_SEC = 7n * 24n * 60n * 60n;

interface QueueHourglassProps {
  /** Unix-second timestamp when this entry becomes executable. */
  executeAfterSec: bigint;
  /** Total window for this timelock (default 7 days). */
  totalWindowSec?: bigint;
  /** Visual size — width in px. Height is 1.3× width. Default 44. */
  size?: number;
  /** Optional accent hex color for the sand. Default amber/cyan blend. */
  accent?: string;
  /** Whether this entry is already executable (sand has run out). */
  showLabel?: boolean;
}

export function QueueHourglass({
  executeAfterSec,
  totalWindowSec = SEVEN_DAYS_SEC,
  size = 44,
  accent = '#fbbf24',
  showLabel = false,
}: QueueHourglassProps) {
  const reducedMotion = usePrefersReducedMotion();

  const [progress, setProgress] = useState(() =>
    timelockProgress(executeAfterSec, totalWindowSec),
  );

  // Slow tick — sand falling reads better at 2 Hz than 60 Hz, and we
  // don't need finer resolution for a 7-day window.
  useEffect(() => {
    if (reducedMotion) return;
    const id = window.setInterval(() => {
      setProgress(timelockProgress(executeAfterSec, totalWindowSec));
    }, 500);
    return () => window.clearInterval(id);
  }, [executeAfterSec, totalWindowSec, reducedMotion]);

  const ready = progress >= 1;
  const remainingLabel = useMemo(
    () => formatTimelockRemaining(executeAfterSec),
    [executeAfterSec, progress],
  );

  const w = size;
  const h = Math.round(size * 1.3);
  const cx = w / 2;

  // Bulb geometry: two trapezoids joined at a narrow waist.
  // Upper bulb shrinks as sand falls; lower bulb grows.
  const upperTopY = h * 0.1;
  const waistY = h * 0.5;
  const lowerBottomY = h * 0.9;

  // Sand levels.
  const upperLevel = upperTopY + (waistY - upperTopY) * progress;
  const lowerLevel = lowerBottomY - (lowerBottomY - waistY) * progress;

  // Stream visibility — only while in flight.
  const streamOpacity = !ready && progress > 0 ? 0.7 : 0;

  return (
    <div
      className="inline-flex flex-col items-center"
      title={ready ? 'Executable now' : `Executes in ${remainingLabel}`}
    >
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
        {/* Glass outline — two trapezoids forming an hourglass silhouette. */}
        <path
          d={`
            M ${cx - w * 0.32} ${upperTopY}
            L ${cx + w * 0.32} ${upperTopY}
            L ${cx + w * 0.06} ${waistY}
            L ${cx + w * 0.32} ${lowerBottomY}
            L ${cx - w * 0.32} ${lowerBottomY}
            L ${cx - w * 0.06} ${waistY}
            Z
          `}
          fill="rgba(255,255,255,0.04)"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth={0.8}
        />

        {/* Upper sand region — fills from waist UP to its current level. */}
        <clipPath id={`upper-${executeAfterSec.toString()}`}>
          <path
            d={`
              M ${cx - w * 0.32} ${upperTopY}
              L ${cx + w * 0.32} ${upperTopY}
              L ${cx + w * 0.06} ${waistY}
              L ${cx - w * 0.06} ${waistY}
              Z
            `}
          />
        </clipPath>
        <rect
          x={0}
          y={upperLevel}
          width={w}
          height={waistY - upperLevel}
          fill={ready ? '#666' : accent}
          opacity={ready ? 0.3 : 0.85}
          clipPath={`url(#upper-${executeAfterSec.toString()})`}
        />

        {/* Lower sand region — fills from base UP to its current level. */}
        <clipPath id={`lower-${executeAfterSec.toString()}`}>
          <path
            d={`
              M ${cx - w * 0.06} ${waistY}
              L ${cx + w * 0.06} ${waistY}
              L ${cx + w * 0.32} ${lowerBottomY}
              L ${cx - w * 0.32} ${lowerBottomY}
              Z
            `}
          />
        </clipPath>
        <rect
          x={0}
          y={lowerLevel}
          width={w}
          height={lowerBottomY - lowerLevel}
          fill={ready ? '#ef4444' : accent}
          opacity={ready ? 0.7 : 0.85}
          clipPath={`url(#lower-${executeAfterSec.toString()})`}
        >
          {ready && !reducedMotion && (
            <animate attributeName="opacity" values="0.4;0.9;0.4" dur="1.5s" repeatCount="indefinite" />
          )}
        </rect>

        {/* Falling stream — single 1px column through the waist. */}
        <rect
          x={cx - 0.5}
          y={waistY - w * 0.04}
          width={1}
          height={w * 0.08}
          fill={accent}
          opacity={streamOpacity}
        />

        {/* Frame highlights at the top and bottom caps. */}
        <line
          x1={cx - w * 0.36}
          y1={upperTopY}
          x2={cx + w * 0.36}
          y2={upperTopY}
          stroke="rgba(255,255,255,0.5)"
          strokeWidth={1.2}
          strokeLinecap="round"
        />
        <line
          x1={cx - w * 0.36}
          y1={lowerBottomY}
          x2={cx + w * 0.36}
          y2={lowerBottomY}
          stroke="rgba(255,255,255,0.5)"
          strokeWidth={1.2}
          strokeLinecap="round"
        />
      </svg>

      {showLabel && (
        <div className={`text-[10px] mt-1 font-medium ${ready ? 'text-red-400' : 'text-gray-400'}`}>
          {ready ? 'executable now' : remainingLabel}
        </div>
      )}
    </div>
  );
}
