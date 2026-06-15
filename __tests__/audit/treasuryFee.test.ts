/**
 * Treasury — adversarial + edge scenario matrix (Backend Completion Campaign 6).
 *
 * Certifies the fee curve (5%→0.25%, time-weighted, micro-tx cap), the 40/10/50 primary split conservation, and —
 * re-exercising the existing treasuryModel — the vault disbursement access control, FeeDistributor/RevenueSplitter
 * sub-splits (sum to 100%), timelocked changes, and drain-resistance. Findings TR-1 (manual disbursement lacks a
 * vault-level cap/timelock) and TR-2 (PolicySet event misrepresents the active split). Target 150+.
 */
import { describe, it, expect } from '@jest/globals';
import {
  feeCurveBps, feeAmount, curveMonotonicNonIncreasing, splitFee, splitConserves, ecosystemAbsorbsRounding,
  autoWorkPayoutAllowed, burnIsIrreversible, manualDisbursementHasVaultLevelSafeguard, automatedPayoutsAreCapped,
  policyEventMatchesActiveSplit,
  MAX_TOTAL_BPS, MIN_TOTAL_BPS, LOW_SCORE_THRESHOLD, HIGH_SCORE_THRESHOLD, HARD_MAX_AUTO_WORK_PAYOUT,
} from '@/lib/audit/feeTreasuryModel';
import {
  authorizeSendVFIDE, authorizeRescueToken, validateSplit, distributionAllocation, canExecuteTimelocked,
  authorizeDistribute, validatePayees, splitterAllocation, holdsUserVaultFunds, canReachUserVault,
  MAX_BPS, MAX_SINGLE_BPS, SPLIT_CHANGE_DELAY_H,
} from '@/lib/audit/treasuryModel';

// ═════════════════════════════════════════════════════════════════════════════
// A. Fee curve — boundary points
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 6.A: fee curve bounds', () => {
  it('CURVE-low score 0 pays max 5%', () => expect(feeCurveBps(0)).toBe(MAX_TOTAL_BPS));
  it('CURVE-low-at-threshold score 4000 pays max 5%', () => expect(feeCurveBps(LOW_SCORE_THRESHOLD)).toBe(MAX_TOTAL_BPS));
  it('CURVE-high-at-threshold score 8000 pays min 0.25%', () => expect(feeCurveBps(HIGH_SCORE_THRESHOLD)).toBe(MIN_TOTAL_BPS));
  it('CURVE-high score 10000 pays min 0.25%', () => expect(feeCurveBps(10000)).toBe(MIN_TOTAL_BPS));
  it('CURVE-midpoint score 6000 is ~2.625% ((500+25)/2)', () => {
    const bps = feeCurveBps(6000);
    expect(bps).toBeGreaterThan(MIN_TOTAL_BPS);
    expect(bps).toBeLessThan(MAX_TOTAL_BPS);
    expect(bps).toBe(MAX_TOTAL_BPS - Math.floor((2000 * 475) / 4000)); // 500 - 237 = 263
  });
  it('CURVE-floor-just-above-low score 4001 stays at 5% (integer floor: reduction <1bps rounds to 0)', () => expect(feeCurveBps(4001)).toBe(MAX_TOTAL_BPS));
  it('CURVE-first-drop the fee first drops below 5% around score 4009 (reduction reaches 1bps)', () => {
    expect(feeCurveBps(4009)).toBeLessThan(MAX_TOTAL_BPS);
    expect(feeCurveBps(4100)).toBeLessThan(MAX_TOTAL_BPS);
  });
  it('CURVE-just-below-high score 7999 is just above 0.25%', () => expect(feeCurveBps(7999)).toBeGreaterThan(MIN_TOTAL_BPS));
});

