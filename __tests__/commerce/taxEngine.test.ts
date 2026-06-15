import { describe, expect, it } from '@jest/globals';
import {
  rateMatchesAddress, selectRate, computeTax, refundTax,
  type TaxRate, type TaxAddress, type TaxLine,
} from '@/lib/commerce/taxEngine';

const T = (o: Partial<TaxRate> = {}): TaxRate => ({
  id: 1, name: 'Rate', rate_bps: 725,
  jurisdiction_country: 'US', jurisdiction_state: null, jurisdiction_city: null, postal_code_pattern: null,
  is_default: false, enabled: true, applies_to: ['physical', 'digital', 'service'], ...o,
});
const A = (o: Partial<TaxAddress> = {}): TaxAddress => ({ country: 'US', state: 'CA', city: 'Los Angeles', postal: '90001', ...o });

// ════════════════════════════════════════════════════════
// COMMERCE OPERATIONS PHASE 1D — TAX ENGINE SCENARIO MATRIX
//   A. Jurisdiction matching   B. Specificity selection   C. applies_to filtering
//   D. Postal patterns   E. Default fallback / no service   F. computeTax (buckets, rounding)
//   G. Exempt   H. Multi-state / international   I. Refund   J. Adversarial
// ════════════════════════════════════════════════════════

describe('Phase 1D · A. Jurisdiction matching', () => {
  it('A1 country-only rate matches same country', () => expect(rateMatchesAddress(T({ jurisdiction_country: 'US' }), A())).toBe(true));
  it('A2 country mismatch fails', () => expect(rateMatchesAddress(T({ jurisdiction_country: 'CA' }), A({ country: 'US' }))).toBe(false));
  it('A3 state rate matches same state (case-insensitive)', () => expect(rateMatchesAddress(T({ jurisdiction_country: 'US', jurisdiction_state: 'ca' }), A({ state: 'CA' }))).toBe(true));
  it('A4 state mismatch fails', () => expect(rateMatchesAddress(T({ jurisdiction_state: 'NY' }), A({ state: 'CA' }))).toBe(false));
  it('A5 city rate matches same city', () => expect(rateMatchesAddress(T({ jurisdiction_city: 'Los Angeles' }), A())).toBe(true));
  it('A6 null fields on rate = "any" (a country-only rate ignores state/city)', () => {
    expect(rateMatchesAddress(T({ jurisdiction_country: 'US', jurisdiction_state: null, jurisdiction_city: null }), A({ state: 'TX', city: 'Austin' }))).toBe(true);
  });
  it('A7 fully-null jurisdiction (no fields) matches anything via rateMatchesAddress', () => {
    expect(rateMatchesAddress(T({ jurisdiction_country: null }), A({ country: 'JP' }))).toBe(true);
  });
});

describe('Phase 1D · B. Specificity selection', () => {
  const rates = [
    T({ id: 1, jurisdiction_country: 'US', jurisdiction_state: null, jurisdiction_city: null, rate_bps: 0, name: 'US base' }),
    T({ id: 2, jurisdiction_country: 'US', jurisdiction_state: 'CA', jurisdiction_city: null, rate_bps: 725, name: 'CA' }),
    T({ id: 3, jurisdiction_country: 'US', jurisdiction_state: 'CA', jurisdiction_city: 'Los Angeles', rate_bps: 950, name: 'LA' }),
  ];
  it('B1 city beats state beats country', () => expect(selectRate(rates, 'physical', A())?.id).toBe(3));
  it('B2 state wins when no city match', () => expect(selectRate(rates, 'physical', A({ city: 'San Diego' }))?.id).toBe(2));
  it('B3 country wins when no state match', () => expect(selectRate(rates, 'physical', A({ state: 'NV', city: 'Reno' }))?.id).toBe(1));
  it('B4 tie broken by higher rate_bps then id', () => {
    const tie = [T({ id: 5, jurisdiction_country: 'US', rate_bps: 500 }), T({ id: 6, jurisdiction_country: 'US', rate_bps: 800 })];
    expect(selectRate(tie, 'physical', A())?.id).toBe(6);
  });
});

