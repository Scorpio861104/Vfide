import { describe, expect, it } from '@jest/globals';
import {
  resolveZone, rateCost, quoteShipping, authoritativeShipping,
  type ShippingZone, type ShippingRate,
} from '@/lib/commerce/shippingRates';

const Z = (o: Partial<ShippingZone> = {}): ShippingZone => ({ id: 1, name: 'Domestic', countries: ['US'], sort_order: 0, ...o });
const R = (o: Partial<ShippingRate> = {}): ShippingRate => ({
  id: 1, zone_id: 1, name: 'Standard', rate_type: 'flat', base_amount: 5,
  per_kg: null, pct: null, free_over: null, min_weight_g: null, max_weight_g: null, active: true, ...o,
});

// ════════════════════════════════════════════════════════
// COMMERCE OPERATIONS PHASE 1C — SHIPPING RATE ENGINE SCENARIO MATRIX
//   A. Zone resolution   B. Flat rates   C. Weight rates   D. Price rates / free-over
//   E. Weight-bounded rates (partial applicability)   F. Multi-rate quote ordering
//   G. International / no-service   H. Authoritative selection (trust)   I. Adversarial
// ════════════════════════════════════════════════════════

describe('Phase 1C · A. Zone resolution', () => {
  const zones = [Z({ id: 1, name: 'Domestic', countries: ['US'], sort_order: 0 }),
                 Z({ id: 2, name: 'EU', countries: ['DE', 'FR', 'IT'], sort_order: 1 }),
                 Z({ id: 3, name: 'Rest of World', countries: ['*'], sort_order: 2 })];
  it('A1 explicit domestic match', () => expect(resolveZone(zones, 'US')?.id).toBe(1));
  it('A2 explicit EU match', () => expect(resolveZone(zones, 'FR')?.id).toBe(2));
  it('A3 case-insensitive country', () => expect(resolveZone(zones, 'de')?.id).toBe(2));
  it('A4 unlisted country falls to catch-all', () => expect(resolveZone(zones, 'JP')?.id).toBe(3));
  it('A5 explicit wins over catch-all regardless of order', () => {
    const z = [Z({ id: 9, countries: ['*'], sort_order: 0 }), Z({ id: 1, countries: ['US'], sort_order: 1 })];
    expect(resolveZone(z, 'US')?.id).toBe(1);
  });
  it('A6 no zones → null', () => expect(resolveZone([], 'US')).toBeNull());
  it('A7 no catch-all + unlisted → null (no service)', () => {
    expect(resolveZone([Z({ countries: ['US'] })], 'JP')).toBeNull();
  });
});

describe('Phase 1C · B. Flat rates', () => {
  it('B1 flat fee ignores weight', () => expect(rateCost(R({ rate_type: 'flat', base_amount: 7 }), { country: 'US', totalWeightGrams: 9000, subtotal: 100 })).toBe(7));
  it('B2 flat zero is valid (free shipping rate)', () => expect(rateCost(R({ base_amount: 0 }), { country: 'US', totalWeightGrams: 0, subtotal: 0 })).toBe(0));
  it('B3 inactive rate → null', () => expect(rateCost(R({ active: false }), { country: 'US', totalWeightGrams: 0, subtotal: 0 })).toBeNull());
});

describe('Phase 1C · C. Weight rates', () => {
  it('C1 base + per_kg, rounded UP to next kg', () => {
    // 1200g → 2kg; 3 + 2*2 = 7
    expect(rateCost(R({ rate_type: 'weight', base_amount: 3, per_kg: 2 }), { country: 'US', totalWeightGrams: 1200, subtotal: 0 })).toBe(7);
  });
  it('C2 exactly 1000g → 1kg', () => {
    expect(rateCost(R({ rate_type: 'weight', base_amount: 0, per_kg: 5 }), { country: 'US', totalWeightGrams: 1000, subtotal: 0 })).toBe(5);
  });
  it('C3 1g still rounds up to 1kg', () => {
    expect(rateCost(R({ rate_type: 'weight', base_amount: 0, per_kg: 5 }), { country: 'US', totalWeightGrams: 1, subtotal: 0 })).toBe(5);
  });
  it('C4 0g → 0 kg increments (just base)', () => {
    expect(rateCost(R({ rate_type: 'weight', base_amount: 4, per_kg: 5 }), { country: 'US', totalWeightGrams: 0, subtotal: 0 })).toBe(4);
  });
  it('C5 heavy multi-package weight (10.1kg → 11kg)', () => {
    expect(rateCost(R({ rate_type: 'weight', base_amount: 0, per_kg: 1 }), { country: 'US', totalWeightGrams: 10100, subtotal: 0 })).toBe(11);
  });
});

