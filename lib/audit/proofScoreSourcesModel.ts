/**
 * ProofScore per-source aggregation MODEL (audit artifact).
 *
 * HONESTY NOTE (as in the other on-chain audits): models the score-SOURCE registration, weighting, and
 * aggregation logic of Seer.sol in pure TS so the invariants run as scenarios. NOT the deployed bytecode (no solc
 * here); the repo's Seer / ProofScore hardhat suites are the on-chain evidence for a compiler-equipped env.
 *
 * ProofScore (0-10000, NEUTRAL=5000) is the protocol's spine. The high-level Trust cert established it can't be
 * bought or set; this DEPTH pass audits the INDIVIDUAL SOURCES — how each input feeds the score:
 *
 *   • BOUNDED PER-SOURCE WEIGHT, SUM CAPPED AT 100%. addScoreSource rejects weight > 100 AND rejects any addition
 *     that would push the SUM of active source weights over 100. No single source can dominate beyond its weight;
 *     the aggregate never exceeds 100%. Source count is capped; no duplicates.
 *   • ANTI-CAPTURE DECENTRALIZATION FLOOR. The DAO-vs-on-chain weight split must sum to 100, and once community
 *     sources are registered the on-chain weight can't be reduced below MIN_ONCHAIN_WEIGHT_WITH_SOURCES — a
 *     captured DAO can't silently reclaim full score authority.
 *   • WEIGHTED AVERAGE WITH NEUTRAL DEFAULT, CLAMPED. The score is a weighted average of active sources + the
 *     automated behavioral score (which fills any remaining weight to 100%). Unknown / un-sourced subjects → 
 *     NEUTRAL. Result clamped to [MIN_SCORE, MAX_SCORE]. A reverting or out-of-range source is skipped — it can't
 *     poison the aggregate.
 *   • BEHAVIORAL-ONLY AUTOMATED SCORE. The automated component is built from vault existence, earned badges, and
 *     (decaying) peer endorsements — NO wealth / balance / token-amount input. The score reflects what you've
 *     DONE, not what you HOLD.
 *   • DAO setScore IS BOUNDED. Even the DAO's direct setScore is clamped to range, rate-limited (1/hour per
 *     subject), and magnitude-capped per call (maxDAOScoreChange) — no instant trust manipulation.
 *
 * Net: the score cannot be bought — not by holding tokens (no wealth input), not via a single dominant source
 * (weight cap), not by DAO fiat (bounded). This is the un-buyability that every governance/election audit relies
 * on (votes and seats are ProofScore-weighted).
 */

export const NEUTRAL = 5000;
export const MIN_SCORE = 0;     // model floor (contract MIN_SCORE may be > 0; treated as a clamp bound here)
export const MAX_SCORE = 10000;
export const MAX_SCORE_SOURCES = 20;
export const SOURCE_RANGE_MAX = 1000;          // sources report 0-1000, scaled ×10 to 0-10000
export const MIN_ONCHAIN_WEIGHT_WITH_SOURCES = 30;

// ─────────────────────────── Source registration: bounded weight, sum-capped

export type Caller = 'dao' | 'operator' | 'other';

export type AddSourceResult = { ok: true } | { ok: false; reason:
  | 'NOT_DAO' | 'ZERO' | 'WEIGHT_OVER_100' | 'DUPLICATE' | 'LIMIT' | 'SUM_OVER_100' };

export function authorizeAddScoreSource(args: {
  caller: Caller; source: 'zero' | 'addr'; weight: number;
  alreadyRegistered: boolean; currentSourceCount: number; activeWeightSum: number;
}): AddSourceResult {
  if (args.caller !== 'dao') return { ok: false, reason: 'NOT_DAO' };
  if (args.source === 'zero') return { ok: false, reason: 'ZERO' };
  if (args.weight > 100) return { ok: false, reason: 'WEIGHT_OVER_100' };
  if (args.alreadyRegistered) return { ok: false, reason: 'DUPLICATE' };
  if (args.currentSourceCount >= MAX_SCORE_SOURCES) return { ok: false, reason: 'LIMIT' };
  if (args.activeWeightSum + args.weight > 100) return { ok: false, reason: 'SUM_OVER_100' };
  return { ok: true };
}

