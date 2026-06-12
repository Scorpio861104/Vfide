import { describe, expect, it } from '@jest/globals';
import { computeMerchantHealth, type MerchantHealthInputs } from '@/lib/seer/merchantHealth';

const healthy: MerchantHealthInputs = {
  commerceHealth: 80,
  merchantTrust: 85,
  deliveryReliability: 90,
  retentionRate: 0.45,
  revenueTrendRatio: 1.2,
  lifetimeOrders: 200,
};

describe('Merchant Health composite engine (Phase 1)', () => {
  it('a strong store scores high and bands healthy/thriving', () => {
    const r = computeMerchantHealth(healthy);
    expect(r.score).not.toBeNull();
    expect(r.score!).toBeGreaterThanOrEqual(75);
    expect(['healthy', 'thriving']).toContain(r.band);
  });

  it('a near-perfect store reaches the thriving band', () => {
    const r = computeMerchantHealth({
      commerceHealth: 95,
      merchantTrust: 95,
      deliveryReliability: 95,
      retentionRate: 0.7,
      revenueTrendRatio: 1.5,
      lifetimeOrders: 500,
    });
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
    const onlyTrust = computeMerchantHealth({
      commerceHealth: null,
      merchantTrust: 90,
      deliveryReliability: null,
      retentionRate: null,
      revenueTrendRatio: null,
      lifetimeOrders: 50,
    });
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
    const sum = r.components.reduce((s, c) => s + c.contribution, 0);
    expect(Math.abs(sum - (r.score ?? 0))).toBeLessThanOrEqual(2);
  });
});
