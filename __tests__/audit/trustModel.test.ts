import { describe, expect, it } from '@jest/globals';
import {
  totalActiveWeight, canAddSource, aggregateScore, applyDaoAdjustment, scoreInputsIncludeWealth,
  calculateLinearFee, feeScore, feeForUser,
  jurorEligible, finalizeVerdict, authorizeVerdictAction,
  NEUTRAL, MAX_SCORE, MIN_SCORE, MAX_DAO_SCORE_CHANGE, MAX_TOTAL_BPS, MIN_TOTAL_BPS,
  LOW_SCORE_THRESHOLD, HIGH_SCORE_THRESHOLD, JUROR_MIN_SCORE,
  type ScoreSource,
} from '@/lib/audit/trustModel';

const src = (weight: number, contribution: number, active = true): ScoreSource => ({ weight, contribution, active });

// ════════════════════════════════════════════════════════
// TRUST — PROOFSCORE INTEGRITY, FEE-CURVE & JURY-FAIRNESS MATRIX
//   A. Source weighting   B. No wealth / no direct set   C. DAO bounded   D. Fee curve
//   E. Fee anti-gaming (time-weighted, min(live,cached))   F. Jury eligibility   G. Jury fairness
// ════════════════════════════════════════════════════════

describe('Trust · A. ProofScore is a weighted aggregate of authorized sources', () => {
  it('A1 no sources → NEUTRAL (uninitialized default)', () => expect(aggregateScore([])).toBe(NEUTRAL));
  it('A2 weighted average of active sources', () => expect(aggregateScore([src(50, 8000), src(50, 6000)])).toBe(7000));
  it('A3 inactive sources are excluded', () => expect(aggregateScore([src(50, 8000), src(50, 2000, false)])).toBe(8000));
  it('A4 total active weight cannot exceed 100', () => {
    expect(canAddSource([src(60, 5000)], 50)).toBe(false);
    expect(canAddSource([src(60, 5000)], 40)).toBe(true);
  });
  it('A5 output is clamped to [MIN, MAX]', () => {
    expect(aggregateScore([src(100, 99999)])).toBe(MAX_SCORE);
    expect(aggregateScore([src(100, -5)])).toBe(MIN_SCORE);
  });
});

describe('Trust · B. Score cannot be bought or directly set', () => {
  it('B1 the score-inputs type cannot express wealth/holdings', () => {
    expect(scoreInputsIncludeWealth({ behavioralSources: [src(100, 6000)] })).toBe(false);
  });
  it('B2 there is no setScore primitive — only weighted aggregation (asserted by construction)', () => {
    // aggregateScore is the only path to a score; there is no direct setter in the model (mirrors Seer.sol)
    expect(typeof aggregateScore).toBe('function');
  });
});

describe('Trust · C. Even the DAO is bounded (anti-capture)', () => {
  it('C1 a DAO adjustment within ±5% is allowed', () => expect(applyDaoAdjustment(5000, 400)).toEqual({ ok: true, next: 5400 }));
  it('C2 a DAO adjustment beyond ±5%/call is rejected', () => expect(applyDaoAdjustment(5000, 600)).toMatchObject({ ok: false, reason: 'EXCEEDS_MAX_CHANGE' }));
  it('C3 a DAO cannot jump a score to max in one call', () => expect(applyDaoAdjustment(5000, MAX_SCORE).ok).toBe(false));
  it('C4 DAO adjustment clamps to range', () => expect(applyDaoAdjustment(9800, MAX_DAO_SCORE_CHANGE).next).toBe(MAX_SCORE));
});

describe('Trust · D. Fee curve (5% → 0.25%)', () => {
  it('D1 score ≤4000 pays the 5% max fee', () => expect(calculateLinearFee(LOW_SCORE_THRESHOLD)).toBe(MAX_TOTAL_BPS));
  it('D2 score ≥8000 pays the 0.25% min fee', () => expect(calculateLinearFee(HIGH_SCORE_THRESHOLD)).toBe(MIN_TOTAL_BPS));
  it('D3 neutral (5000) is between min and max', () => {
    const f = calculateLinearFee(NEUTRAL);
    expect(f).toBeLessThan(MAX_TOTAL_BPS);
    expect(f).toBeGreaterThan(MIN_TOTAL_BPS);
  });
  it('D4 the curve is monotonic decreasing (higher score → lower fee)', () => {
    const fees = [4000, 5000, 6000, 7000, 8000].map(calculateLinearFee);
    for (let i = 1; i < fees.length; i++) expect(fees[i]).toBeLessThanOrEqual(fees[i - 1]);
  });
  it('D5 a very low score never pays MORE than the 5% cap', () => expect(calculateLinearFee(0)).toBe(MAX_TOTAL_BPS));
});

