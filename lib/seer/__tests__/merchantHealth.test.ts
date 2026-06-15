import { describe, expect, it } from '@jest/globals';
import { computeMerchantHealth, type MerchantHealthInputs } from '@/lib/seer/merchantHealth';

const healthy: MerchantHealthInputs = {
  commerceHealth: 80, merchantTrust: 85, deliveryReliability: 90,
  retentionRate: 0.45, revenueTrendRatio: 1.2, lifetimeOrders: 200,
};

describe('Merchant Health composite engine (Phase 1)', () => {
  it('a strong store scores high and bands healthy/thriving', () => {
    const r = computeMerchantHealth(healthy);
    expect(r.score).not.toBeNull();
    expect(r.score!).toBeGreaterThanOrEqual(75); // strong-but-not-perfect retention/growth lands mid-high
    expect(['healthy', 'thriving']).toContain(r.band);
  });

  it('a near-perfect store reaches the thriving band', () => {
    const r = computeMerchantHealth({ commerceHealth: 95, merchantTrust: 95, deliveryReliability: 95, retentionRate: 0.7, revenueTrendRatio: 1.5, lifetimeOrders: 500 });
    expect(r.score!).toBeGreaterThanOrEqual(90);
    expect(r.band).toBe('thriving');
  });

  it('a new store with little history is provisional, not a fake score', () => {
    const r = computeMerchantHealth({ ...healthy, lifetimeOrders: 2 });
    expect(r.score).toBeNull();
    expect(r.band).toBe('provisional');
    expect(r.topRecommendation).toMatch(/a few more completed orders/i);
  });

  it('missing sub-signals are NOT penalized as zero — weights re-normalize over present data', () => {
    // Only trust present, and it is high. Score should reflect that, not be dragged down by nulls.
    const onlyTrust = computeMerchantHealth({ commerceHealth: null, merchantTrust: 90, deliveryReliability: null, retentionRate: null, revenueTrendRatio: null, lifetimeOrders: 50 });
    expect(onlyTrust.score).toBeGreaterThanOrEqual(85);
  });

  it('declining revenue + weak delivery surface as risk signals with a concrete top recommendation', () => {
    const r = computeMerchantHealth({ ...healthy, revenueTrendRatio: 0.7, deliveryReliability: 40, merchantTrust: 45 });
    expect(r.riskSignals.some((s) => s.id === 'revenue-down')).toBe(true);
    expect(r.riskSignals.some((s) => s.id === 'delivery-weak')).toBe(true);
    expect(r.topRecommendation.length).toBeGreaterThan(0);
  });

  it('strong retention + growth surface as growth signals', () => {
    const r = computeMerchantHealth({ ...healthy, retentionRate: 0.5, revenueTrendRatio: 1.3 });
    expect(r.growthSignals.some((s) => s.id === 'retention-strong')).toBe(true);
    expect(r.growthSignals.some((s) => s.id === 'revenue-up')).toBe(true);
  });

  it('components are itemized and transparent (each carries its weighted contribution)', () => {
    const r = computeMerchantHealth(healthy);
    expect(r.components.length).toBe(5);
    const named = r.components.map((c) => c.name);
    expect(named).toContain('Merchant trust');
    expect(named).toContain('Delivery reliability');
    // Contributions of present components sum (approximately) to the score.
    const sum = r.components.reduce((s, c) => s + c.contribution, 0);
    expect(Math.abs(sum - (r.score ?? 0))).toBeLessThanOrEqual(2);
  });
});

// Wave 80 (Stage 7) — adversarial edge cases. The composite must not be poisoned by bad inputs, must
// renormalize over present signals, and must gate confidently. These lock the NaN fix found in the audit.
describe('Merchant Health — edge cases (Wave 80 Stage 7 audit)', () => {
  const empty: MerchantHealthInputs = {
    commerceHealth: null, merchantTrust: null, deliveryReliability: null,
    retentionRate: null, revenueTrendRatio: null, lifetimeOrders: 10,
  };

  it('NaN inputs are ignored, never poison the score (the bug this fixes)', () => {
    const r = computeMerchantHealth({ ...empty, commerceHealth: NaN, merchantTrust: 50 });
    expect(r.score).toBe(50); // NaN commerce dropped, renormalized over trust alone
    expect(Number.isFinite(r.score as number)).toBe(true);
  });

  it('Infinity / NaN in retention and trend are ignored', () => {
    expect(computeMerchantHealth({ ...empty, merchantTrust: 50, retentionRate: NaN }).score).toBe(50);
    expect(computeMerchantHealth({ ...empty, merchantTrust: 50, revenueTrendRatio: Infinity }).score).toBe(50);
  });

  it('all-NaN with enough orders yields a coherent provisional (not a null score with a real band)', () => {
    const r = computeMerchantHealth({ ...empty, commerceHealth: NaN, merchantTrust: NaN, deliveryReliability: NaN });
    expect(r.score).toBeNull();
    expect(r.band).toBe('provisional'); // coherent — was incoherently 'at_risk' before the fix
  });

  it('out-of-range inputs clamp (retention > 1, trend negative, values > 100)', () => {
    const r = computeMerchantHealth({ commerceHealth: 999, merchantTrust: 50, deliveryReliability: 50, retentionRate: 50, revenueTrendRatio: -5, lifetimeOrders: 50 });
    expect(r.score).not.toBeNull();
    expect(r.score as number).toBeGreaterThanOrEqual(0);
    expect(r.score as number).toBeLessThanOrEqual(100);
  });

  it('confidence gate is exact at 5 lifetime orders', () => {
    expect(computeMerchantHealth({ ...empty, merchantTrust: 70, lifetimeOrders: 4 }).score).toBeNull();
    expect(computeMerchantHealth({ ...empty, merchantTrust: 70, lifetimeOrders: 5 }).score).not.toBeNull();
  });

  it('a single present signal renormalizes to itself (not dragged toward zero)', () => {
    expect(computeMerchantHealth({ ...empty, merchantTrust: 80, lifetimeOrders: 50 }).score).toBe(80);
  });

  it('every health signal has a DISTINCT action (not a restatement of the observation) — Wave 81', () => {
    const r = computeMerchantHealth({ commerceHealth: 30, merchantTrust: 40, deliveryReliability: 30, retentionRate: 0.05, revenueTrendRatio: 0.6, lifetimeOrders: 50 });
    const all = [...r.growthSignals, ...r.riskSignals];
    expect(all.length).toBeGreaterThan(0);
    for (const s of all) {
      expect(s.action.length).toBeGreaterThan(0);
      expect(s.action).not.toBe(s.message); // action must add a next step, not echo the cause
    }
    // The top recommendation is an actionable step, not just an observation.
    expect(r.topRecommendation.length).toBeGreaterThan(0);
  });
});
