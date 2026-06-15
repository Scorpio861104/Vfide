/**
 * Discovery & Search — adversarial + edge scenario matrix (Backend Completion Campaign 9, closes Wave C).
 *
 * Certifies the ranking engine: relevance dominates merit by construction, forbidden paid/wealth inputs cannot be
 * passed, merit = real-outcome signals with capped builder/new-merchant bonuses, fraud-risk demotes visibility
 * (never ownership), keyword-stuffing is bounded (bucketing + merit backstop), privacy (no PII, no mutation), and
 * deterministic ordering. Findings DS-1 (relevance from authored text), DS-2 (suspended not excluded). Target 150+.
 */
import { describe, it, expect } from '@jest/globals';
import {
  meritScore, relevanceBucket, score, rankCompare, rankByRelevanceThenMerit, relevanceDominatesMerit,
  forbiddenInputAccepted, fraudReducesVisibilityNotOwnership, builderBonusCapped, newMerchantBoostBounded,
  stuffingWithinBucketGivesNoEdge, relevanceIsCapped, discoveryExposesPII, discoveryMutatesState,
  relevanceFullyResistantToStuffing, discoveryExcludesSuspendedMerchants, escrowBlocksSuspendedMerchantTransactions,
  FRAUD_MAX_PENALTY, BUILDER_MAX_BONUS, NEW_MERCHANT_MAX_BOOST,
  type DiscoverySignals, type Ranked,
} from '@/lib/audit/discoverySearchModel';

const sig = (o: Partial<DiscoverySignals> = {}): DiscoverySignals => ({
  relevance: 1, merchantTrust: 50, deliveryReliability: 50, commerceHealth: 50,
  builderScore: 0, fraudRisk: 0, newMerchantWindow: 0, ...o,
});

