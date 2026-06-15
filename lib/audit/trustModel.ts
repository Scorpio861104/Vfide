/**
 * Trust — ProofScore integrity, fee-curve, and fraud-jury fairness MODEL (audit artifact).
 *
 * HONESTY NOTE (same as the other on-chain audits): models the logic of Seer.sol (ProofScore aggregation),
 * ProofScoreBurnRouter.sol (the score→fee curve), and FraudJury.sol (peer-jury fairness) in pure TS so the
 * manipulation-resistance and fairness invariants run as scenarios. NOT the deployed bytecode (no solc here).
 *
 * Invariants under test:
 *   • ProofScore cannot be BOUGHT or directly SET — it is a weighted aggregate of DAO-authorized sources over
 *     behavioral events; even the DAO can only move a score ±5%/call and cannot exceed 100% source weight.
 *   • The fee curve uses a TIME-WEIGHTED score and min(live, cached) — you cannot spike your score to dodge
 *     fees, and a fraud flag raises the fee IMMEDIATELY (fee can never be under-charged).
 *   • A fraud consequence requires PEER-JURY supermajority confirmation; the DAO can only show leniency (veto);
 *     quorum failure defaults to dismissal. Wrongly-flagged users are structurally protected and can recover.
 */

// ─────────────────────────── ProofScore aggregation (Seer.sol)

export const MIN_SCORE = 10;
export const MAX_SCORE = 10000;
export const NEUTRAL = 5000;
export const MAX_DAO_SCORE_CHANGE = 500; // DAO can move a score at most ±5% per call

export interface ScoreSource { weight: number; contribution: number; active: boolean; } // contribution 0..MAX_SCORE

/** Total active source weight must never exceed 100 (Seer.addScoreSource guard). */
export function totalActiveWeight(sources: ScoreSource[]): number {
  return sources.filter((s) => s.active).reduce((w, s) => w + s.weight, 0);
}
export function canAddSource(sources: ScoreSource[], weight: number): boolean {
  if (weight > 100) return false;
  return totalActiveWeight(sources) + weight <= 100;
}

/** Weighted aggregate of active sources; uninitialized (no sources) → NEUTRAL. Always clamped to [MIN,MAX]. */
export function aggregateScore(sources: ScoreSource[]): number {
  const active = sources.filter((s) => s.active);
  if (active.length === 0) return NEUTRAL;
  const w = totalActiveWeight(active);
  if (w === 0) return NEUTRAL;
  const raw = active.reduce((acc, s) => acc + s.contribution * s.weight, 0) / w;
  return Math.max(MIN_SCORE, Math.min(MAX_SCORE, Math.round(raw)));
}

/** A DAO score adjustment is bounded to ±MAX_DAO_SCORE_CHANGE per call and clamped to range. */
export function applyDaoAdjustment(current: number, delta: number): { ok: boolean; next: number; reason?: string } {
  if (Math.abs(delta) > MAX_DAO_SCORE_CHANGE) return { ok: false, next: current, reason: 'EXCEEDS_MAX_CHANGE' };
  return { ok: true, next: Math.max(MIN_SCORE, Math.min(MAX_SCORE, current + delta)) };
}

/** There is NO wealth/balance input to the score — the source contributions are behavioral, never holdings. */
export interface ScoreInputs { behavioralSources: ScoreSource[]; }
export function scoreInputsIncludeWealth(i: ScoreInputs): boolean {
  // Structural: the type cannot express wealth; this asserts the absence for the matrix.
  return 'walletBalance' in i || 'tokenHoldings' in i || 'treasurySize' in (i as object);
}

// ─────────────────────────── Fee curve (ProofScoreBurnRouter.sol)

export const LOW_SCORE_THRESHOLD = 4000;   // ≤4000 → max fee
export const HIGH_SCORE_THRESHOLD = 8000;  // ≥8000 → min fee
export const MAX_TOTAL_BPS = 500;          // 5%
export const MIN_TOTAL_BPS = 25;           // 0.25%

/** Linear fee curve: 500 bps at ≤4000, 25 bps at ≥8000, linear between. */
export function calculateLinearFee(score: number): number {
  if (score <= LOW_SCORE_THRESHOLD) return MAX_TOTAL_BPS;
  if (score >= HIGH_SCORE_THRESHOLD) return MIN_TOTAL_BPS;
  const range = HIGH_SCORE_THRESHOLD - LOW_SCORE_THRESHOLD;
  const feeRange = MAX_TOTAL_BPS - MIN_TOTAL_BPS;
  return MAX_TOTAL_BPS - Math.floor(((score - LOW_SCORE_THRESHOLD) * feeRange) / range);
}

/**
 * The fee-determining score = min(liveScore, cachedTimeWeightedScore) (H-3). A spike (live > cached) does NOT
 * lower the fee immediately; a drop (live < cached, e.g. fraud flag) DOES raise it immediately.
 */
export function feeScore(liveScore: number, cachedTimeWeightedScore: number): number {
  return Math.min(liveScore, cachedTimeWeightedScore);
}
export function feeForUser(liveScore: number, cachedTimeWeightedScore: number): number {
  return calculateLinearFee(feeScore(liveScore, cachedTimeWeightedScore));
}

// ─────────────────────────── Fraud jury fairness (FraudJury.sol)

export const JUROR_MIN_SCORE = 7000;
export const JURY_QUORUM = 5;
export const CONFIRM_SUPERMAJORITY_PCT = 66;

export type JurorEligibility = { score: number; isTarget: boolean; hasComplained: boolean };
/** A juror is eligible iff score ≥ min, not the target, and not an accuser. */
export function jurorEligible(j: JurorEligibility): boolean {
  return j.score >= JUROR_MIN_SCORE && !j.isTarget && !j.hasComplained;
}

export type Verdict = 'None' | 'Voting' | 'Confirmed' | 'Dismissed';

/**
 * Outcome: Confirm requires totalReveals ≥ QUORUM AND confirmVotes/totalReveals ≥ supermajority; otherwise
 * Dismissed (quorum failure is fail-safe to leniency). A fraud consequence may only follow Confirmed.
 */
export function finalizeVerdict(confirmVotes: number, dismissVotes: number): { verdict: Verdict; consequenceAllowed: boolean } {
  const totalReveals = confirmVotes + dismissVotes;
  if (totalReveals < JURY_QUORUM) return { verdict: 'Dismissed', consequenceAllowed: false }; // fail-safe
  const confirmPct = (confirmVotes * 100) / totalReveals;
  if (confirmPct >= CONFIRM_SUPERMAJORITY_PCT) return { verdict: 'Confirmed', consequenceAllowed: true };
  return { verdict: 'Dismissed', consequenceAllowed: false };
}

export type Authority = 'dao' | 'jury' | 'accuser' | 'attacker';
/** The DAO can VETO (force Dismissed) but can NEVER confirm. Only the jury confirms. */
export function authorizeVerdictAction(authority: Authority, action: 'confirm' | 'veto'): { ok: boolean; result?: Verdict; reason?: string } {
  if (action === 'veto') {
    if (authority !== 'dao') return { ok: false, reason: 'ONLY_DAO_VETO' };
    return { ok: true, result: 'Dismissed' }; // leniency
  }
  // confirm
  if (authority === 'dao') return { ok: false, reason: 'DAO_CANNOT_CONFIRM' };
  if (authority !== 'jury') return { ok: false, reason: 'ONLY_JURY_CONFIRMS' };
  return { ok: true, result: 'Confirmed' };
}