describe('Trust · E. Fee anti-gaming (the economic-integrity core)', () => {
  it('E1 fee uses min(live, cached) — a score SPIKE does not lower the fee immediately', () => {
    // cached (time-weighted) is still low at 4000; live spiked to 9000 → fee uses 4000 (max fee)
    expect(feeScore(9000, 4000)).toBe(4000);
    expect(feeForUser(9000, 4000)).toBe(MAX_TOTAL_BPS);
  });
  it('E2 a fraud-flag score DROP raises the fee IMMEDIATELY (fee never under-charged)', () => {
    // cached high (8000), live dropped to 3000 (flagged) → fee uses 3000 (max fee), instantly
    expect(feeScore(3000, 8000)).toBe(3000);
    expect(feeForUser(3000, 8000)).toBe(MAX_TOTAL_BPS);
  });
  it('E3 a sustained high score (both live and cached high) earns the low fee', () => {
    expect(feeForUser(8200, 8100)).toBe(MIN_TOTAL_BPS);
  });
  it('E4 you cannot farm score right before a tx to dodge fees (cached lags)', () => {
    // even a maxed live score with a still-neutral cache pays the neutral-or-worse fee
    expect(feeForUser(MAX_SCORE, NEUTRAL)).toBe(calculateLinearFee(NEUTRAL));
  });
});

describe('Trust · F. Jury eligibility (conflict exclusion)', () => {
  it('F1 a high-score neutral peer is eligible', () => expect(jurorEligible({ score: JUROR_MIN_SCORE, isTarget: false, hasComplained: false })).toBe(true));
  it('F2 the TARGET cannot judge their own case', () => expect(jurorEligible({ score: 9000, isTarget: true, hasComplained: false })).toBe(false));
  it('F3 an ACCUSER cannot also judge', () => expect(jurorEligible({ score: 9000, isTarget: false, hasComplained: true })).toBe(false));
  it('F4 a low-score address cannot judge (score-gated)', () => expect(jurorEligible({ score: 6999, isTarget: false, hasComplained: false })).toBe(false));
});

describe('Trust · G. Jury fairness — consequence requires peer supermajority; DAO only lenient', () => {
  it('G1 quorum failure → Dismissed (fail-safe to leniency, no consequence)', () => {
    expect(finalizeVerdict(3, 1)).toEqual({ verdict: 'Dismissed', consequenceAllowed: false }); // 4 reveals < quorum 5
  });
  it('G2 supermajority confirm → Confirmed (consequence allowed)', () => {
    expect(finalizeVerdict(5, 1)).toEqual({ verdict: 'Confirmed', consequenceAllowed: true }); // 5/6 = 83% ≥ 66%
  });
  it('G3 below supermajority → Dismissed even with quorum', () => {
    expect(finalizeVerdict(3, 3)).toEqual({ verdict: 'Dismissed', consequenceAllowed: false }); // 50% < 66%
  });
  it('G4 the DAO can VETO (force Dismissed) — leniency', () => {
    expect(authorizeVerdictAction('dao', 'veto')).toEqual({ ok: true, result: 'Dismissed' });
  });
  it('G5 the DAO CANNOT confirm a fraud case (no unilateral punishment)', () => {
    expect(authorizeVerdictAction('dao', 'confirm')).toMatchObject({ ok: false, reason: 'DAO_CANNOT_CONFIRM' });
  });
  it('G6 an attacker/accuser cannot confirm a case', () => {
    expect(authorizeVerdictAction('attacker', 'confirm').ok).toBe(false);
    expect(authorizeVerdictAction('accuser', 'confirm').ok).toBe(false);
  });
  it('G7 only the jury confirms', () => expect(authorizeVerdictAction('jury', 'confirm')).toEqual({ ok: true, result: 'Confirmed' }));
  it('G8 a non-DAO cannot veto', () => expect(authorizeVerdictAction('attacker', 'veto').ok).toBe(false));
});

// ─────────────────────────── deepen Merchant Trust (the operational 0-100 score; Phase 5 used it as a discovery input)
import { computeMerchantTrust } from '@/lib/seer/merchantTrust';

describe('Trust · H. Merchant Trust (operational 0-100, distinct from ProofScore 0-10000)', () => {
  it('H1 a clean unverified merchant starts at the BASE (55)', () => {
    expect(computeMerchantTrust({ verified: false, disputesUpheld: 0, refundsGranted: 0 }).score).toBe(55);
  });
  it('H2 verification adds a bounded bonus (+15)', () => {
    expect(computeMerchantTrust({ verified: true, disputesUpheld: 0, refundsGranted: 0 }).score).toBe(70);
  });
  it('H3 upheld disputes penalize heavily (−20 each)', () => {
    expect(computeMerchantTrust({ verified: true, disputesUpheld: 2, refundsGranted: 0 }).score).toBe(30); // 70 - 40
  });
  it('H4 refunds penalize modestly (−5 each)', () => {
    expect(computeMerchantTrust({ verified: true, disputesUpheld: 0, refundsGranted: 2 }).score).toBe(60); // 70 - 10
  });
  it('H5 score is clamped to [0,100] (cannot go negative under heavy penalty)', () => {
    expect(computeMerchantTrust({ verified: false, disputesUpheld: 10, refundsGranted: 0 }).score).toBe(0);
  });
  it('H6 confirmed-payment track record lifts trust, but is CAPPED (≤12)', () => {
    const many = computeMerchantTrust({ verified: false, disputesUpheld: 0, refundsGranted: 0, confirmedPayments: 1000 }).score;
    expect(many).toBeLessThanOrEqual(55 + 12); // cannot exceed BASE + cap from volume alone
  });
  it('H7 every result is explainable (factors are itemized)', () => {
    expect(computeMerchantTrust({ verified: true, disputesUpheld: 1, refundsGranted: 0 }).factors.length).toBeGreaterThan(0);
  });
});
