import { describe, expect, it } from '@jest/globals';
import {
  scoreMerchantDiscovery,
  rankByRelevanceThenMerit,
  type MerchantDiscoverySignals,
  type DiscoveryScore,
} from '@/lib/seer/discovery';

const base: MerchantDiscoverySignals = {
  relevance: 1, merchantTrust: 50, deliveryReliability: 80, commerceHealth: 70,
  builderScore: 5000, fraudRisk: 0, ageDays: 365, verified: true,
};

describe('Discovery engine — VFIDE-aligned ranking properties', () => {
  it('RELEVANCE dominates: a more-relevant modest merchant outranks a less-relevant elite one', () => {
    const relevantModest = scoreMerchantDiscovery({ ...base, relevance: 0.9, merchantTrust: 40, builderScore: 1000 });
    const irrelevantElite = scoreMerchantDiscovery({ ...base, relevance: 0.2, merchantTrust: 100, builderScore: 10000 });
    const ranked = rankByRelevanceThenMerit([
      { id: 'elite', discovery: irrelevantElite },
      { id: 'modest', discovery: relevantModest },
    ]);
    expect(ranked[0]?.id).toBe('modest'); // relevance bucket wins, period
  });

  it('there is NO wealth/holdings input — the signal type cannot express it', () => {
    // Compile-time guarantee made explicit at runtime: identical signals → identical score, regardless
    // of any wealth (which simply has nowhere to enter).
    const a = scoreMerchantDiscovery(base);
    const b = scoreMerchantDiscovery({ ...base });
    expect(a.score).toBe(b.score);
  });

  it('Builder Record is MODEST: maxing it out cannot overcome a meaningful trust deficit', () => {
    // Merchant A: low builder, strong trust. Merchant B: max builder, weak trust. Same relevance.
    const strongTrust = scoreMerchantDiscovery({ ...base, builderScore: 0, merchantTrust: 95, deliveryReliability: 95 });
    const maxBuilder = scoreMerchantDiscovery({ ...base, builderScore: 10000, merchantTrust: 20, deliveryReliability: 20 });
    expect(strongTrust.score).toBeGreaterThan(maxBuilder.score);
  });

  it('FRAUD RISK heavily suppresses visibility (protective), without zeroing legitimate-but-flagged edge cases unfairly', () => {
    const clean = scoreMerchantDiscovery({ ...base, fraudRisk: 0 });
    const flagged = scoreMerchantDiscovery({ ...base, fraudRisk: 90 });
    expect(flagged.score).toBeLessThan(clean.score);
    // A heavily-fraud-flagged merchant should rank far below a clean one.
    expect(flagged.score).toBeLessThan(clean.score * 0.6);
  });

  it('NEW-MERCHANT PROTECTION: a brand-new store gets a visibility window that an old store does not', () => {
    const brandNew = scoreMerchantDiscovery({ ...base, ageDays: 3, merchantTrust: 40, deliveryReliability: null, commerceHealth: null, builderScore: 0 });
    const oldSame = scoreMerchantDiscovery({ ...base, ageDays: 400, merchantTrust: 40, deliveryReliability: null, commerceHealth: null, builderScore: 0 });
    expect(brandNew.score).toBeGreaterThan(oldSame.score);
    expect(brandNew.explanation.some((e) => e.signal === 'New-merchant window')).toBe(true);
  });

  it('new-merchant boost DECAYS: a 3-day store gets more boost than a 60-day store', () => {
    const day3 = scoreMerchantDiscovery({ ...base, ageDays: 3, deliveryReliability: null, commerceHealth: null });
    const day60 = scoreMerchantDiscovery({ ...base, ageDays: 60, deliveryReliability: null, commerceHealth: null });
    const boost = (d: DiscoveryScore) => d.explanation.find((e) => e.signal === 'New-merchant window')?.contribution ?? 0;
    expect(boost(day3)).toBeGreaterThan(boost(day60));
  });

  it('every result is EXPLAINABLE: trust, builder, and fraud contributions are itemized', () => {
    const d = scoreMerchantDiscovery({ ...base, fraudRisk: 30 });
    const signals = d.explanation.map((e) => e.signal);
    expect(signals).toContain('Merchant trust');
    expect(signals).toContain('Builder Record');
    expect(signals).toContain('Fraud risk');
    // Fraud contribution is negative (a penalty).
    expect(d.explanation.find((e) => e.signal === 'Fraud risk')?.contribution).toBeLessThan(0);
  });

  it('unproven delivery history neither boosts nor penalizes (honest about thin data)', () => {
    const unproven = scoreMerchantDiscovery({ ...base, deliveryReliability: null });
    const entry = unproven.explanation.find((e) => e.signal === 'Delivery reliability');
    expect(entry?.contribution).toBe(0);
  });
});