describe('Phase 1C · D. Price rates / free-over', () => {
  it('D1 base + pct of subtotal', () => {
    // 2 + 10% of 50 = 7
    expect(rateCost(R({ rate_type: 'price', base_amount: 2, pct: 10 }), { country: 'US', totalWeightGrams: 0, subtotal: 50 })).toBe(7);
  });
  it('D2 free_over makes shipping free at/above threshold', () => {
    expect(rateCost(R({ base_amount: 9, free_over: 100 }), { country: 'US', totalWeightGrams: 0, subtotal: 100 })).toBe(0);
    expect(rateCost(R({ base_amount: 9, free_over: 100 }), { country: 'US', totalWeightGrams: 0, subtotal: 99.99 })).toBe(9);
  });
  it('D3 free_over applies to weight rates too', () => {
    expect(rateCost(R({ rate_type: 'weight', base_amount: 5, per_kg: 3, free_over: 75 }), { country: 'US', totalWeightGrams: 5000, subtotal: 80 })).toBe(0);
  });
  it('D4 pct rounds to cents', () => {
    expect(rateCost(R({ rate_type: 'price', base_amount: 0, pct: 3.33 }), { country: 'US', totalWeightGrams: 0, subtotal: 49.99 })).toBe(1.66);
  });
});

describe('Phase 1C · E. Weight-bounded rates (partial applicability)', () => {
  it('E1 rate below min_weight does not apply', () => {
    expect(rateCost(R({ min_weight_g: 1000 }), { country: 'US', totalWeightGrams: 500, subtotal: 0 })).toBeNull();
  });
  it('E2 rate above max_weight does not apply', () => {
    expect(rateCost(R({ max_weight_g: 1000 }), { country: 'US', totalWeightGrams: 1500, subtotal: 0 })).toBeNull();
  });
  it('E3 within bounds applies', () => {
    expect(rateCost(R({ base_amount: 6, min_weight_g: 500, max_weight_g: 2000 }), { country: 'US', totalWeightGrams: 1000, subtotal: 0 })).toBe(6);
  });
  it('E4 boundary inclusive (== min and == max apply)', () => {
    expect(rateCost(R({ base_amount: 6, min_weight_g: 1000, max_weight_g: 1000 }), { country: 'US', totalWeightGrams: 1000, subtotal: 0 })).toBe(6);
  });
});

describe('Phase 1C · F. Multi-rate quote ordering', () => {
  const zones = [Z({ id: 1, countries: ['US'] })];
  const rates = [
    R({ id: 1, zone_id: 1, name: 'Express', rate_type: 'flat', base_amount: 20 }),
    R({ id: 2, zone_id: 1, name: 'Standard', rate_type: 'flat', base_amount: 5 }),
    R({ id: 3, zone_id: 1, name: 'Free over 100', rate_type: 'flat', base_amount: 8, free_over: 100 }),
  ];
  it('F1 returns all applicable rates cheapest-first', () => {
    const opts = quoteShipping(zones, rates, { country: 'US', totalWeightGrams: 500, subtotal: 50 });
    expect(opts.map((o) => o.amount)).toEqual([5, 8, 20]);
  });
  it('F2 free_over reorders to cheapest when subtotal qualifies', () => {
    const opts = quoteShipping(zones, rates, { country: 'US', totalWeightGrams: 500, subtotal: 100 });
    expect(opts[0]!.amount).toBe(0); // the free-over rate
  });
  it('F3 rates from a different zone are excluded', () => {
    const mixed = [...rates, R({ id: 4, zone_id: 2, name: 'EU', base_amount: 1 })];
    const opts = quoteShipping(zones, mixed, { country: 'US', totalWeightGrams: 0, subtotal: 0 });
    expect(opts.find((o) => o.rate_id === 4)).toBeUndefined();
  });
  it('F4 weight-bounded rates filtered out of the quote when inapplicable', () => {
    const r = [R({ id: 1, zone_id: 1, base_amount: 5, max_weight_g: 1000 })];
    expect(quoteShipping(zones, r, { country: 'US', totalWeightGrams: 5000, subtotal: 0 })).toEqual([]);
  });
});

