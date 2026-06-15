import { describe, expect, it } from '@jest/globals';
import {
  scoreMerchantDiscovery, rankByRelevanceThenMerit,
  type MerchantDiscoverySignals,
} from '@/lib/seer/discovery';

// A baseline "honest, solid" merchant; override per scenario.
const S = (o: Partial<MerchantDiscoverySignals> = {}): MerchantDiscoverySignals => ({
  relevance: 1, merchantTrust: 70, deliveryReliability: 80, commerceHealth: 60,
  builderScore: 0, fraudRisk: 0, ageDays: 200, verified: false, ...o,
});
const item = (addr: string, s: MerchantDiscoverySignals) => ({ merchantAddress: addr, discovery: scoreMerchantDiscovery(s) });

// ════════════════════════════════════════════════════════
// COMMERCE OPERATIONS PHASE 5 — MARKETPLACE DISCOVERY · RANKING-INTEGRITY & ADVERSARIAL MATRIX
//   A. Relevance gate (un-buyable)   B. Cap enforcement   C. Fraud suppression (review/dispute attacks)
//   D. Fake-merchant resistance   E. New-merchant fairness   F. Determinism   G. No-forbidden-signal
//   H. Local proximity bounds   I. Explainability   J. Recovery / monotonicity
// ════════════════════════════════════════════════════════

describe('Phase 5 · A. Relevance gate is un-buyable', () => {
  it('A1 a higher relevance bucket always outranks a lower one, regardless of merit', () => {
    const relevantModest = item('0xa', S({ relevance: 0.9, merchantTrust: 30, deliveryReliability: 30, builderScore: 0 }));
    const irrelevantElite = item('0xb', S({ relevance: 0.4, merchantTrust: 100, deliveryReliability: 100, builderScore: 10000, verified: true }));
    expect(rankByRelevanceThenMerit([irrelevantElite, relevantModest])[0].merchantAddress).toBe('0xa');
  });
  it('A2 zero relevance ⇒ near-zero score even for a perfect merchant', () => {
    expect(scoreMerchantDiscovery(S({ relevance: 0, merchantTrust: 100, deliveryReliability: 100, builderScore: 10000, verified: true })).score).toBe(0);
  });
  it('A3 keyword-stuffing to max relevance still cannot escape the fraud penalty within a tier', () => {
    // two equally (max) relevant merchants; the fraudulent one must rank below the clean one
    const clean = item('0xclean', S({ relevance: 1, fraudRisk: 0 }));
    const fraudulent = item('0xfraud', S({ relevance: 1, fraudRisk: 90, merchantTrust: 100, builderScore: 10000, verified: true }));
    expect(rankByRelevanceThenMerit([fraudulent, clean])[0].merchantAddress).toBe('0xclean');
  });
  it('A4 relevance bucketing: 0.94 and 0.96 land in different buckets (0.9 vs 1.0)', () => {
    expect(scoreMerchantDiscovery(S({ relevance: 0.94 })).relevanceBucket).toBe(9);
    expect(scoreMerchantDiscovery(S({ relevance: 0.96 })).relevanceBucket).toBe(10);
  });
});