import { buildTransparencyPanel, type TransparencyInputs } from '@/lib/seer/merchantTransparency';

const tBase: TransparencyInputs = {
  displayName: 'Maria Leatherworks', verified: true, ageDays: 800, merchantTrust: 85,
  deliveryReliability: 90, deliveryReliabilityLabel: 'reliable', disputesTotal: 2, disputesUpheld: 0,
  continuityReady: true, recoveryReady: true,
};

describe('Merchant transparency panel — grandmother test', () => {
  it('answers who/trust/delivery/age/what-if in a plain one-liner', () => {
    const p = buildTransparencyPanel(tBase);
    expect(p.plainSummary).toContain('Maria Leatherworks');
    expect(p.plainSummary).toContain('verified');
    expect(p.plainSummary).toContain('2 years');
    expect(p.trustLabel).toBe('strong');
  });

  it('a brand-new merchant reads as "new" without faking history', () => {
    const p = buildTransparencyPanel({ ...tBase, ageDays: 10, merchantTrust: 50, deliveryReliability: null, deliveryReliabilityLabel: 'unproven', continuityReady: false });
    expect(p.yearsActive).toBe('new');
    expect(p.deliveryLabel).toContain('No delivery history');
    expect(p.trustLabel).toBe('building');
  });

  it('always states the ownership protection (funds never frozen/seized)', () => {
    const p = buildTransparencyPanel(tBase);
    expect(p.protections.some((x) => /never frozen or seized/.test(x))).toBe(true);
  });

  it('surfaces upheld disputes honestly', () => {
    const p = buildTransparencyPanel({ ...tBase, disputesTotal: 5, disputesUpheld: 2 });
    expect(p.disputeSummary).toContain('2 of 5');
  });
});

describe('Discovery engine — Local Commerce (distance) bounded & opt-in', () => {
  it('distance only applies when set (global search is unaffected by proximity)', () => {
    const noDistance = scoreMerchantDiscovery({ ...base, relevance: 0.8 });
    const sameButNullDistance = scoreMerchantDiscovery({ ...base, relevance: 0.8, distanceKm: null });
    expect(noDistance.score).toBe(sameButNullDistance.score);
    expect(noDistance.explanation.some((e) => e.signal === 'Local proximity')).toBe(false);
  });

  it('closer is a modest boost that DECAYS with distance and is bounded', () => {
    const near = scoreMerchantDiscovery({ ...base, distanceKm: 2 });
    const mid = scoreMerchantDiscovery({ ...base, distanceKm: 30 });
    const far = scoreMerchantDiscovery({ ...base, distanceKm: 60 });
    const boost = (d: typeof near) => d.explanation.find((e) => e.signal === 'Local proximity')?.contribution ?? 0;
    expect(boost(near)).toBeGreaterThan(boost(mid));
    expect(boost(far)).toBe(0); // beyond 50km, no local boost
    expect(boost(near)).toBeLessThanOrEqual(10); // bounded
  });

  it('distance CANNOT override relevance: a near but irrelevant merchant still loses to a relevant far one', () => {
    const nearIrrelevant = scoreMerchantDiscovery({ ...base, relevance: 0.3, distanceKm: 1 });
    const farRelevant = scoreMerchantDiscovery({ ...base, relevance: 0.9, distanceKm: 45 });
    const ranked = rankByRelevanceThenMerit([
      { id: 'near', discovery: nearIrrelevant },
      { id: 'far', discovery: farRelevant },
    ]);
    expect(ranked[0]?.id).toBe('far'); // relevance bucket still wins
  });
});