describe('Phase 1D · C. applies_to filtering', () => {
  const rates = [
    T({ id: 1, jurisdiction_country: 'US', applies_to: ['physical'], rate_bps: 700, name: 'phys only' }),
    T({ id: 2, jurisdiction_country: 'US', applies_to: ['digital'], rate_bps: 300, name: 'digital only' }),
  ];
  it('C1 physical line selects the physical rate', () => expect(selectRate(rates, 'physical', A())?.id).toBe(1));
  it('C2 digital line selects the digital rate', () => expect(selectRate(rates, 'digital', A())?.id).toBe(2));
  it('C3 service line selects neither (no applies_to, no default) → null', () => expect(selectRate(rates, 'service', A())).toBeNull());
  it('C4 a rate not applying to the type is excluded even if jurisdiction matches', () => {
    expect(selectRate([T({ jurisdiction_country: 'US', applies_to: ['digital'] })], 'physical', A())).toBeNull();
  });
});

describe('Phase 1D · D. Postal patterns', () => {
  it('D1 matching postal regex applies', () => expect(rateMatchesAddress(T({ jurisdiction_country: 'US', postal_code_pattern: '^9[0-1]\\d{3}$' }), A({ postal: '90001' }))).toBe(true));
  it('D2 non-matching postal fails', () => expect(rateMatchesAddress(T({ postal_code_pattern: '^9[0-1]\\d{3}$' }), A({ postal: '10001' }))).toBe(false));
  it('D3 invalid stored regex fails closed (never matches)', () => expect(rateMatchesAddress(T({ postal_code_pattern: '[' }), A({ postal: '90001' }))).toBe(false));
  it('D4 postal adds specificity so a postal-scoped rate beats a plain state rate', () => {
    const rates = [
      T({ id: 1, jurisdiction_country: 'US', jurisdiction_state: 'CA', rate_bps: 725 }),
      T({ id: 2, jurisdiction_country: 'US', jurisdiction_state: 'CA', postal_code_pattern: '^90', rate_bps: 1000 }),
    ];
    expect(selectRate(rates, 'physical', A({ postal: '90001' }))?.id).toBe(2);
  });
});

describe('Phase 1D · E. Default fallback / no service', () => {
  it('E1 no matching jurisdiction falls back to the default rate', () => {
    const rates = [T({ id: 1, jurisdiction_country: 'US', jurisdiction_state: 'CA', rate_bps: 725 }), T({ id: 9, jurisdiction_country: null, is_default: true, rate_bps: 500, name: 'default' })];
    expect(selectRate(rates, 'physical', A({ country: 'JP', state: undefined, city: undefined }))?.id).toBe(9);
  });
  it('E2 no match and no default → null (no tax)', () => {
    expect(selectRate([T({ jurisdiction_country: 'US', jurisdiction_state: 'CA' })], 'physical', A({ country: 'JP' }))).toBeNull();
  });
  it('E3 default that does not apply to the type is not used', () => {
    expect(selectRate([T({ is_default: true, jurisdiction_country: null, applies_to: ['physical'] })], 'digital', A())).toBeNull();
  });
});

describe('Phase 1D · F. computeTax (buckets, rounding)', () => {
  it('F1 single physical line at 7.25%', () => {
    const r = computeTax([T({ jurisdiction_country: 'US', rate_bps: 725 })], [{ type: 'physical', amount: 100 }], A(), false);
    expect(r.taxAmount).toBe(7.25);
    expect(r.effectiveRateBps).toBe(725);
  });
  it('F2 rounds to cents', () => {
    const r = computeTax([T({ rate_bps: 725 })], [{ type: 'physical', amount: 9.99 }], A(), false);
    expect(r.taxAmount).toBe(0.72); // 9.99 * 0.0725 = 0.724275 → 0.72
  });
  it('F3 mixed types with different rates sum correctly', () => {
    const rates = [
      T({ id: 1, jurisdiction_country: 'US', applies_to: ['physical'], rate_bps: 1000 }),
      T({ id: 2, jurisdiction_country: 'US', applies_to: ['digital'], rate_bps: 500 }),
    ];
    const lines: TaxLine[] = [{ type: 'physical', amount: 100 }, { type: 'digital', amount: 50 }];
    const r = computeTax(rates, lines, A(), false);
    expect(r.taxAmount).toBe(12.5); // 100*10% + 50*5%
    expect(r.effectiveRateBps).toBeNull(); // two distinct non-zero rates → non-uniform
  });
  it('F4 multiple lines of the same type are bucketed', () => {
    const r = computeTax([T({ rate_bps: 1000 })], [{ type: 'physical', amount: 30 }, { type: 'physical', amount: 70 }], A(), false);
    expect(r.taxAmount).toBe(10); // (30+70)*10%
  });
  it('F5 no applicable rate → zero tax', () => {
    const r = computeTax([T({ jurisdiction_country: 'US', jurisdiction_state: 'CA' })], [{ type: 'physical', amount: 100 }], A({ country: 'JP' }), false);
    expect(r.taxAmount).toBe(0);
  });
  it('F6 breakdown records base/rate/tax per type', () => {
    const r = computeTax([T({ rate_bps: 1000 })], [{ type: 'physical', amount: 100 }], A(), false);
    expect(r.breakdown[0]).toMatchObject({ type: 'physical', base: 100, rate_bps: 1000, tax: 10 });
  });
});