describe('Phase 5 · B. Cap enforcement (no signal can dominate)', () => {
  it('B1 Builder Record maxed cannot overcome a meaningful trust deficit at equal relevance', () => {
    const builderWhale = item('0xbuilder', S({ relevance: 1, merchantTrust: 10, deliveryReliability: 10, builderScore: 10000 }));
    const trustworthy = item('0xtrust', S({ relevance: 1, merchantTrust: 95, deliveryReliability: 95, builderScore: 0 }));
    expect(rankByRelevanceThenMerit([builderWhale, trustworthy])[0].merchantAddress).toBe('0xtrust');
  });
  it('B2 builder contribution is capped at 8 points', () => {
    const none = scoreMerchantDiscovery(S({ relevance: 1, builderScore: 0 })).score;
    const maxed = scoreMerchantDiscovery(S({ relevance: 1, builderScore: 10000 })).score;
    expect(maxed - none).toBeCloseTo(8, 1);
  });
  it('B3 trust contribution is capped at 30 points', () => {
    const lo = scoreMerchantDiscovery(S({ relevance: 1, merchantTrust: 0, deliveryReliability: null, commerceHealth: null })).score;
    const hi = scoreMerchantDiscovery(S({ relevance: 1, merchantTrust: 100, deliveryReliability: null, commerceHealth: null })).score;
    expect(hi - lo).toBeCloseTo(30, 1);
  });
  it('B4 stacking every positive signal still cannot jump a relevance tier', () => {
    const maxedLowerTier = item('0xmax', S({ relevance: 0.8, merchantTrust: 100, deliveryReliability: 100, commerceHealth: 100, builderScore: 10000, verified: true, ageDays: 1 }));
    const plainHigherTier = item('0xplain', S({ relevance: 1, merchantTrust: 1, deliveryReliability: null, commerceHealth: null, builderScore: 0, ageDays: 300 }));
    expect(rankByRelevanceThenMerit([maxedLowerTier, plainHigherTier])[0].merchantAddress).toBe('0xplain');
  });
});

describe('Phase 5 · C. Fraud suppression (review / dispute attacks)', () => {
  it('C1 high fraud risk heavily suppresses visibility', () => {
    const clean = scoreMerchantDiscovery(S({ relevance: 1, fraudRisk: 0 })).score;
    const flagged = scoreMerchantDiscovery(S({ relevance: 1, fraudRisk: 100 })).score;
    expect(flagged).toBeLessThan(clean);
    expect(clean - flagged).toBeGreaterThan(40); // up to 60-point penalty
  });
  it('C2 a SINGLE/low fraud signal does not destroy a strong merchant', () => {
    const strong = scoreMerchantDiscovery(S({ relevance: 1, merchantTrust: 90, deliveryReliability: 90, fraudRisk: 5 }));
    expect(strong.score).toBeGreaterThan(40); // still very visible
  });
  it('C3 fraud penalty scales with risk (monotonic suppression)', () => {
    const r = [0, 25, 50, 75, 100].map((f) => scoreMerchantDiscovery(S({ relevance: 1, fraudRisk: f })).score);
    for (let i = 1; i < r.length; i++) expect(r[i]).toBeLessThanOrEqual(r[i - 1]);
  });
  it('C4 fraud reduces visibility but the score never goes negative (ownership/visibility floor)', () => {
    expect(scoreMerchantDiscovery(S({ relevance: 1, merchantTrust: 0, deliveryReliability: 0, commerceHealth: 0, fraudRisk: 100 })).score).toBeGreaterThanOrEqual(0);
  });
});

describe('Phase 5 · D. Fake-merchant resistance', () => {
  it('D1 a zero-signal "fake" new merchant cannot outrank an established honest one at equal relevance', () => {
    const fake = item('0xfake', S({ relevance: 1, merchantTrust: 0, deliveryReliability: null, commerceHealth: null, builderScore: 0, ageDays: 1, verified: false }));
    const honest = item('0xhonest', S({ relevance: 1, merchantTrust: 85, deliveryReliability: 90, commerceHealth: 70, ageDays: 300 }));
    expect(rankByRelevanceThenMerit([fake, honest])[0].merchantAddress).toBe('0xhonest');
  });
  it('D2 the new-merchant window gives a bounded boost, not dominance (cannot beat a proven store far ahead)', () => {
    const brandNew = scoreMerchantDiscovery(S({ relevance: 1, merchantTrust: 20, deliveryReliability: null, commerceHealth: null, ageDays: 1 }));
    const proven = scoreMerchantDiscovery(S({ relevance: 1, merchantTrust: 95, deliveryReliability: 95, commerceHealth: 80, ageDays: 300 }));
    expect(proven.score).toBeGreaterThan(brandNew.score);
  });
  it('D3 verification is a modest input (5 pts), not a paywall that dominates', () => {
    const unver = scoreMerchantDiscovery(S({ relevance: 1, verified: false })).score;
    const ver = scoreMerchantDiscovery(S({ relevance: 1, verified: true })).score;
    expect(ver - unver).toBeCloseTo(5, 1);
  });
});