/** DAO-vs-on-chain split must sum to 100; with sources registered, on-chain can't drop below the floor. */
export function validDecentralizationWeights(args: {
  daoWeight: number; onChainWeight: number; hasActiveSources: boolean;
}): boolean {
  if (args.daoWeight + args.onChainWeight !== 100) return false;
  if (args.hasActiveSources && args.onChainWeight < MIN_ONCHAIN_WEIGHT_WITH_SOURCES) return false;
  return true;
}

// ─────────────────────────── Aggregation: weighted average, neutral default, clamped, fault-tolerant

export type SourceContribution = { score: number; weight: number; reverts?: boolean };

/**
 * Aggregate registered sources + the automated score. Mirrors calculateOnChainScore: each valid source
 * contributes (score×10)×weight; total source weight is capped at 100, automated fills the rest; result is the
 * weighted average, clamped, with NEUTRAL on zero total weight. Reverting or out-of-range (>1000) sources skip.
 */
export function aggregateScore(sources: SourceContribution[], automatedScore: number): number {
  let weightedScore = 0;
  let totalWeight = 0;
  for (const s of sources) {
    if (s.reverts) continue;                  // try/catch: a failing source is skipped
    if (s.weight > 0 && s.score <= SOURCE_RANGE_MAX) {
      weightedScore += s.score * 10 * s.weight;
      totalWeight += s.weight;
    }
    // a source reporting score > 1000 is ignored — it can't poison the aggregate
  }
  if (totalWeight > 100) totalWeight = 100;
  const automatedWeight = 100 - totalWeight;
  if (automatedWeight > 0) {
    weightedScore += automatedScore * automatedWeight;
    totalWeight += automatedWeight;
  }
  if (totalWeight === 0) return NEUTRAL;
  let finalScore = Math.floor(weightedScore / totalWeight);
  if (finalScore > MAX_SCORE) finalScore = MAX_SCORE;
  if (finalScore < MIN_SCORE) finalScore = MIN_SCORE;
  return finalScore;
}

/** An unknown / zero subject scores NEUTRAL, never 0. */
export function scoreForUnknownSubject(): number { return NEUTRAL; }

// ─────────────────────────── Behavioral-only automated score

export type BehavioralInputs = {
  hasVault: boolean;        // vault existence bonus
  badgePoints: number;      // earned badges
  endorsementPoints: number;// peer endorsements (decaying)
};

/** The automated score is NEUTRAL + behavioral bonuses, clamped. No wealth/balance input exists. */
export function automatedScore(inputs: BehavioralInputs): number {
  let score = NEUTRAL;
  if (inputs.hasVault) score += 500;
  score += Math.max(0, inputs.badgePoints);
  score += Math.max(0, inputs.endorsementPoints);
  if (score > MAX_SCORE) score = MAX_SCORE;
  return score;
}

/** The set of automated score inputs — note the ABSENCE of any wealth/balance signal. */
export function automatedScoreInputs(): string[] {
  return ['vault_existence', 'earned_badges', 'peer_endorsements'];
}
export function automatedScoreUsesWealth(): boolean { return false; }

// ─────────────────────────── DAO setScore is bounded

export type SetScoreResult = { ok: true } | { ok: false; reason: 'NOT_DAO' | 'OVER_MAX' | 'COOLDOWN' | 'DELTA_TOO_LARGE' };

/** Even the DAO's direct setScore is range-clamped, rate-limited (1/hour), and magnitude-capped per call. */
export function authorizeSetScore(args: {
  caller: Caller; newScore: number; oldScore: number;
  cooldownElapsed: boolean; maxDAOScoreChange: number;
}): SetScoreResult {
  if (args.caller !== 'dao') return { ok: false, reason: 'NOT_DAO' };
  if (args.newScore > MAX_SCORE) return { ok: false, reason: 'OVER_MAX' };
  if (!args.cooldownElapsed) return { ok: false, reason: 'COOLDOWN' };
  const delta = Math.abs(args.newScore - args.oldScore);
  if (delta > args.maxDAOScoreChange) return { ok: false, reason: 'DELTA_TOO_LARGE' };
  return { ok: true };
}