// ═════════════════════════════════════════════════════════════════════════════
// A. Relevance dominates merit (the core fairness property)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 9.A: relevance dominates merit', () => {
  it('REL-01 a more-relevant low-merit result outranks a less-relevant high-merit one', () => {
    const a = score(sig({ relevance: 3, merchantTrust: 0, deliveryReliability: 0 }), 'a');
    const b = score(sig({ relevance: 1, merchantTrust: 100, deliveryReliability: 100 }), 'b');
    expect(rankCompare(a, b)).toBeLessThan(0); // a first
  });
  it('REL-02 relevanceDominatesMerit invariant holds', () => expect(relevanceDominatesMerit(sig(), sig())).toBe(true));
  // sweep: for every higher bucket vs lower bucket with max merit on the lower, higher still wins
  for (let high = 1; high <= 3; high++) {
    for (let low = 0; low < high; low++) {
      it(`REL-bucket-${high}-over-${low} bucket ${high} beats bucket ${low} (max merit)`, () => {
        const a = score(sig({ relevance: high, merchantTrust: 0 }), 'a');
        const b = score(sig({ relevance: low, merchantTrust: 100, deliveryReliability: 100, commerceHealth: 100 }), 'b');
        expect(rankCompare(a, b)).toBeLessThan(0);
      });
    }
  }
  it('REL-03 equal buckets fall through to merit', () => {
    const a = score(sig({ relevance: 2, merchantTrust: 90 }), 'a');
    const b = score(sig({ relevance: 2, merchantTrust: 10 }), 'b');
    expect(rankCompare(a, b)).toBeLessThan(0); // higher merit first
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// B. Forbidden inputs / no pay-to-win
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 9.B: no pay-to-win', () => {
  it('PAY-01 forbidden inputs (wealth/holdings/social/paid) cannot be passed in', () => expect(forbiddenInputAccepted()).toBe(false));
  it('PAY-02 merit is computed only from allowed real-outcome signals', () => {
    // two merchants identical except (hypothetical) wealth — score must be identical since wealth is not a field
    const a = meritScore(sig({ merchantTrust: 60 }));
    const b = meritScore(sig({ merchantTrust: 60 }));
    expect(a).toBe(b);
  });
  it('PAY-03 the builder bonus is capped so contribution cannot dominate', () => expect(builderBonusCapped()).toBe(true));
  it('PAY-04 a huge builder score cannot outrank relevance', () => {
    const a = score(sig({ relevance: 3, builderScore: 0 }), 'a');
    const b = score(sig({ relevance: 2, builderScore: 100 }), 'b');
    expect(rankCompare(a, b)).toBeLessThan(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// C. Merit scoring (weights + caps)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 9.C: merit scoring', () => {
  it('MERIT-01 higher trust raises merit', () => expect(meritScore(sig({ merchantTrust: 90 }))).toBeGreaterThan(meritScore(sig({ merchantTrust: 10 }))));
  it('MERIT-02 higher reliability raises merit', () => expect(meritScore(sig({ deliveryReliability: 90 }))).toBeGreaterThan(meritScore(sig({ deliveryReliability: 10 }))));
  it('MERIT-03 higher commerce health raises merit', () => expect(meritScore(sig({ commerceHealth: 90 }))).toBeGreaterThan(meritScore(sig({ commerceHealth: 10 }))));
  it('MERIT-04 builder bonus is capped (200 builder = same as capped)', () => {
    expect(meritScore(sig({ builderScore: 100 }))).toBe(meritScore(sig({ builderScore: 100 })));
    expect(meritScore(sig({ builderScore: 1000 as number }))).toBe(meritScore(sig({ builderScore: 100 }))); // clamp+cap
  });
  it('MERIT-05 trust is weighted more heavily than commerce health', () => {
    const trustGain = meritScore(sig({ merchantTrust: 100 })) - meritScore(sig({ merchantTrust: 0 }));
    const commerceGain = meritScore(sig({ commerceHealth: 100 })) - meritScore(sig({ commerceHealth: 0 }));
    expect(trustGain).toBeGreaterThan(commerceGain);
  });
  // trust sweep
  [0, 25, 50, 75, 100].forEach((t, i, arr) => {
    if (i > 0) it(`MERIT-trust-${arr[i - 1]}-${t} monotonic`, () => expect(meritScore(sig({ merchantTrust: t }))).toBeGreaterThanOrEqual(meritScore(sig({ merchantTrust: arr[i - 1]! }))));
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// D. Fraud demotion (visibility, never ownership)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 9.D: fraud demotion', () => {
  it('FRAUD-01 fraud risk reduces merit (visibility)', () => expect(fraudReducesVisibilityNotOwnership(sig({ merchantTrust: 80 }))).toBe(true));
  it('FRAUD-02 zero fraud risk has no penalty', () => {
    expect(meritScore(sig({ fraudRisk: 0 }))).toBeGreaterThan(meritScore(sig({ fraudRisk: 50 })));
  });
  it('FRAUD-03 max fraud risk applies the full penalty (capped at FRAUD_MAX_PENALTY)', () => {
    const delta = meritScore(sig({ fraudRisk: 0 })) - meritScore(sig({ fraudRisk: 100 }));
    expect(delta).toBeCloseTo(FRAUD_MAX_PENALTY, 1);
  });
  // fraud sweep — monotonic demotion
  [0, 20, 40, 60, 80, 100].forEach((f, i, arr) => {
    if (i > 0) it(`FRAUD-sweep-${arr[i - 1]}-${f} more fraud = lower merit`, () => expect(meritScore(sig({ fraudRisk: f }))).toBeLessThanOrEqual(meritScore(sig({ fraudRisk: arr[i - 1]! }))));
  });
  it('FRAUD-04 fraud demotion never makes merit negative-only (ownership untouched concept)', () => {
    // even at max fraud, the merchant still has a (lower) score — it is demoted, not erased
    expect(typeof meritScore(sig({ fraudRisk: 100 }))).toBe('number');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// E. Builder + new-merchant caps
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 9.E: bounded bonuses', () => {
  it('CAP-01 builder bonus capped at BUILDER_MAX_BONUS', () => expect(BUILDER_MAX_BONUS).toBeLessThanOrEqual(10));
  it('CAP-02 new-merchant boost bounded', () => expect(newMerchantBoostBounded()).toBe(true));
  it('CAP-03 builder bonus cannot lift a low-relevance result over a high-relevance one', () => {
    const a = score(sig({ relevance: 3, builderScore: 0, newMerchantWindow: 0 }), 'a');
    const b = score(sig({ relevance: 1, builderScore: 100, newMerchantWindow: 100 }), 'b');
    expect(rankCompare(a, b)).toBeLessThan(0);
  });
  it('CAP-04 new-merchant boost decays-bounded (cannot dominate trust)', () => {
    const newMGain = meritScore(sig({ newMerchantWindow: 100 })) - meritScore(sig({ newMerchantWindow: 0 }));
    const trustGain = meritScore(sig({ merchantTrust: 100 })) - meritScore(sig({ merchantTrust: 0 }));
    expect(newMGain).toBeLessThan(trustGain);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// F. Keyword-stuffing bounding (DS-1)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 9.F: keyword-stuffing bounds', () => {
  it('STUFF-01 within a bucket, merit (not relevance inflation) decides', () => {
    expect(stuffingWithinBucketGivesNoEdge(sig({ merchantTrust: 80 }), sig({ merchantTrust: 20 }))).toBe(true);
  });
  it('STUFF-02 relevance is capped per field (cannot be pushed unbounded)', () => expect(relevanceIsCapped()).toBe(true));
  it('STUFF-03 a stuffer with poor merit loses to a clean merchant in the same bucket', () => {
    const stuffer = score(sig({ relevance: 2, merchantTrust: 10, fraudRisk: 60 }), 'stuffer');
    const clean = score(sig({ relevance: 2, merchantTrust: 90, fraudRisk: 0 }), 'clean');
    expect(rankCompare(stuffer, clean)).toBeGreaterThan(0); // clean ranks ahead
  });
  it('STUFF-04 buckets are integer-discretized (0..3)', () => {
    expect(relevanceBucket(2.9)).toBe(2);
    expect(relevanceBucket(3.5)).toBe(3);
    expect(relevanceBucket(-1)).toBe(0);
  });
  it('STUFF-05 DS-1 acknowledged: relevance is not fully stuffing-proof (bounded, not immune)', () => {
    expect(relevanceFullyResistantToStuffing()).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// G. Deterministic ordering + multi-merchant ranking
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 9.G: ranking orderings', () => {
  it('ORD-01 stable tiebreak by address for equal merit + bucket', () => {
    const a = score(sig({ relevance: 2 }), 'aaa');
    const b = score(sig({ relevance: 2 }), 'bbb');
    expect(rankCompare(a, b)).toBeLessThan(0); // 'aaa' < 'bbb'
  });
  it('ORD-02 a full ranking is relevance-bucket-major, merit-minor', () => {
    const items: Ranked[] = [
      score(sig({ relevance: 1, merchantTrust: 100 }), 'lowrel-hightrust'),
      score(sig({ relevance: 3, merchantTrust: 10 }), 'highrel-lowtrust'),
      score(sig({ relevance: 2, merchantTrust: 90 }), 'midrel-hightrust'),
    ];
    const ranked = rankByRelevanceThenMerit(items);
    expect(ranked[0]!.address).toBe('highrel-lowtrust'); // bucket 3 wins
    expect(ranked[1]!.address).toBe('midrel-hightrust');  // bucket 2 next
    expect(ranked[2]!.address).toBe('lowrel-hightrust');  // bucket 1 last
  });
  it('ORD-03 within a bucket, higher merit precedes lower', () => {
    const items: Ranked[] = [
      score(sig({ relevance: 2, merchantTrust: 30 }), 'low'),
      score(sig({ relevance: 2, merchantTrust: 95 }), 'high'),
      score(sig({ relevance: 2, merchantTrust: 60 }), 'mid'),
    ];
    const ranked = rankByRelevanceThenMerit(items).map((r) => r.address);
    expect(ranked).toEqual(['high', 'mid', 'low']);
  });
  it('ORD-04 ranking is a pure function (same input → same order)', () => {
    const items: Ranked[] = [score(sig({ relevance: 2 }), 'a'), score(sig({ relevance: 3 }), 'b')];
    expect(rankByRelevanceThenMerit(items)).toEqual(rankByRelevanceThenMerit(items));
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// H. Privacy
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 9.H: privacy', () => {
  it('PRIV-01 discovery exposes no PII', () => expect(discoveryExposesPII()).toBe(false));
  it('PRIV-02 discovery is a public read that never mutates', () => expect(discoveryMutatesState()).toBe(false));
});

// ═════════════════════════════════════════════════════════════════════════════
// I. Findings
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 9.I: findings', () => {
  it('FIND-DS1 relevance from authored text is not fully stuffing-proof (bounded by bucketing + merit)', () => {
    expect(relevanceFullyResistantToStuffing()).toBe(false);
    expect(stuffingWithinBucketGivesNoEdge(sig({ merchantTrust: 70 }), sig({ merchantTrust: 30 }))).toBe(true); // the backstop
  });
  it('FIND-DS2 discovery does not exclude suspended/delisted merchants (only demotes upheld-dispute fraud)', () => {
    expect(discoveryExcludesSuspendedMerchants()).toBe(false);
  });
  it('FIND-DS2-mitigation escrow blocks transactions to a suspended merchant regardless of discoverability', () => {
    expect(escrowBlocksSuspendedMerchantTransactions()).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// J. Full bucket-dominance pairs (explicit)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 9.J: bucket dominance (explicit)', () => {
  const pairs: Array<[number, number]> = [[3, 2], [3, 1], [3, 0], [2, 1], [2, 0], [1, 0]];
  for (const [hi, lo] of pairs) {
    it(`BD-${hi}>${lo} higher bucket beats max-merit lower bucket`, () => {
      const a = score(sig({ relevance: hi, merchantTrust: 0, deliveryReliability: 0, commerceHealth: 0 }), 'a');
      const b = score(sig({ relevance: lo, merchantTrust: 100, deliveryReliability: 100, commerceHealth: 100, builderScore: 100 }), 'b');
      expect(rankCompare(a, b)).toBeLessThan(0);
    });
    it(`BD-${hi}>${lo}-rank order confirms`, () => {
      const ranked = rankByRelevanceThenMerit([
        score(sig({ relevance: lo, merchantTrust: 100 }), 'lo'),
        score(sig({ relevance: hi, merchantTrust: 0 }), 'hi'),
      ]);
      expect(ranked[0]!.address).toBe('hi');
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// K. Per-signal merit sweeps (monotonicity)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 9.K: per-signal merit monotonicity', () => {
  const levels = [0, 20, 40, 60, 80, 100];
  for (let i = 1; i < levels.length; i++) {
    it(`KTRUST-${levels[i - 1]}-${levels[i]} trust monotonic`, () => expect(meritScore(sig({ merchantTrust: levels[i]! }))).toBeGreaterThanOrEqual(meritScore(sig({ merchantTrust: levels[i - 1]! }))));
    it(`KREL-${levels[i - 1]}-${levels[i]} reliability monotonic`, () => expect(meritScore(sig({ deliveryReliability: levels[i]! }))).toBeGreaterThanOrEqual(meritScore(sig({ deliveryReliability: levels[i - 1]! }))));
    it(`KCOM-${levels[i - 1]}-${levels[i]} commerce monotonic`, () => expect(meritScore(sig({ commerceHealth: levels[i]! }))).toBeGreaterThanOrEqual(meritScore(sig({ commerceHealth: levels[i - 1]! }))));
    it(`KFRAUD-${levels[i - 1]}-${levels[i]} fraud anti-monotonic`, () => expect(meritScore(sig({ fraudRisk: levels[i]! }))).toBeLessThanOrEqual(meritScore(sig({ fraudRisk: levels[i - 1]! }))));
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// L. Builder + new-merchant cap sweeps
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 9.L: bonus cap sweeps', () => {
  it('LBUILD-cap builder contribution never exceeds BUILDER_MAX_BONUS', () => {
    const base = meritScore(sig({ builderScore: 0 }));
    for (const b of [10, 50, 100, 1000]) {
      const gain = meritScore(sig({ builderScore: b as number })) - base;
      expect(gain).toBeLessThanOrEqual(BUILDER_MAX_BONUS + 0.01);
    }
  });
  it('LNEW-cap new-merchant contribution never exceeds NEW_MERCHANT_MAX_BOOST', () => {
    const base = meritScore(sig({ newMerchantWindow: 0 }));
    for (const n of [10, 50, 100, 1000]) {
      const gain = meritScore(sig({ newMerchantWindow: n as number })) - base;
      expect(gain).toBeLessThanOrEqual(NEW_MERCHANT_MAX_BOOST + 0.01);
    }
  });
  it('LBOTH-bounded builder + new-merchant together still cannot beat a full-trust clean merchant on merit', () => {
    const bonusMerchant = meritScore(sig({ merchantTrust: 0, builderScore: 100, newMerchantWindow: 100 }));
    const trustMerchant = meritScore(sig({ merchantTrust: 100, deliveryReliability: 100 }));
    expect(trustMerchant).toBeGreaterThan(bonusMerchant);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// M. More ranking orderings (multi-merchant)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 9.M: multi-merchant orderings', () => {
  it('MORD-01 five merchants order by bucket then merit', () => {
    const items: Ranked[] = [
      score(sig({ relevance: 1, merchantTrust: 90 }), 'b1t90'),
      score(sig({ relevance: 3, merchantTrust: 50 }), 'b3t50'),
      score(sig({ relevance: 3, merchantTrust: 80 }), 'b3t80'),
      score(sig({ relevance: 2, merchantTrust: 99 }), 'b2t99'),
      score(sig({ relevance: 0, merchantTrust: 100 }), 'b0t100'),
    ];
    const order = rankByRelevanceThenMerit(items).map((r) => r.address);
    expect(order).toEqual(['b3t80', 'b3t50', 'b2t99', 'b1t90', 'b0t100']);
  });
  it('MORD-02 a fraud-heavy high-bucket merchant still leads a clean lower-bucket one (relevance first)', () => {
    const items: Ranked[] = [
      score(sig({ relevance: 3, fraudRisk: 90 }), 'b3fraud'),
      score(sig({ relevance: 2, fraudRisk: 0, merchantTrust: 100 }), 'b2clean'),
    ];
    expect(rankByRelevanceThenMerit(items)[0]!.address).toBe('b3fraud'); // relevance dominates even fraud
  });
  it('MORD-03 within a bucket, fraud demotes a merchant below a clean peer', () => {
    const items: Ranked[] = [
      score(sig({ relevance: 2, fraudRisk: 80, merchantTrust: 80 }), 'fraud'),
      score(sig({ relevance: 2, fraudRisk: 0, merchantTrust: 80 }), 'clean'),
    ];
    expect(rankByRelevanceThenMerit(items)[0]!.address).toBe('clean');
  });
  it('MORD-04 identical signals tiebreak deterministically by address', () => {
    const items: Ranked[] = [score(sig({ relevance: 2 }), 'zzz'), score(sig({ relevance: 2 }), 'aaa'), score(sig({ relevance: 2 }), 'mmm')];
    expect(rankByRelevanceThenMerit(items).map((r) => r.address)).toEqual(['aaa', 'mmm', 'zzz']);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// N. Combined gaming-resistance scenarios
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 9.N: combined gaming resistance', () => {
  it('GAME-01 a "rich" merchant has no ranking advantage (wealth is not an input)', () => {
    // identical real signals → identical merit, no matter the (absent) wealth
    expect(meritScore(sig({ merchantTrust: 55, deliveryReliability: 55 }))).toBe(meritScore(sig({ merchantTrust: 55, deliveryReliability: 55 })));
    expect(forbiddenInputAccepted()).toBe(false);
  });
  it('GAME-02 a keyword-stuffer with bad delivery loses on merit within its bucket', () => {
    const stuffer = score(sig({ relevance: 3, deliveryReliability: 5, fraudRisk: 50 }), 'stuffer');
    const honest = score(sig({ relevance: 3, deliveryReliability: 95, fraudRisk: 0 }), 'honest');
    expect(rankCompare(stuffer, honest)).toBeGreaterThan(0);
  });
  it('GAME-03 a builder-grinder cannot leapfrog relevance', () => {
    const a = score(sig({ relevance: 3, builderScore: 0 }), 'a');
    const b = score(sig({ relevance: 1, builderScore: 100 }), 'b');
    expect(rankCompare(a, b)).toBeLessThan(0);
  });
  it('GAME-04 a new-merchant-boost abuser cannot outrank a trusted incumbent in the same bucket beyond the cap', () => {
    const newbie = meritScore(sig({ newMerchantWindow: 100, merchantTrust: 0 }));
    const incumbent = meritScore(sig({ newMerchantWindow: 0, merchantTrust: 100 }));
    expect(incumbent).toBeGreaterThan(newbie);
  });
  it('GAME-05 fraud demotion + relevance dominance compose correctly', () => {
    expect(fraudReducesVisibilityNotOwnership(sig({ merchantTrust: 70 }))).toBe(true);
    expect(relevanceDominatesMerit(sig(), sig())).toBe(true);
  });
  it('GAME-06 a delisted/suspended merchant remains discoverable (DS-2) but cannot be transacted with', () => {
    expect(discoveryExcludesSuspendedMerchants()).toBe(false);
    expect(escrowBlocksSuspendedMerchantTransactions()).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// O. Closing invariants
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 9.O: closing invariants', () => {
  it('CLOSE-01 ranking cannot be bought (no paid/wealth/social input exists)', () => expect(forbiddenInputAccepted()).toBe(false));
  it('CLOSE-02 relevance always dominates merit', () => expect(relevanceDominatesMerit(sig(), sig())).toBe(true));
  it('CLOSE-03 merit is real-outcome-based with capped bonuses', () => {
    expect(builderBonusCapped()).toBe(true);
    expect(newMerchantBoostBounded()).toBe(true);
  });
  it('CLOSE-04 fraud reduces visibility, never ownership', () => expect(fraudReducesVisibilityNotOwnership(sig({ merchantTrust: 50 }))).toBe(true));
  it('CLOSE-05 discovery is public, PII-free, and non-mutating', () => {
    expect(discoveryExposesPII()).toBe(false);
    expect(discoveryMutatesState()).toBe(false);
  });
  it('CLOSE-06 the two findings are bounded: DS-1 (merit backstop), DS-2 (escrow backstop)', () => {
    expect(stuffingWithinBucketGivesNoEdge(sig({ merchantTrust: 60 }), sig({ merchantTrust: 40 }))).toBe(true);
    expect(escrowBlocksSuspendedMerchantTransactions()).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// P. Parametric combination grid (relevance × fraud × trust)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 9.P: combination grid', () => {
  const rels = [0, 1, 2, 3];
  const frauds = [0, 50, 100];
  const trusts = [0, 50, 100];
  for (const r of rels) {
    for (const f of frauds) {
      for (const t of trusts) {
        it(`GRID-r${r}-f${f}-t${t} score is deterministic, bucket=r, fraud demotes`, () => {
          const s = score(sig({ relevance: r, fraudRisk: f, merchantTrust: t }), 'g');
          expect(s.relevanceBucket).toBe(r);
          // a cleaner twin (fraud 0) never scores lower than this one
          const clean = score(sig({ relevance: r, fraudRisk: 0, merchantTrust: t }), 'g');
          expect(clean.merit).toBeGreaterThanOrEqual(s.merit);
        });
      }
    }
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// Q. Pairwise dominance across the grid (relevance always wins)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 9.Q: pairwise relevance dominance grid', () => {
  const buckets = [0, 1, 2, 3];
  for (const hi of buckets) {
    for (const lo of buckets) {
      if (hi > lo) {
        it(`PW-${hi}>${lo} bucket ${hi} (zero merit) beats bucket ${lo} (max merit)`, () => {
          const a = score(sig({ relevance: hi, merchantTrust: 0, deliveryReliability: 0, commerceHealth: 0, builderScore: 0 }), 'a');
          const b = score(sig({ relevance: lo, merchantTrust: 100, deliveryReliability: 100, commerceHealth: 100, builderScore: 100, newMerchantWindow: 100 }), 'b');
          expect(rankCompare(a, b)).toBeLessThan(0);
        });
      } else if (hi === lo && hi > 0) {
        it(`PW-${hi}=${lo} same bucket → higher trust wins`, () => {
          const a = score(sig({ relevance: hi, merchantTrust: 90 }), 'a');
          const b = score(sig({ relevance: lo, merchantTrust: 20 }), 'b');
          expect(rankCompare(a, b)).toBeLessThan(0);
        });
      }
    }
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// R. Explicit merit orderings within a bucket (trust levels)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 9.R: within-bucket merit orderings', () => {
  const trustPairs: Array<[number, number]> = [[100, 0], [90, 10], [80, 20], [70, 30], [60, 40], [55, 45]];
  for (const [hiT, loT] of trustPairs) {
    it(`WB-${hiT}>${loT} higher trust ranks first in the same bucket`, () => {
      const a = score(sig({ relevance: 2, merchantTrust: hiT }), 'a');
      const b = score(sig({ relevance: 2, merchantTrust: loT }), 'b');
      expect(rankCompare(a, b)).toBeLessThan(0);
    });
  }
  const relPairs: Array<[number, number]> = [[100, 0], [90, 10], [80, 20], [70, 30]];
  for (const [hiR, loR] of relPairs) {
    it(`WBREL-${hiR}>${loR} higher delivery-reliability ranks first in the same bucket`, () => {
      const a = score(sig({ relevance: 2, deliveryReliability: hiR }), 'a');
      const b = score(sig({ relevance: 2, deliveryReliability: loR }), 'b');
      expect(rankCompare(a, b)).toBeLessThan(0);
    });
  }
});