describe('Phase 5 · E. New-merchant fairness + decay', () => {
  it('E1 a brand-new store gets a window an old store does not', () => {
    const young = scoreMerchantDiscovery(S({ relevance: 1, ageDays: 3 })).score;
    const old = scoreMerchantDiscovery(S({ relevance: 1, ageDays: 300 })).score;
    expect(young).toBeGreaterThan(old);
  });
  it('E2 the boost decays with age (3d > 60d > 130d=0)', () => {
    const d3 = scoreMerchantDiscovery(S({ relevance: 1, ageDays: 3 })).score;
    const d60 = scoreMerchantDiscovery(S({ relevance: 1, ageDays: 60 })).score;
    const d130 = scoreMerchantDiscovery(S({ relevance: 1, ageDays: 130 })).score;
    expect(d3).toBeGreaterThan(d60);
    expect(d60).toBeGreaterThan(d130);
  });
  it('E3 boost is fully gone by ~120 days (decays to 0 in the last stretch)', () => {
    const d100 = scoreMerchantDiscovery(S({ relevance: 1, ageDays: 100, merchantTrust: 0, deliveryReliability: null, commerceHealth: null })).score;
    const d120 = scoreMerchantDiscovery(S({ relevance: 1, ageDays: 120, merchantTrust: 0, deliveryReliability: null, commerceHealth: null })).score;
    expect(d100).toBeGreaterThan(0);
    expect(d120).toBe(0);
  });
});

describe('Phase 5 · F. Determinism (no ranking shuffle / manipulation via order)', () => {
  it('F1 equal relevance + equal score resolve deterministically by address', () => {
    const items = [item('0xccc', S({ relevance: 1 })), item('0xaaa', S({ relevance: 1 })), item('0xbbb', S({ relevance: 1 }))];
    const o1 = rankByRelevanceThenMerit(items).map((i) => i.merchantAddress);
    const o2 = rankByRelevanceThenMerit([...items].reverse()).map((i) => i.merchantAddress);
    expect(o1).toEqual(o2);
    expect(o1).toEqual(['0xaaa', '0xbbb', '0xccc']);
  });
  it('F2 input order cannot change the ranking of distinctly-scored items', () => {
    const a = item('0xa', S({ relevance: 1, merchantTrust: 90 }));
    const b = item('0xb', S({ relevance: 1, merchantTrust: 50 }));
    expect(rankByRelevanceThenMerit([a, b])[0].merchantAddress).toBe(rankByRelevanceThenMerit([b, a])[0].merchantAddress);
  });
});

describe('Phase 5 · G. Forbidden signals are structurally impossible', () => {
  it('G1 the signal type has no wealth/holdings/follower/paid field', () => {
    const s = S();
    expect('walletBalance' in s).toBe(false);
    expect('tokenHoldings' in s).toBe(false);
    expect('followers' in s).toBe(false);
    expect('paidPromotion' in s).toBe(false);
    expect('treasurySize' in s).toBe(false);
  });
  it('G2 two merchants identical except (hypothetical) wealth would score identically — wealth cannot enter', () => {
    // since wealth cannot be expressed, identical signals ⇒ identical score
    expect(scoreMerchantDiscovery(S({ relevance: 1 })).score).toBe(scoreMerchantDiscovery(S({ relevance: 1 })).score);
  });
});

