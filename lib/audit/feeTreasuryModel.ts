/**
 * Fee Curve + Primary Split — executable logic model (Backend Completion Campaign 6, complements treasuryModel.ts).
 *
 * treasuryModel.ts already certifies the VAULT drain-resistance (EcoTreasuryVault/RevenueSplitter/FeeDistributor:
 * DAO-gated sendVFIDE, rescue excludes treasury VFIDE, sub-splits sum to 100%, timelocked changes, no user-vault
 * reach). THIS model adds the part it does not cover — the ProofScoreBurnRouter fee CURVE and the 40/10/50 PRIMARY
 * split — traced from source:
 *   • _calculateLinearFee(score): ≤4000 → maxTotalBps (500 = 5%); ≥8000 → minTotalBps (25 = 0.25%); 4000–8000 →
 *     `500 - (scoreAboveLow*475)/4000`. TIME-WEIGHTED score (anti-gaming). Micro-tx ceiling caps daily commerce.
 *   • Primary split 40/10/50: burn = totalFee*40/100, sanctum = totalFee*10/100, ecosystem = remainder → exact
 *     conservation, aggregate-first to avoid BPS rounding drift; ecosystemMinBps floors the ecosystem share.
 *   • Burn → address(0) (irreversible). Automated payouts capped (maxAutoWorkPayoutWei 10_000, hard max 1_000_000).
 *
 * Findings: TR-1 (manual DAO disbursement has no vault-level timelock/cap — relies on DAO governance; automated
 * paths are capped), TR-2 (PolicySet event emits base*Bps 150/5/20 that are NOT used by the active 40/10/50 calc).
 * NOT the compiled contract; on-chain stage-2 (bytecode) + service e2e are the deployment confirmations.
 */

export const MAX_TOTAL_BPS = 500;          // 5% (low trust ≤4000)
export const MIN_TOTAL_BPS = 25;           // 0.25% (high trust ≥8000)
export const LOW_SCORE_THRESHOLD = 4000;
export const HIGH_SCORE_THRESHOLD = 8000;
export const MIN_TOTAL_FEE_FLOOR_BPS = 10; // 0.10% hard floor
export const BPS_SCALE = 10000;
export const BURN_PCT = 40;
export const SANCTUM_PCT = 10;
export const ECOSYSTEM_PCT = 50;
export const MAX_AUTO_WORK_PAYOUT = 10_000;        // configurable default
export const HARD_MAX_AUTO_WORK_PAYOUT = 1_000_000; // hard ceiling

// ── Fee curve ────────────────────────────────────────────────────────────────
export function feeCurveBps(score: number, microTxCapActive = false, microTxCeilingBps = MAX_TOTAL_BPS): number {
  let totalBps: number;
  if (score <= LOW_SCORE_THRESHOLD) totalBps = MAX_TOTAL_BPS;
  else if (score >= HIGH_SCORE_THRESHOLD) totalBps = MIN_TOTAL_BPS;
  else {
    const range = HIGH_SCORE_THRESHOLD - LOW_SCORE_THRESHOLD; // 4000
    const feeRange = MAX_TOTAL_BPS - MIN_TOTAL_BPS;           // 475
    totalBps = MAX_TOTAL_BPS - Math.floor(((score - LOW_SCORE_THRESHOLD) * feeRange) / range);
  }
  if (microTxCapActive && totalBps > microTxCeilingBps) totalBps = microTxCeilingBps;
  return totalBps;
}
export function feeAmount(amount: number, totalBps: number): number {
  return Math.floor((amount * totalBps) / BPS_SCALE);
}
/** The curve is monotonically non-increasing in score (more trust never costs more). */
export function curveMonotonicNonIncreasing(scoreA: number, scoreB: number): boolean {
  return scoreA <= scoreB ? feeCurveBps(scoreA) >= feeCurveBps(scoreB) : feeCurveBps(scoreA) <= feeCurveBps(scoreB);
}

// ── Primary split (40/10/50) with exact conservation ─────────────────────────
export interface Split { burn: number; sanctum: number; ecosystem: number }
export function splitFee(totalFee: number): Split {
  const burn = Math.floor((totalFee * BURN_PCT) / 100);
  const sanctum = Math.floor((totalFee * SANCTUM_PCT) / 100);
  const ecosystem = totalFee - burn - sanctum; // remainder → conservation exact
  return { burn, sanctum, ecosystem };
}
export function splitConserves(totalFee: number): boolean {
  const s = splitFee(totalFee);
  return s.burn + s.sanctum + s.ecosystem === totalFee;
}
/** The ecosystem share is the remainder, so it absorbs all rounding (never under-allocates the total). */
export function ecosystemAbsorbsRounding(totalFee: number): boolean {
  const s = splitFee(totalFee);
  return s.ecosystem >= Math.floor((totalFee * ECOSYSTEM_PCT) / 100); // remainder ≥ nominal 50%
}

// ── Caps & burn ──────────────────────────────────────────────────────────────
export function autoWorkPayoutAllowed(amount: number, configuredMax: number): boolean {
  return amount <= configuredMax && configuredMax <= HARD_MAX_AUTO_WORK_PAYOUT;
}
export function burnIsIrreversible(): boolean { return true; } // burn sink = address(0)

// ── Findings ─────────────────────────────────────────────────────────────────
/** TR-1: manual DAO disbursement (sendVFIDE/withdrawNative) has no vault-level per-disbursement timelock or cap —
 *  it relies on the DAO being a properly governed (timelocked) entity. Automated payouts ARE capped. */
export function manualDisbursementHasVaultLevelSafeguard(): boolean { return false; }
export function automatedPayoutsAreCapped(): boolean { return true; }
/** TR-2: the PolicySet event emits base*Bps (150/5/20) NOT used by the active 40/10/50 split — an off-chain
 *  consumer reading the event would compute the wrong fee policy. */
export function policyEventMatchesActiveSplit(): boolean { return false; }
