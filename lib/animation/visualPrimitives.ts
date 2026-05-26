/**
 * Shared visual primitives for the "living UI" layer (FeeFlowRiver,
 * Hourglass, Constellation, ProofScore Crystal, Transaction Trail,
 * Time Lattice, Tier Aurora, Recovery Beacon).
 *
 * Three jobs:
 *
 *   1. TIER_HEX — single source of truth for tier colors, mirrored
 *      across the constellation lines, crystal facets, aurora strip,
 *      and pulse hook. Keep this in sync with the matching constants
 *      in `hooks/useProtocolPulse.ts` and `lib/constants.ts`. Diverging
 *      values would mean two adjacent components disagree on what
 *      tier the user is.
 *
 *   2. Easing — animation timing helpers used by every component that
 *      runs a single requestAnimationFrame loop. Centralized so the
 *      "feel" stays consistent (a particle in the Trail and a sand
 *      grain in the Hourglass both ease the same way).
 *
 *   3. <MonumentVertexDefs /> — the SVG <defs> the Monument uses for
 *      its luminous vertex gradient. Reused by Hourglass (the falling-
 *      sand glow), Crystal (the inner vertex), and Constellation (the
 *      hub at the center). Lets new components carry the brand
 *      identity for free.
 */

// ─── tier color mapping ──────────────────────────────────────────────────────

/**
 * Tier color hex codes for ProofScore tiers. Match `hooks/useProtocolPulse.ts`
 * and the values in `lib/constants.ts`. Single source of truth — do not
 * inline these colors in components; import them.
 */
export const TIER_HEX = {
  risky:      '#f97316',
  low:        '#f59e0b',
  neutral:    '#fbbf24',
  governance: '#10b981',
  trusted:    '#22d3ee',
  council:    '#3b82f6',
  elite:      '#a78bfa',
} as const;

export type TierKey = keyof typeof TIER_HEX;

/**
 * Resolve a tier hex from a ProofScore (0–10000 scale).
 * Mirrors `tierForScore()` in `hooks/useProtocolPulse.ts`.
 */
export function tierForScore(score: number): string {
  if (score >= 8000) return TIER_HEX.elite;
  if (score >= 7000) return TIER_HEX.council;
  if (score >= 5600) return TIER_HEX.trusted;
  if (score >= 5400) return TIER_HEX.governance;
  if (score >= 5000) return TIER_HEX.neutral;
  if (score >= 4000) return TIER_HEX.low;
  return TIER_HEX.risky;
}

/**
 * Resolve a tier label (lower-case key) from a ProofScore.
 * Used by components that need to render a tier name alongside the color.
 */
export function tierKeyForScore(score: number): TierKey {
  if (score >= 8000) return 'elite';
  if (score >= 7000) return 'council';
  if (score >= 5600) return 'trusted';
  if (score >= 5400) return 'governance';
  if (score >= 5000) return 'neutral';
  if (score >= 4000) return 'low';
  return 'risky';
}

/**
 * Tier-name labels for display. Capitalized for UI.
 */
export const TIER_LABEL: Record<TierKey, string> = {
  risky:      'Risky',
  low:        'Low trust',
  neutral:    'Neutral',
  governance: 'Governance',
  trusted:    'Trusted',
  council:    'Council',
  elite:      'Elite',
};

// ─── easing helpers ─────────────────────────────────────────────────────────

/**
 * easeOutCubic — slow-out curve used for one-shot pulses (recovery beacon,
 * monument vertex pulse, crystal score-change ripple).
 */
export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

/**
 * easeInOutSine — symmetric ease for sustained motion (sand grains
 * falling, particles flowing).
 */
export const easeInOutSine = (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2;

/**
 * linear — exposed for paths where you want the eye to perceive constant
 * velocity (a particle traversing a known straight line).
 */
export const linear = (t: number): number => t;

/**
 * clamp01 — clamps a number to [0,1]. Cheap and uses no `Math.min/max`
 * call overhead in tight rAF loops.
 */
export function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

// ─── throttle helper ────────────────────────────────────────────────────────

/**
 * Throttle a callback to fire at most once per `ms` milliseconds. Used
 * to keep React re-renders from happening on every rAF tick (60Hz) —
 * 10Hz is plenty for showing changing totals or aggregate state.
 */
export function rafThrottle<T extends (...args: never[]) => void>(
  fn: T,
  ms: number,
): T {
  let last = 0;
  return ((...args: never[]) => {
    const now = performance.now();
    if (now - last >= ms) {
      last = now;
      fn(...args);
    }
  }) as T;
}