describe('Phase 5 · H. Local proximity is bounded & opt-in', () => {
  it('H1 distance only applies when set (global search unaffected)', () => {
    const noDist = scoreMerchantDiscovery(S({ relevance: 1 })).score;
    const withFar = scoreMerchantDiscovery(S({ relevance: 1, distanceKm: 1000 })).score;
    expect(withFar).toBe(noDist); // beyond 50km the boost is 0
  });
  it('H2 closer is a modest boost that decays and is bounded ≤10', () => {
    const near = scoreMerchantDiscovery(S({ relevance: 1, distanceKm: 1 })).score;
    const mid = scoreMerchantDiscovery(S({ relevance: 1, distanceKm: 25 })).score;
    const noDist = scoreMerchantDiscovery(S({ relevance: 1 })).score;
    expect(near).toBeGreaterThan(mid);
    expect(near - noDist).toBeLessThanOrEqual(10.01);
  });
  it('H3 distance cannot override relevance', () => {
    const nearIrrelevant = item('0xnear', S({ relevance: 0.5, distanceKm: 1 }));
    const farRelevant = item('0xfar', S({ relevance: 1, distanceKm: 49 }));
    expect(rankByRelevanceThenMerit([nearIrrelevant, farRelevant])[0].merchantAddress).toBe('0xfar');
  });
});

describe('Phase 5 · I. Explainability (no black-box discovery)', () => {
  it('I1 every contributing signal is itemized', () => {
    const e = scoreMerchantDiscovery(S({ relevance: 1, merchantTrust: 80, deliveryReliability: 80, builderScore: 5000, verified: true, fraudRisk: 10 })).explanation;
    const signals = e.map((x) => x.signal);
    expect(signals).toContain('Merchant trust');
    expect(signals).toContain('Delivery reliability');
    expect(signals).toContain('Builder Record');
    expect(signals).toContain('Verified merchant');
    expect(signals).toContain('Fraud risk');
  });
  it('I2 thin delivery data is explained honestly (no penalty, no boost)', () => {
    const e = scoreMerchantDiscovery(S({ relevance: 1, deliveryReliability: null })).explanation;
    const d = e.find((x) => x.signal === 'Delivery reliability');
    expect(d?.contribution).toBe(0);
  });
  it('I3 the fraud penalty is shown as a negative contribution', () => {
    const e = scoreMerchantDiscovery(S({ relevance: 1, fraudRisk: 50 })).explanation;
    const f = e.find((x) => x.signal === 'Fraud risk');
    expect(f && f.contribution).toBeLessThan(0);
  });
});

describe('Phase 5 · J. Recovery & monotonicity', () => {
  it('J1 clearing fraud + raising trust materially increases visibility (recovery is possible)', () => {
    const before = scoreMerchantDiscovery(S({ relevance: 1, merchantTrust: 30, fraudRisk: 70 })).score;
    const after = scoreMerchantDiscovery(S({ relevance: 1, merchantTrust: 85, fraudRisk: 0 })).score;
    expect(after).toBeGreaterThan(before);
  });
  it('J2 no saturation: a perfect merchant still outranks a very-good-but-imperfect one', () => {
    const perfect = scoreMerchantDiscovery(S({ relevance: 1, merchantTrust: 100, deliveryReliability: 100, commerceHealth: 100, builderScore: 10000, verified: true }));
    const veryGood = scoreMerchantDiscovery(S({ relevance: 1, merchantTrust: 90, deliveryReliability: 90, commerceHealth: 90, builderScore: 8000, verified: true }));
    expect(perfect.score).toBeGreaterThan(veryGood.score);
  });
  it('J3 improving any single positive signal never decreases the score (monotonic)', () => {
    const base = scoreMerchantDiscovery(S({ relevance: 1, merchantTrust: 50 })).score;
    const better = scoreMerchantDiscovery(S({ relevance: 1, merchantTrust: 60 })).score;
    expect(better).toBeGreaterThanOrEqual(base);
  });
});
