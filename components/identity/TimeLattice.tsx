'use client';

/**
 * TimeLattice — a thin page-top strip that visualizes every active
 * timelock on the user's vault as a row of hour-cells.
 *
 * The lattice's purpose is the same as a progress bar in a downloader:
 * make the timelock layer feel like infrastructure the user owns, not
 * friction imposed on them. Once you can see your timelocks always
 * present, "the wait" stops feeling like a delay and starts feeling
 * like a queue you're watching tick down.
 *
 * Encoding:
 *   - Each entry is one row of cells. Cell width is proportional to
 *     the original delay (typically 7d / 168h), so a 7-day SENSITIVE
 *     change and a 24-hour wallet rotation render at the same scale
 *     and you can tell which one is more urgent by how many cells are
 *     still empty.
 *   - Filled cells = elapsed time. Empty cells = remaining time.
 *   - The leftmost-empty cell on each row is highlighted — it's the
 *     "next minute that has to pass" for that entry.
 *   - The whole strip is hidden when there are no active timelocks.
 *
 * Position: sits just below TopNav (z-40) when present, anchored to the
 * page top. Single row per timelock entry, max 4 rows visible. If more
 * than 4 timelocks exist, the lattice shows the 4 with the earliest
 * `executeAfter` and an "+N more" overflow indicator.
 *
 * Reduced motion: no shimmer/pulse on the leftmost-empty cell. Static
 * gradient differentiates filled from empty.
 *
 * Honest constraint: useTimelocks can only see entries whose Proposed
 * event was emitted while the user was online (the event-history window
 * varies by RPC). The lattice surfaces only what the hook can see;
 * we don't fabricate entries.
 */

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTimelocks, type Timelock, formatTimelockRemaining } from '@/hooks/useTimelocks';
import { usePrefersReducedMotion } from '@/app/components/usePrefersReducedMotion';
import { TIER_HEX } from '@/lib/animation/visualPrimitives';

/** Map each timelock kind to a color so the user can tell rows apart at a glance. */
const KIND_COLOR: Record<Timelock['kind'], string> = {
  withdrawal:             '#f59e0b', // amber — the most common
  payment:                '#a855f7', // violet
  spendLimits:            '#06b6d4', // cyan
  largeTransferThreshold: '#22d3ee', // bright cyan
  guardianChange:         '#3b82f6', // blue
  tokenApproval:          '#ec4899', // pink — rare/sensitive
  walletRotation:         '#ef4444', // red — high stakes
};

/** Human label for each kind, used in the tooltip. */
const KIND_LABEL: Record<Timelock['kind'], string> = {
  withdrawal:             'Withdrawal',
  payment:                'Payment',
  spendLimits:            'Spend-limit change',
  largeTransferThreshold: 'Queue-threshold change',
  guardianChange:         'Guardian change',
  tokenApproval:          'Token approval',
  walletRotation:         'Wallet rotation',
};

/** Number of cells per row. We use 24 by default — enough granularity
 *  for a 7-day window (each cell ≈ 7h) without blowing out width. */
const CELL_COUNT = 24;
/** How many rows to show before overflowing into the "+N more" indicator. */
const MAX_VISIBLE_ROWS = 4;

export function TimeLattice() {
  const { timelocks, isLoading } = useTimelocks();
  const reduce = usePrefersReducedMotion();

  // Tick once per minute so the cells repaint without us holding open an rAF
  // loop. The lattice doesn't need 60fps — it's a slow timer display.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const sorted = useMemo(() => {
    return [...timelocks].sort((a, b) => Number(a.executeAfter - b.executeAfter));
  }, [timelocks]);

  // Hide entirely when nothing is pending — the lattice should never be
  // visual noise on a calm vault.
  if (isLoading || sorted.length === 0) return null;

  const visible = sorted.slice(0, MAX_VISIBLE_ROWS);
  const overflow = sorted.length - visible.length;

  return (
    <div
      className="pointer-events-none fixed left-0 right-0 top-7 md:top-[5.25rem] z-30 flex justify-center px-4"
      aria-label="Pending timelocks"
    >
      <div className="pointer-events-auto rounded-b-lg border border-t-0 border-white/10 bg-zinc-950/85 px-3 py-2 shadow-md backdrop-blur-sm">
        <AnimatePresence initial={false}>
          {visible.map((tl) => (
            <LatticeRow
              key={tl.key}
              timelock={tl}
              nowMs={nowMs}
              reduce={reduce}
            />
          ))}
        </AnimatePresence>
        {overflow > 0 && (
          <div className="mt-1 text-[10px] text-gray-500">
            +{overflow} more timelock{overflow === 1 ? '' : 's'} pending
          </div>
        )}
      </div>
    </div>
  );
}

interface LatticeRowProps {
  timelock: Timelock;
  nowMs: number;
  reduce: boolean;
}

function LatticeRow({ timelock, nowMs, reduce }: LatticeRowProps) {
  const color = KIND_COLOR[timelock.kind];
  const label = KIND_LABEL[timelock.kind];

  const executeAfterMs = Number(timelock.executeAfter) * 1000;
  const remainingMs = Math.max(0, executeAfterMs - nowMs);

  // Estimate total window. We don't always know the original delay
  // (especially for replayed events), so we use a sensible default per
  // kind: 7d for sensitive admin changes + queues, 24h for wallet
  // rotation (the median we recommend on Lock-My-Vault).
  const totalMs =
    timelock.kind === 'walletRotation' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;

  const elapsed = totalMs - remainingMs;
  const progress = Math.max(0, Math.min(1, elapsed / totalMs));
  const filledCells = Math.floor(progress * CELL_COUNT);
  const isReady = remainingMs <= 0;

  // Format short label for the row's left side. We trim long labels so
  // the row stays visually consistent regardless of content.
  const detailLabel = timelock.label || label;
  const shortLabel = detailLabel.length > 28 ? detailLabel.slice(0, 27) + '…' : detailLabel;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.18 }}
      className="flex items-center gap-2 text-[10px] leading-tight"
      title={`${label}${timelock.label ? ' — ' + timelock.label : ''} · ${
        isReady ? 'Ready' : formatTimelockRemaining(timelock.executeAfter) + ' remaining'
      }`}
    >
      <span
        className="inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full"
        style={{ background: color }}
      />
      <span className="w-32 truncate text-gray-300">{shortLabel}</span>
      <div
        className="flex flex-1 gap-[1px]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={CELL_COUNT}
        aria-valuenow={filledCells}
      >
        {Array.from({ length: CELL_COUNT }).map((_, i) => {
          const isFilled = i < filledCells;
          const isLeading = !isReady && i === filledCells;
          const cellOpacity = isFilled ? 0.9 : isLeading ? 0.65 : 0.18;
          const cellColor = isReady ? TIER_HEX.elite : color;
          return (
            <span
              key={i}
              className="h-2 flex-1 rounded-[1px] transition-opacity"
              style={{
                background: cellColor,
                opacity: cellOpacity,
                // The leading cell shimmers gently unless reduced-motion is set.
                animation:
                  isLeading && !reduce ? 'pulse 1.4s ease-in-out infinite' : undefined,
              }}
            />
          );
        })}
      </div>
      <span
        className="w-16 flex-shrink-0 text-right tabular-nums"
        style={{ color: isReady ? TIER_HEX.elite : '#9ca3af' }}
      >
        {isReady ? 'ready' : formatTimelockRemaining(timelock.executeAfter)}
      </span>
    </motion.div>
  );
}