// ═════════════════════════════════════════════════════════════════════════════
// B. Fee curve — full score sweep + monotonicity
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 6.B: curve sweep & monotonicity', () => {
  const scores = [0, 500, 1000, 2000, 3000, 4000, 4500, 5000, 5500, 6000, 6500, 7000, 7500, 8000, 9000, 10000];
  for (const s of scores) {
    it(`SWEEP-${s} fee within [25,500] bps`, () => {
      const bps = feeCurveBps(s);
      expect(bps).toBeGreaterThanOrEqual(MIN_TOTAL_BPS);
      expect(bps).toBeLessThanOrEqual(MAX_TOTAL_BPS);
    });
  }
  // adjacent monotonicity (more trust never costs more)
  for (let i = 1; i < scores.length; i++) {
    it(`MONO-${scores[i - 1]}-${scores[i]} higher score ≤ fee`, () => {
      expect(feeCurveBps(scores[i]!)).toBeLessThanOrEqual(feeCurveBps(scores[i - 1]!));
      expect(curveMonotonicNonIncreasing(scores[i - 1]!, scores[i]!)).toBe(true);
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// C. Micro-tx fee ceiling
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 6.C: micro-tx ceiling', () => {
  it('MICRO-01 a low-trust micro-tx is capped to the ceiling', () => {
    expect(feeCurveBps(0, true, 50)).toBe(50); // 5% would apply but ceiling caps to 0.5%
  });
  it('MICRO-02 ceiling does not raise a fee already below it', () => {
    expect(feeCurveBps(10000, true, 50)).toBe(MIN_TOTAL_BPS); // 0.25% < 0.5% ceiling → unchanged
  });
  it('MICRO-03 inactive ceiling leaves the curve fee intact', () => {
    expect(feeCurveBps(0, false, 50)).toBe(MAX_TOTAL_BPS);
  });
  it('MICRO-04 fee amount scales with the (possibly capped) bps', () => {
    expect(feeAmount(1_000_000, feeCurveBps(0, true, 50))).toBe(Math.floor((1_000_000 * 50) / 10000));
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// D. Primary split (40/10/50) conservation
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 6.D: 40/10/50 split conservation', () => {
  const amounts = [0, 1, 7, 13, 99, 100, 333, 1000, 9999, 10000, 123456, 1_000_000, 7_777_777];
  for (const a of amounts) {
    it(`SPLIT-${a} burn+sanctum+ecosystem === total`, () => expect(splitConserves(a)).toBe(true));
  }
  it('SPLIT-ratios 40/10/50 on a clean amount', () => {
    const s = splitFee(1000);
    expect(s.burn).toBe(400);
    expect(s.sanctum).toBe(100);
    expect(s.ecosystem).toBe(500);
  });
  it('SPLIT-rounding ecosystem absorbs the rounding remainder (never under-allocates)', () => {
    for (const a of amounts) expect(ecosystemAbsorbsRounding(a)).toBe(true);
  });
  it('SPLIT-odd a non-divisible amount still conserves exactly', () => {
    const s = splitFee(7);
    expect(s.burn + s.sanctum + s.ecosystem).toBe(7); // 2 + 0 + 5
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// E. Vault discretionary disbursement — sendVFIDE (existing model)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 6.E: sendVFIDE access', () => {
  it('SEND-01 DAO can send within balance', () => expect(authorizeSendVFIDE({ caller: 'dao', to: 'addr', amount: 100, balance: 1000 }).ok).toBe(true));
  it('SEND-02 non-DAO rejected', () => {
    expect(authorizeSendVFIDE({ caller: 'admin', to: 'addr', amount: 100, balance: 1000 })).toEqual({ ok: false, reason: 'NOT_DAO' });
    expect(authorizeSendVFIDE({ caller: 'other', to: 'addr', amount: 100, balance: 1000 })).toEqual({ ok: false, reason: 'NOT_DAO' });
  });
  it('SEND-03 zero recipient or amount rejected', () => {
    expect(authorizeSendVFIDE({ caller: 'dao', to: 'zero', amount: 100, balance: 1000 }).ok).toBe(false);
    expect(authorizeSendVFIDE({ caller: 'dao', to: 'addr', amount: 0, balance: 1000 }).ok).toBe(false);
  });
  it('SEND-04 over-balance rejected', () => expect(authorizeSendVFIDE({ caller: 'dao', to: 'addr', amount: 2000, balance: 1000 })).toEqual({ ok: false, reason: 'INSUFFICIENT' }));
  it('SEND-05 exact-balance send allowed', () => expect(authorizeSendVFIDE({ caller: 'dao', to: 'addr', amount: 1000, balance: 1000 }).ok).toBe(true));
});

// ═════════════════════════════════════════════════════════════════════════════
// F. rescueToken — cannot move treasury VFIDE (existing model)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 6.F: rescueToken', () => {
  it('RESCUE-01 DAO can rescue a non-treasury token', () => expect(authorizeRescueToken({ caller: 'dao', token: 'other', to: 'addr', amount: 100 }).ok).toBe(true));
  it('RESCUE-02 rescue of the treasury\'s own VFIDE is blocked (no skim path)', () => {
    expect(authorizeRescueToken({ caller: 'dao', token: 'vfide', to: 'addr', amount: 100 })).toEqual({ ok: false, reason: 'CANNOT_RESCUE_TREASURY_TOKEN' });
  });
  it('RESCUE-03 non-DAO rescue rejected', () => expect(authorizeRescueToken({ caller: 'other', token: 'other', to: 'addr', amount: 100 }).ok).toBe(false));
  it('RESCUE-04 zero recipient/amount rejected', () => {
    expect(authorizeRescueToken({ caller: 'dao', token: 'other', to: 'zero', amount: 100 }).ok).toBe(false);
    expect(authorizeRescueToken({ caller: 'dao', token: 'other', to: 'addr', amount: 0 }).ok).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// G. FeeDistributor sub-split (dao/merchants/headhunters) (existing model)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 6.G: FeeDistributor sub-split', () => {
  it('SUBSPLIT-01 default 50/30/20 sums to 100% and is valid', () => {
    expect(validateSplit(5000, 3000, 2000).ok).toBe(true);
  });
  it('SUBSPLIT-02 not-100% rejected', () => {
    expect(validateSplit(5000, 3000, 1000)).toEqual({ ok: false, reason: 'NOT_100_PERCENT' });
    expect(validateSplit(5000, 3000, 3000).ok).toBe(false);
  });
  it('SUBSPLIT-03 a single channel over the 80% cap rejected', () => {
    expect(validateSplit(MAX_SINGLE_BPS + 1, MAX_BPS - MAX_SINGLE_BPS - 1, 0)).toEqual({ ok: false, reason: 'SINGLE_TOO_HIGH' });
  });
  it('SUBSPLIT-04 a channel exactly at the cap is allowed (if the rest sums to 100%)', () => {
    expect(validateSplit(MAX_SINGLE_BPS, MAX_BPS - MAX_SINGLE_BPS, 0).ok).toBe(true);
  });
  it('SUBSPLIT-05 distribution conserves the balance (last sink gets the remainder)', () => {
    const d = distributionAllocation(1000, 5000, 3000);
    expect(d.total).toBe(1000);
    expect(d.toDAO + d.toMerchants + d.toHeadhunters).toBe(1000);
  });
  it('SUBSPLIT-06 distribution of an odd balance still conserves', () => {
    const d = distributionAllocation(1003, 5000, 3000);
    expect(d.toDAO + d.toMerchants + d.toHeadhunters).toBe(1003);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// H. RevenueSplitter payee validity (existing model)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 6.H: RevenueSplitter payees', () => {
  it('PAYEE-01 shares summing to 100% accepted', () => expect(validatePayees([5000, 3000, 2000]).ok).toBe(true));
  it('PAYEE-02 shares not summing to 100% rejected', () => expect(validatePayees([5000, 3000, 1000])).toEqual({ ok: false, reason: 'NOT_100_PERCENT' }));
  it('PAYEE-03 a zero-share payee rejected', () => expect(validatePayees([5000, 5000, 0])).toEqual({ ok: false, reason: 'ZERO_SHARE' }));
  it('PAYEE-04 a single 100% payee accepted', () => expect(validatePayees([10000]).ok).toBe(true));
  it('PAYEE-05 splitter allocation conserves the balance', () => {
    const alloc = splitterAllocation(1000, [5000, 3000, 2000]);
    expect(alloc.reduce((a, b) => a + b, 0)).toBe(1000);
  });
  it('PAYEE-06 splitter allocation of an odd balance conserves (remainder to last)', () => {
    const alloc = splitterAllocation(1001, [3333, 3333, 3334]);
    expect(alloc.reduce((a, b) => a + b, 0)).toBe(1001);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// I. Timelocked changes + distribution gating (existing model)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 6.I: timelocks & gating', () => {
  it('TL-01 split change cannot execute before the 72h delay', () => {
    expect(canExecuteTimelocked({ pending: true, nowH: SPLIT_CHANGE_DELAY_H - 1, effectiveTimeH: SPLIT_CHANGE_DELAY_H })).toBe(false);
  });
  it('TL-02 split change executes at the delay boundary', () => {
    expect(canExecuteTimelocked({ pending: true, nowH: SPLIT_CHANGE_DELAY_H, effectiveTimeH: SPLIT_CHANGE_DELAY_H })).toBe(true);
  });
  it('TL-03 a non-pending change cannot execute', () => {
    expect(canExecuteTimelocked({ pending: false, nowH: 100, effectiveTimeH: 0 })).toBe(false);
  });
  it('DIST-01 distribution blocked when paused', () => expect(authorizeDistribute({ paused: true, nowH: 100, lastDistH: 0, minIntervalH: 24, balance: 1000, minAmount: 10 })).toEqual({ ok: false, reason: 'PAUSED' }));
  it('DIST-02 distribution blocked before the min interval', () => expect(authorizeDistribute({ paused: false, nowH: 10, lastDistH: 0, minIntervalH: 24, balance: 1000, minAmount: 10 })).toEqual({ ok: false, reason: 'TOO_SOON' }));
  it('DIST-03 distribution blocked below the minimum amount', () => expect(authorizeDistribute({ paused: false, nowH: 100, lastDistH: 0, minIntervalH: 24, balance: 5, minAmount: 10 })).toEqual({ ok: false, reason: 'BELOW_MINIMUM' }));
  it('DIST-04 a valid distribution is allowed', () => expect(authorizeDistribute({ paused: false, nowH: 100, lastDistH: 0, minIntervalH: 24, balance: 1000, minAmount: 10 }).ok).toBe(true));
});

// ═════════════════════════════════════════════════════════════════════════════
// J. Drain-resistance + caps + burn
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 6.J: drain-resistance, caps, burn', () => {
  it('DRAIN-01 treasury holds NO user-vault funds', () => expect(holdsUserVaultFunds()).toBe(false));
  it('DRAIN-02 no treasury path reaches a user CardBoundVault', () => expect(canReachUserVault()).toBe(false));
  it('BURN-01 burned tokens are irreversible (address(0))', () => expect(burnIsIrreversible()).toBe(true));
  it('CAP-01 an auto-work payout within the configured max is allowed', () => expect(autoWorkPayoutAllowed(5000, 10000)).toBe(true));
  it('CAP-02 an auto-work payout above the configured max is rejected', () => expect(autoWorkPayoutAllowed(20000, 10000)).toBe(false));
  it('CAP-03 the configured max itself cannot exceed the hard ceiling', () => {
    expect(autoWorkPayoutAllowed(100, HARD_MAX_AUTO_WORK_PAYOUT + 1)).toBe(false);
    expect(autoWorkPayoutAllowed(100, HARD_MAX_AUTO_WORK_PAYOUT)).toBe(true);
  });
  it('CAP-04 automated payouts are capped (defense in depth)', () => expect(automatedPayoutsAreCapped()).toBe(true));
});

// ═════════════════════════════════════════════════════════════════════════════
// K. Findings
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 6.K: findings', () => {
  it('FIND-TR1 manual DAO disbursement has no vault-level cap/timelock (relies on DAO governance)', () => {
    expect(manualDisbursementHasVaultLevelSafeguard()).toBe(false);
    expect(automatedPayoutsAreCapped()).toBe(true); // contrast: automated paths ARE capped
  });
  it('FIND-TR2 PolicySet event does NOT match the active 40/10/50 split (emits unused base*Bps)', () => {
    expect(policyEventMatchesActiveSplit()).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// L. End-to-end fee flow (score → totalBps → totalFee → 40/10/50 split → conserve)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 6.L: end-to-end fee flow', () => {
  const combos: Array<[number, number]> = [
    [0, 1000], [2000, 50000], [4000, 1000000], [5000, 250000], [6000, 777777],
    [7000, 1234], [8000, 1000000], [10000, 999999], [3500, 88], [9500, 1000000],
  ];
  for (const [score, amount] of combos) {
    it(`E2E-s${score}-a${amount} fee splits 40/10/50 and conserves`, () => {
      const bps = feeCurveBps(score);
      const totalFee = feeAmount(amount, bps);
      const s = splitFee(totalFee);
      expect(s.burn + s.sanctum + s.ecosystem).toBe(totalFee);
      expect(bps).toBeGreaterThanOrEqual(MIN_TOTAL_BPS);
      expect(bps).toBeLessThanOrEqual(MAX_TOTAL_BPS);
    });
  }
  it('E2E-high-trust-cheaper a high-trust user pays strictly less than a low-trust user on the same amount', () => {
    expect(feeAmount(1_000_000, feeCurveBps(10000))).toBeLessThan(feeAmount(1_000_000, feeCurveBps(0)));
  });
  it('E2E-low-trust-5pct a low-trust user pays exactly 5% of the amount', () => {
    expect(feeAmount(1_000_000, feeCurveBps(0))).toBe(50_000);
  });
  it('E2E-high-trust-quarter-pct a high-trust user pays exactly 0.25% of the amount', () => {
    expect(feeAmount(1_000_000, feeCurveBps(10000))).toBe(2_500);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// M. Finer curve sweep
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 6.M: finer curve sweep', () => {
  const scores = [4100, 4250, 4400, 4750, 5250, 5750, 6250, 6750, 7250, 7600, 7900];
  for (const s of scores) {
    it(`FINE-${s} interpolated fee strictly inside (25,500)`, () => {
      const bps = feeCurveBps(s);
      expect(bps).toBeGreaterThan(MIN_TOTAL_BPS);
      expect(bps).toBeLessThan(MAX_TOTAL_BPS);
    });
  }
  it('FINE-mono the finer sweep is also monotonic non-increasing', () => {
    for (let i = 1; i < scores.length; i++) expect(feeCurveBps(scores[i]!)).toBeLessThanOrEqual(feeCurveBps(scores[i - 1]!));
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// N. More split conservation + sub-split combinations
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 6.N: more split & sub-split', () => {
  const amounts = [2, 3, 5, 11, 17, 41, 101, 1001, 50001, 333333, 9_999_999];
  for (const a of amounts) {
    it(`SPLIT2-${a} conserves`, () => expect(splitConserves(a)).toBe(true));
  }
  const subsplits: Array<[number, number, number, boolean]> = [
    [5000, 3000, 2000, true], [8000, 2000, 0, true], [4000, 4000, 2000, true], [3334, 3333, 3333, true],
    [9000, 500, 500, false], [5000, 5000, 1, false], [10000, 0, 0, false], [6000, 3000, 1000, true],
  ];
  subsplits.forEach(([d, m, h, ok], i) => {
    it(`SUB2-${i} (${d}/${m}/${h}) → ${ok ? 'valid' : 'invalid'}`, () => expect(validateSplit(d, m, h).ok).toBe(ok));
  });
  it('SUB2-alloc-conserve a 3-way distribution conserves for assorted balances', () => {
    for (const b of [1, 7, 100, 1003, 999999]) {
      const d = distributionAllocation(b, 5000, 3000);
      expect(d.toDAO + d.toMerchants + d.toHeadhunters).toBe(b);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// O. Fee-amount table (amount × score → exact fee)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 6.O: fee-amount exactness', () => {
  const cases: Array<[number, number, number]> = [
    [1_000_000, 0, 50_000], [1_000_000, 10000, 2_500], [200_000, 0, 10_000], [200_000, 8000, 500],
    [40_000, 4000, 2_000], [0, 5000, 0], [100, 0, 5], [10_000, 10000, 25],
  ];
  cases.forEach(([amount, score, expected], i) => {
    it(`FEEAMT-${i} amount=${amount} score=${score} → fee=${expected}`, () => {
      expect(feeAmount(amount, feeCurveBps(score))).toBe(expected);
    });
  });
  it('FEEAMT-zero-amount any score yields zero fee on zero amount', () => {
    for (const s of [0, 4000, 6000, 8000, 10000]) expect(feeAmount(0, feeCurveBps(s))).toBe(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// P. Whole-system conservation invariants
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 6.P: whole-system conservation', () => {
  it('CONS-01 across the whole curve range, every fee splits with exact conservation', () => {
    for (let score = 0; score <= 10000; score += 250) {
      const totalFee = feeAmount(1_000_000, feeCurveBps(score));
      const s = splitFee(totalFee);
      expect(s.burn + s.sanctum + s.ecosystem).toBe(totalFee);
    }
  });
  it('CONS-02 no fee path ever produces a negative share', () => {
    for (const a of [0, 1, 7, 13, 1000, 999999]) {
      const s = splitFee(a);
      expect(s.burn).toBeGreaterThanOrEqual(0);
      expect(s.sanctum).toBeGreaterThanOrEqual(0);
      expect(s.ecosystem).toBeGreaterThanOrEqual(0);
    }
  });
  it('CONS-03 the fee never exceeds 5% of the transacted amount', () => {
    for (const score of [0, 2000, 4000, 6000, 8000, 10000]) {
      expect(feeAmount(1_000_000, feeCurveBps(score))).toBeLessThanOrEqual(50_000);
    }
  });
  it('CONS-04 treasury never custodies user-vault funds and burn stays irreversible', () => {
    expect(holdsUserVaultFunds()).toBe(false);
    expect(canReachUserVault()).toBe(false);
    expect(burnIsIrreversible()).toBe(true);
  });
});
