import { describe, expect, it } from '@jest/globals';
import { computeTax, type TaxRate, type TaxLine, type ProductType } from '@/lib/commerce/taxEngine';

/**
 * These exercise the tax engine exactly as app/api/merchant/orders/route.ts uses it: build TaxLine[] from
 * order items (unit_price * quantity, bucketed by the CATALOG product_type), then computeTax against the
 * merchant's enabled rates with the buyer's shipping address. This is the integration contract; the orders
 * route itself is covered by the build's typecheck + the pure matrix.
 */

const T = (o: Partial<TaxRate> = {}): TaxRate => ({
  id: 1, name: 'Rate', rate_bps: 725,
  jurisdiction_country: 'US', jurisdiction_state: null, jurisdiction_city: null, postal_code_pattern: null,
  is_default: false, enabled: true, applies_to: ['physical', 'digital', 'service'], ...o,
});

// mimic the orders-route mapping: items -> TaxLine[]
interface OrderItemLike { unit_price: number; quantity: number; product_type: ProductType }
function toTaxLines(items: OrderItemLike[]): TaxLine[] {
  return items.map((it) => ({ type: it.product_type, amount: Math.round(it.unit_price * it.quantity * 100) / 100 }));
}

describe('Phase 1D · K. Orders-route integration shape', () => {
  it('K1 a 3-item physical cart in CA computes line-summed tax', () => {
    const items: OrderItemLike[] = [
      { unit_price: 19.99, quantity: 2, product_type: 'physical' }, // 39.98
      { unit_price: 5.00, quantity: 3, product_type: 'physical' },  // 15.00
      { unit_price: 100.00, quantity: 1, product_type: 'physical' },// 100.00
    ]; // base 154.98
    const r = computeTax([T({ jurisdiction_country: 'US', jurisdiction_state: 'CA', rate_bps: 725 })], toTaxLines(items), { country: 'US', state: 'CA' }, false);
    expect(r.taxableBase).toBe(154.98);
    expect(r.taxAmount).toBe(11.24); // 154.98 * 7.25% = 11.23605 → 11.24
  });

  it('K2 digital + physical mix taxes only what each rate applies to', () => {
    const rates = [
      T({ id: 1, jurisdiction_country: 'US', applies_to: ['physical'], rate_bps: 1000 }),
      T({ id: 2, jurisdiction_country: 'US', applies_to: ['digital'], rate_bps: 0 }),
    ];
    const items: OrderItemLike[] = [
      { unit_price: 50, quantity: 1, product_type: 'physical' },
      { unit_price: 30, quantity: 1, product_type: 'digital' },
    ];
    const r = computeTax(rates, toTaxLines(items), { country: 'US' }, false);
    expect(r.taxAmount).toBe(5); // 50*10% + 30*0%
  });

  it('K3 exempt order zeroes tax even with rates', () => {
    const r = computeTax([T({ rate_bps: 1000 })], toTaxLines([{ unit_price: 100, quantity: 5, product_type: 'physical' }]), { country: 'US' }, true);
    expect(r.taxAmount).toBe(0);
  });

  it('K4 international order with no matching rate and no default → no tax (fallback to provided handled by route)', () => {
    const r = computeTax([T({ jurisdiction_country: 'US', jurisdiction_state: 'CA' })], toTaxLines([{ unit_price: 100, quantity: 1, product_type: 'physical' }]), { country: 'DE' }, false);
    expect(r.taxAmount).toBe(0);
  });

  it('K5 service-type line uses a service-applicable rate', () => {
    const r = computeTax([T({ jurisdiction_country: 'US', applies_to: ['service'], rate_bps: 600 })], toTaxLines([{ unit_price: 200, quantity: 1, product_type: 'service' }]), { country: 'US' }, false);
    expect(r.taxAmount).toBe(12);
  });
});

describe('Phase 1D · L. Real-world jurisdiction modeling', () => {
  // NOTE on modeling: VFIDE applies a single most-specific rate per type. Some US jurisdictions stack
  // state+county+city rates additively; a merchant models that by configuring ONE combined rate for the most
  // specific jurisdiction (e.g. a 9.5% "Los Angeles" rate that already includes state+county+city). This is a
  // documented modeling choice, not additive stacking. These tests assert that contract.
  it('L1 a combined city rate (state+local folded in) is applied as-is', () => {
    const rates = [
      T({ id: 1, jurisdiction_country: 'US', jurisdiction_state: 'CA', rate_bps: 725, name: 'CA state' }),
      T({ id: 2, jurisdiction_country: 'US', jurisdiction_state: 'CA', jurisdiction_city: 'Los Angeles', rate_bps: 950, name: 'LA combined' }),
    ];
    const r = computeTax(rates, [{ type: 'physical', amount: 100 }], { country: 'US', state: 'CA', city: 'Los Angeles' }, false);
    expect(r.taxAmount).toBe(9.5); // the combined LA rate, NOT 7.25+9.5
    expect(r.effectiveRateBps).toBe(950);
  });
  it('L2 buyer just outside the city gets the state rate', () => {
    const rates = [
      T({ id: 1, jurisdiction_country: 'US', jurisdiction_state: 'CA', rate_bps: 725 }),
      T({ id: 2, jurisdiction_country: 'US', jurisdiction_state: 'CA', jurisdiction_city: 'Los Angeles', rate_bps: 950 }),
    ];
    const r = computeTax(rates, [{ type: 'physical', amount: 100 }], { country: 'US', state: 'CA', city: 'Pasadena' }, false);
    expect(r.taxAmount).toBe(7.25);
  });
  it('L3 origin-based merchants can use a single default rate for all buyers', () => {
    const r = computeTax([T({ jurisdiction_country: null, is_default: true, rate_bps: 600 })], [{ type: 'physical', amount: 100 }], { country: 'US', state: 'TX' }, false);
    expect(r.taxAmount).toBe(6);
  });
});