describe('Phase 1C · G. International / no-service', () => {
  const zones = [Z({ id: 1, countries: ['US'] }), Z({ id: 2, countries: ['DE'], sort_order: 1 })];
  const rates = [R({ id: 1, zone_id: 1, base_amount: 5 }), R({ id: 2, zone_id: 2, base_amount: 15 })];
  it('G1 domestic gets domestic rate', () => {
    expect(quoteShipping(zones, rates, { country: 'US', totalWeightGrams: 0, subtotal: 0 })[0]!.amount).toBe(5);
  });
  it('G2 international gets international rate', () => {
    expect(quoteShipping(zones, rates, { country: 'DE', totalWeightGrams: 0, subtotal: 0 })[0]!.amount).toBe(15);
  });
  it('G3 uncovered destination → no options (does NOT default to free)', () => {
    expect(quoteShipping(zones, rates, { country: 'JP', totalWeightGrams: 0, subtotal: 0 })).toEqual([]);
  });
});

describe('Phase 1C · H. Authoritative selection (the trust fix)', () => {
  const zones = [Z({ id: 1, countries: ['US'] })];
  const rates = [R({ id: 1, zone_id: 1, name: 'Standard', base_amount: 5 }), R({ id: 2, zone_id: 1, name: 'Express', base_amount: 20 })];
  it('H1 chosen rate returns its authoritative amount', () => {
    const r = authoritativeShipping(zones, rates, { country: 'US', totalWeightGrams: 0, subtotal: 0 }, 2);
    expect(r).toEqual({ ok: true, amount: 20, rate_id: 2 });
  });
  it('H2 no choice defaults to cheapest', () => {
    const r = authoritativeShipping(zones, rates, { country: 'US', totalWeightGrams: 0, subtotal: 0 }, null);
    expect(r).toEqual({ ok: true, amount: 5, rate_id: 1 });
  });
  it('H3 uncovered destination → NO_SERVICE (checkout must block)', () => {
    expect(authoritativeShipping(zones, rates, { country: 'JP', totalWeightGrams: 0, subtotal: 0 }, null)).toEqual({ ok: false, reason: 'NO_SERVICE' });
  });
  it('H4 a rate_id not in the available options → RATE_NOT_AVAILABLE (cannot pick a foreign/cheaper rate)', () => {
    expect(authoritativeShipping(zones, rates, { country: 'US', totalWeightGrams: 0, subtotal: 0 }, 999)).toEqual({ ok: false, reason: 'RATE_NOT_AVAILABLE' });
  });
});

describe('Phase 1C · I. Adversarial', () => {
  const zones = [Z({ id: 1, countries: ['US'] })];
  it('I1 client cannot force a cheaper amount — engine recomputes from the chosen rate id', () => {
    const rates = [R({ id: 1, zone_id: 1, base_amount: 25 })];
    // even if a client "wanted" $1, choosing rate 1 yields the authoritative 25
    expect(authoritativeShipping(zones, rates, { country: 'US', totalWeightGrams: 0, subtotal: 0 }, 1)).toEqual({ ok: true, amount: 25, rate_id: 1 });
  });
  it('I2 cannot select a weight-bounded rate that does not apply', () => {
    const rates = [R({ id: 1, zone_id: 1, base_amount: 5, max_weight_g: 500 })];
    expect(authoritativeShipping(zones, rates, { country: 'US', totalWeightGrams: 5000, subtotal: 0 }, 1).ok).toBe(false);
  });
  it('I3 inactive rate cannot be selected', () => {
    const rates = [R({ id: 1, zone_id: 1, base_amount: 5, active: false })];
    expect(authoritativeShipping(zones, rates, { country: 'US', totalWeightGrams: 0, subtotal: 0 }, 1).ok).toBe(false);
  });
  it('I4 empty country string with a catch-all zone still resolves', () => {
    const z = [Z({ id: 1, countries: ['*'] })];
    const rates = [R({ id: 1, zone_id: 1, base_amount: 5 })];
    expect(authoritativeShipping(z, rates, { country: '', totalWeightGrams: 0, subtotal: 0 }, null).ok).toBe(true);
  });
  it('I5 empty country with no catch-all → NO_SERVICE', () => {
    const rates = [R({ id: 1, zone_id: 1, base_amount: 5 })];
    expect(authoritativeShipping(zones, rates, { country: '', totalWeightGrams: 0, subtotal: 0 }, null)).toEqual({ ok: false, reason: 'NO_SERVICE' });
  });
});