describe('Phase 1D · G. Exempt', () => {
  it('G1 exempt order → zero tax regardless of rates', () => {
    const r = computeTax([T({ rate_bps: 1000 })], [{ type: 'physical', amount: 500 }], A(), true);
    expect(r.taxAmount).toBe(0);
    expect(r.effectiveRateBps).toBe(0);
  });
  it('G2 exempt still reports the lines (base preserved, tax 0)', () => {
    const r = computeTax([T({ rate_bps: 1000 })], [{ type: 'physical', amount: 500 }], A(), true);
    expect(r.breakdown[0]).toMatchObject({ base: 500, tax: 0 });
  });
});

describe('Phase 1D · H. Multi-state / international', () => {
  const rates = [
    T({ id: 1, jurisdiction_country: 'US', jurisdiction_state: 'CA', rate_bps: 725 }),
    T({ id: 2, jurisdiction_country: 'US', jurisdiction_state: 'NY', rate_bps: 800 }),
    T({ id: 3, jurisdiction_country: 'GB', rate_bps: 2000, name: 'UK VAT' }),
  ];
  it('H1 CA buyer gets CA rate', () => expect(computeTax(rates, [{ type: 'physical', amount: 100 }], A({ state: 'CA', city: undefined }), false).taxAmount).toBe(7.25));
  it('H2 NY buyer gets NY rate', () => expect(computeTax(rates, [{ type: 'physical', amount: 100 }], A({ state: 'NY', city: undefined }), false).taxAmount).toBe(8));
  it('H3 UK buyer gets VAT', () => expect(computeTax(rates, [{ type: 'physical', amount: 100 }], A({ country: 'GB', state: undefined, city: undefined }), false).taxAmount).toBe(20));
  it('H4 a US state with no configured rate and no default → no tax', () => {
    expect(computeTax(rates, [{ type: 'physical', amount: 100 }], A({ state: 'TX', city: undefined }), false).taxAmount).toBe(0);
  });
});

describe('Phase 1D · I. Refund', () => {
  it('I1 full refund reverses full tax', () => expect(refundTax(7.25, 100, 100)).toBe(7.25));
  it('I2 half refund reverses half tax', () => expect(refundTax(10, 100, 50)).toBe(5));
  it('I3 over-refund clamps to full', () => expect(refundTax(10, 100, 150)).toBe(10));
  it('I4 zero base → zero', () => expect(refundTax(10, 0, 50)).toBe(0));
  it('I5 partial rounds to cents', () => expect(refundTax(7.25, 100, 33.33)).toBe(2.42)); // 7.25*0.3333=2.4164→2.42
});

describe('Phase 1D · J. Adversarial', () => {
  it('J1 disabled rate is never selected', () => {
    expect(selectRate([T({ jurisdiction_country: 'US', enabled: false })], 'physical', A())).toBeNull();
  });
  it('J2 client cannot avoid tax by type — engine buckets by the type passed (caller uses CATALOG type)', () => {
    // a physical line is taxed at the physical rate even if a cheaper digital rate exists
    const rates = [T({ id: 1, applies_to: ['physical'], rate_bps: 1000 }), T({ id: 2, applies_to: ['digital'], rate_bps: 0 })];
    expect(computeTax(rates, [{ type: 'physical', amount: 100 }], A(), false).taxAmount).toBe(10);
  });
  it('J3 empty address with a country-null default still taxes via default', () => {
    const r = computeTax([T({ jurisdiction_country: null, is_default: true, rate_bps: 500 })], [{ type: 'physical', amount: 100 }], {}, false);
    expect(r.taxAmount).toBe(5);
  });
  it('J4 no rates configured → zero tax (engine is safe with empty config)', () => {
    expect(computeTax([], [{ type: 'physical', amount: 100 }], A(), false).taxAmount).toBe(0);
  });
  it('J5 a malicious huge postal does not crash matching', () => {
    expect(() => rateMatchesAddress(T({ postal_code_pattern: '^9' }), A({ postal: '9'.repeat(10000) }))).not.toThrow();
  });
});
