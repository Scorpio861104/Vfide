/**
 * Extraction Index (Whale Protection — System 2).
 *
 * A read-only behavioral metric (0..10,000) tracking destabilizing market patterns — separate from
 * ProofScore (trust) and Builder Record (contribution). It is MARKET-focused. Pure and deterministic.
 *
 * Critically: nobody is ever permanently punished. The index DECAYS every 90 days, and good behavior
 * restores standing. And — like everything in this protocol — it is a signal that informs VFIDE's own
 * discretionary services (lending, marketplace, emergency relief). It never gates a token transfer.
 */

export type ExtractionCategory = 'Normal' | 'Observed' | 'Elevated' | 'High Risk' | 'Extraction Focused';

/** Behavioral signals, typically aggregated from an activity/indexer source over a trailing window. */
export interface ExtractionSignals {
  /** High-market-impact sells (Impact tier ≥ 3) in the window. */
  highImpactSells: number;
  /** Sell→rebuy→sell cycles (the pump/dump signature). */
  sellRebuyCycles: number;
  /** Rapid rebuys shortly after a large sell. */
  rapidRebuys: number;
  /** Discrete volatility events the wallet contributed to. */
  volatilityEvents: number;
  /** Liquidity-disruption events (consumed a large share of a thin pool). */
  liquidityDisruptions: number;
  /**
   * Optional multi-wallet correlation hint, 0..1 (1 = strong coordinated-cluster indicators).
   * ADVISORY ONLY — see architecture note. Must never auto-penalize; it is dampened heavily here and
   * is intended to flag for human/DAO review, not to act on alone (false positives punish innocents).
   */
  clusterCorrelation?: number;
}

export interface ExtractionState {
  index: number; // 0..10,000
  lastUpdatedAt: number; // epoch ms — decay anchor
}

export interface ExtractionResult {
  index: number;
  category: ExtractionCategory;
  contributingFactors: string[];
}

const DECAY_PERIOD_MS = 90 * 24 * 60 * 60 * 1000;
/** Each 90-day period removes this share of the index (gentle, never to zero instantly). */
const DECAY_FRACTION_PER_PERIOD = 0.5;
const MAX_INDEX = 10000;

export function extractionCategory(index: number): ExtractionCategory {
  if (index < 1000) return 'Normal';
  if (index < 3000) return 'Observed';
  if (index < 5000) return 'Elevated';
  if (index < 7000) return 'High Risk';
  return 'Extraction Focused';
}

/**
 * Apply time decay to a stored index. Returns the decayed value and the new anchor. Continuous
 * (fractional periods decay proportionally), so standing recovers smoothly, not in cliffs.
 */
export function applyDecay(state: ExtractionState, now: number): ExtractionState {
  if (state.index <= 0) return { index: 0, lastUpdatedAt: now };
  const elapsed = Math.max(0, now - state.lastUpdatedAt);
  if (elapsed < 1000) return state;
  const periods = elapsed / DECAY_PERIOD_MS;
  const retained = Math.pow(1 - DECAY_FRACTION_PER_PERIOD, periods);
  const index = Math.max(0, Math.round(state.index * retained));
  return { index, lastUpdatedAt: now };
}

/**
 * Compute an extraction index DELTA from fresh behavioral signals, and fold it into the (decayed)
 * prior index. Returns the new state + a transparent factor list.
 *
 * Weights are deliberately conservative: a single large sell barely moves the index; it's *repetition*
 * (cycles, rapid rebuys, repeated volatility) that accumulates — which is the actual extraction
 * signature. One-off liquidity events (a merchant cashing out inventory) should stay near Normal.
 */
export function computeExtractionIndex(prior: ExtractionState, signals: ExtractionSignals, now: number): ExtractionResult & { state: ExtractionState } {
  const decayed = applyDecay(prior, now);
  const factors: string[] = [];

  let delta = 0;
  if (signals.sellRebuyCycles > 0) { delta += signals.sellRebuyCycles * 900; factors.push(`${signals.sellRebuyCycles} sell-rebuy cycle(s)`); }
  if (signals.rapidRebuys > 0) { delta += signals.rapidRebuys * 400; factors.push(`${signals.rapidRebuys} rapid rebuy(s) after a large sell`); }
  if (signals.highImpactSells > 0) { delta += signals.highImpactSells * 300; factors.push(`${signals.highImpactSells} high-impact sell(s)`); }
  if (signals.volatilityEvents > 0) { delta += signals.volatilityEvents * 250; factors.push(`${signals.volatilityEvents} volatility event(s)`); }
  if (signals.liquidityDisruptions > 0) { delta += signals.liquidityDisruptions * 350; factors.push(`${signals.liquidityDisruptions} liquidity-disruption event(s)`); }

  // Cluster correlation is ADVISORY: it can add at most a small nudge and never on its own pushes
  // someone past 'Observed'. It exists to flag for review, not to convict.
  const cluster = Math.max(0, Math.min(1, signals.clusterCorrelation ?? 0));
  if (cluster > 0) {
    const clusterNudge = Math.round(cluster * 300);
    delta += clusterNudge;
    factors.push(`possible coordinated-wallet pattern (advisory, flagged for review)`);
  }

  const index = Math.max(0, Math.min(MAX_INDEX, decayed.index + delta));
  const state: ExtractionState = { index, lastUpdatedAt: now };
  return { index, category: extractionCategory(index), contributingFactors: factors, state };
}