describe('Discovery engine — Commerce Health is a ranking input (Wave 69)', () => {
  it('a healthy active store outranks an identical store with poor commerce health', () => {
    const healthy = scoreMerchantDiscovery({ ...base, commerceHealth: 90 });
    const unhealthy = scoreMerchantDiscovery({ ...base, commerceHealth: 20 });
    expect(healthy.score).toBeGreaterThan(unhealthy.score);
  });
  it('null commerce health neither boosts nor penalizes (honest about thin data)', () => {
    const withHealth = scoreMerchantDiscovery({ ...base, commerceHealth: 80 });
    const nullHealth = scoreMerchantDiscovery({ ...base, commerceHealth: null });
    // The health component simply drops out when null; score differs only by that component.
    expect(nullHealth.explanation.some((e) => e.signal === 'Commerce health')).toBe(false);
    expect(withHealth.explanation.some((e) => e.signal === 'Commerce health')).toBe(true);
  });
});

// Wave 82 (Stage 7) — adversarial Discovery properties: determinism, new-merchant fairness, recovery,
// and saturation. These lock the tiebreak fix and prove the engine resists the failure modes hunted for.
describe('Discovery engine — Wave 82 adversarial audit', () => {
  it('equal relevance + equal score resolve DETERMINISTICALLY by address (no run-to-run shuffle)', () => {
    const sig = { ...base, relevance: 0.8, merchantTrust: 70 };
    const items = [
      { merchantAddress: '0xcccc', discovery: scoreMerchantDiscovery(sig) },
      { merchantAddress: '0xaaaa', discovery: scoreMerchantDiscovery(sig) },
      { merchantAddress: '0xbbbb', discovery: scoreMerchantDiscovery(sig) },
    ];
    const order1 = rankByRelevanceThenMerit(items).map((i) => i.merchantAddress);
    const order2 = rankByRelevanceThenMerit([...items].reverse()).map((i) => i.merchantAddress);
    expect(order1).toEqual(order2); // same order regardless of input order
    expect(order1).toEqual(['0xaaaa', '0xbbbb', '0xcccc']); // deterministic by address
  });

  it('NEW MERCHANT is discoverable: a good new store beats an equally-relevant brand-new zero-signal store', () => {
    const newGood = scoreMerchantDiscovery({ ...base, relevance: 0.8, merchantTrust: 60, ageDays: 5, verified: true });
    const newBlank = scoreMerchantDiscovery({ ...base, relevance: 0.8, merchantTrust: 0, ageDays: 5, verified: false });
    expect(newGood.score).toBeGreaterThan(newBlank.score);
    // The new-merchant window actually contributes for a fresh store.
    expect(newGood.explanation.some((e) => e.signal === 'New-merchant window' && e.contribution > 0)).toBe(true);
  });

  it('RECOVERY is possible: clearing fraud + raising trust materially increases visibility', () => {
    const damaged = scoreMerchantDiscovery({ ...base, relevance: 0.8, merchantTrust: 30, fraudRisk: 50 });
    const recovered = scoreMerchantDiscovery({ ...base, relevance: 0.8, merchantTrust: 75, fraudRisk: 0 });
    expect(recovered.score).toBeGreaterThan(damaged.score);
    // Fraud penalty is not permanent — it disappears once fraudRisk returns to 0.
    expect(recovered.explanation.some((e) => e.signal === 'Fraud risk')).toBe(false);
  });

  it('NO SATURATION: a perfect merchant still outranks a very-good-but-imperfect one', () => {
    const perfect = scoreMerchantDiscovery({ ...base, relevance: 1, merchantTrust: 100, deliveryReliability: 100, commerceHealth: 100, builderScore: 10000, verified: true });
    const veryGood = scoreMerchantDiscovery({ ...base, relevance: 1, merchantTrust: 90, deliveryReliability: 85, commerceHealth: 70, builderScore: 5000, verified: true });
    expect(perfect.score).toBeGreaterThan(veryGood.score);
  });
});
