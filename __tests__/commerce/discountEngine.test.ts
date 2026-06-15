import { describe, expect, it } from '@jest/globals';
import {
  validateCoupon, bundleMatchCount, bundleComponentCost, bundleSavings, composePrice,
  type BundleDefinition, type CartLineForBundle, type CouponUsageContext,
} from '@/lib/commerce/discountEngine';
import type { CouponDefinition } from '@/lib/coupons';

const NOW = 1_700_000_000_000;
const HOUR = 3_600_000;

const C = (o: Partial<CouponDefinition> = {}): CouponDefinition => ({
  id: 'c1', merchantAddress: '0xm', code: 'SAVE10', discountType: 'percentage', discountValue: 10,
  minOrderAmount: null, maxDiscount: null, maxUses: null, uses: 0, perCustomerLimit: null,
  validFrom: null, validUntil: null, active: true, productIds: null, ...o,
});
const ctx = (o: Partial<CouponUsageContext> = {}): CouponUsageContext => ({
  nowMs: NOW, customerRedemptions: 0, eligibleSubtotal: 100, fullSubtotal: 100, ...o,
});
const B = (o: Partial<BundleDefinition> = {}): BundleDefinition => ({
  id: 1, name: 'Combo', components: [{ product_id: 1, quantity: 1 }, { product_id: 2, quantity: 1 }],
  pricing_type: 'fixed', amount: 15, active: true, ...o,
});

// ════════════════════════════════════════════════════════
// COMMERCE OPERATIONS PHASE 1E — DISCOUNTS & BUNDLES SCENARIO MATRIX
//   A. Coupon: percentage/fixed   B. Coupon: time window   C. Coupon: usage caps
//   D. Coupon: product scope   E. Bundle match   F. Bundle savings   G. Composition   H. Adversarial
// ════════════════════════════════════════════════════════

describe('Phase 1E · A. Coupon percentage / fixed', () => {
  it('A1 10% of 100 = 10', () => expect(validateCoupon(C({ discountType: 'percentage', discountValue: 10 }), ctx())).toEqual({ ok: true, discount: 10 }));
  it('A2 fixed 15 off', () => expect(validateCoupon(C({ discountType: 'fixed', discountValue: 15 }), ctx())).toEqual({ ok: true, discount: 15 }));
  it('A3 maxDiscount caps a percentage', () => expect(validateCoupon(C({ discountValue: 50, maxDiscount: 20 }), ctx({ eligibleSubtotal: 200, fullSubtotal: 200 })).discount).toBe(20));
  it('A4 discount never exceeds the base', () => expect(validateCoupon(C({ discountType: 'fixed', discountValue: 500 }), ctx({ eligibleSubtotal: 100, fullSubtotal: 100 })).discount).toBe(100));
  it('A5 inactive coupon rejected', () => expect(validateCoupon(C({ active: false }), ctx())).toEqual({ ok: false, reason: 'INACTIVE', discount: 0 }));
  it('A6 zero-effect coupon → NO_DISCOUNT', () => expect(validateCoupon(C({ discountType: 'fixed', discountValue: 0.0001 }), ctx({ eligibleSubtotal: 0, fullSubtotal: 0 })).ok).toBe(false));
});

describe('Phase 1E · B. Coupon time window', () => {
  it('B1 before validFrom → NOT_STARTED', () => expect(validateCoupon(C({ validFrom: NOW + HOUR }), ctx()).reason).toBe('NOT_STARTED'));
  it('B2 after validUntil → EXPIRED', () => expect(validateCoupon(C({ validUntil: NOW - HOUR }), ctx()).reason).toBe('EXPIRED'));
  it('B3 within window → ok', () => expect(validateCoupon(C({ validFrom: NOW - HOUR, validUntil: NOW + HOUR }), ctx()).ok).toBe(true));
  it('B4 no window → always ok (time-wise)', () => expect(validateCoupon(C({ validFrom: null, validUntil: null }), ctx()).ok).toBe(true));
});

describe('Phase 1E · C. Coupon usage caps', () => {
  it('C1 total usage cap reached → USAGE_LIMIT_REACHED', () => expect(validateCoupon(C({ maxUses: 100, uses: 100 }), ctx()).reason).toBe('USAGE_LIMIT_REACHED'));
  it('C2 usage under cap → ok', () => expect(validateCoupon(C({ maxUses: 100, uses: 99 }), ctx()).ok).toBe(true));
  it('C3 per-customer limit reached → PER_CUSTOMER_LIMIT', () => expect(validateCoupon(C({ perCustomerLimit: 1 }), ctx({ customerRedemptions: 1 })).reason).toBe('PER_CUSTOMER_LIMIT'));
  it('C4 per-customer under limit → ok', () => expect(validateCoupon(C({ perCustomerLimit: 2 }), ctx({ customerRedemptions: 1 })).ok).toBe(true));
  it('C5 min order not met → MIN_ORDER_NOT_MET', () => expect(validateCoupon(C({ minOrderAmount: 200 }), ctx({ fullSubtotal: 100 })).reason).toBe('MIN_ORDER_NOT_MET'));
  it('C6 min order met → ok', () => expect(validateCoupon(C({ minOrderAmount: 50 }), ctx({ fullSubtotal: 100 })).ok).toBe(true));
});

describe('Phase 1E · D. Coupon product scope', () => {
  it('D1 scoped coupon discounts only eligible subtotal', () => {
    // 10% applied to eligible 40 (not full 100) = 4
    expect(validateCoupon(C({ productIds: ['1'] }), ctx({ eligibleSubtotal: 40, fullSubtotal: 100 })).discount).toBe(4);
  });
  it('D2 scoped coupon with no eligible items → NOT_APPLICABLE_TO_ITEMS', () => {
    expect(validateCoupon(C({ productIds: ['9'] }), ctx({ eligibleSubtotal: 0, fullSubtotal: 100 })).reason).toBe('NOT_APPLICABLE_TO_ITEMS');
  });
  it('D3 unscoped coupon uses full subtotal', () => {
    expect(validateCoupon(C({ productIds: null, discountValue: 10 }), ctx({ eligibleSubtotal: 0, fullSubtotal: 100 })).discount).toBe(10);
  });
});

describe('Phase 1E · E. Bundle match count', () => {
  const cart: CartLineForBundle[] = [{ product_id: 1, quantity: 2, unit_price: 10 }, { product_id: 2, quantity: 3, unit_price: 8 }];
  it('E1 one of each required → 2 copies limited by the scarcer', () => expect(bundleMatchCount(B(), cart)).toBe(2));
  it('E2 missing a component → 0', () => expect(bundleMatchCount(B(), [{ product_id: 1, quantity: 5, unit_price: 10 }])).toBe(0));
  it('E3 requires 2 of a component', () => expect(bundleMatchCount(B({ components: [{ product_id: 1, quantity: 2 }] }), cart)).toBe(1));
  it('E4 inactive bundle → 0', () => expect(bundleMatchCount(B({ active: false }), cart)).toBe(0));
  it('E5 empty components → 0', () => expect(bundleMatchCount(B({ components: [] }), cart)).toBe(0));
});

describe('Phase 1E · F. Bundle savings', () => {
  const cart: CartLineForBundle[] = [{ product_id: 1, quantity: 1, unit_price: 10 }, { product_id: 2, quantity: 1, unit_price: 8 }];
  it('F1 component cost is sum of unit*qty', () => expect(bundleComponentCost(B(), cart)).toBe(18));
  it('F2 fixed bundle saves component cost − price (18 − 15 = 3)', () => expect(bundleSavings(B({ pricing_type: 'fixed', amount: 15 }), cart)).toBe(3));
  it('F3 percent bundle saves amount% of components (10% of 18 = 1.8)', () => expect(bundleSavings(B({ pricing_type: 'percent', amount: 10 }), cart)).toBe(1.8));
  it('F4 bundle priced ABOVE components yields 0 (never a surcharge)', () => expect(bundleSavings(B({ pricing_type: 'fixed', amount: 25 }), cart)).toBe(0));
  it('F5 multiple copies multiply savings', () => {
    const c2: CartLineForBundle[] = [{ product_id: 1, quantity: 2, unit_price: 10 }, { product_id: 2, quantity: 2, unit_price: 8 }];
    expect(bundleSavings(B({ pricing_type: 'fixed', amount: 15 }), c2)).toBe(6); // 2 copies * 3
  });
});

describe('Phase 1E · G. Composition (the interaction with tax + shipping)', () => {
  it('G1 discount reduces subtotal; tax is computed on discounted base by the caller', () => {
    // subtotal 100, discount 20 → taxable 80; caller computed tax 80*10%=8; shipping 5 → total 93
    expect(composePrice(100, 20, 8, 5)).toEqual({ subtotal: 100, discount: 20, taxable: 80, tax: 8, shipping: 5, total: 93 });
  });
  it('G2 discount clamped to subtotal (never negative taxable)', () => {
    expect(composePrice(50, 80, 0, 5)).toEqual({ subtotal: 50, discount: 50, taxable: 0, tax: 0, shipping: 5, total: 5 });
  });
  it('G3 no discount → subtotal + tax + shipping', () => {
    expect(composePrice(100, 0, 7.25, 10).total).toBe(117.25);
  });
  it('G4 shipping is added after discount (discount does not reduce shipping)', () => {
    const r = composePrice(100, 100, 0, 12); // fully discounted goods, still pay shipping
    expect(r.total).toBe(12);
  });
  it('G5 rounds to cents', () => {
    // discount 9.999→10.00, taxable 99.99−10=89.99, +6.33+4.01 = 100.33
    expect(composePrice(99.99, 9.999, 6.33, 4.01).total).toBe(100.33);
  });
});

describe('Phase 1E · H. Adversarial', () => {
  it('H1 stacking past 100% off cannot make total negative', () => {
    expect(composePrice(100, 250, 0, 0).total).toBe(0);
  });
  it('H2 expired + usage-capped coupon: time checked, still rejected', () => {
    expect(validateCoupon(C({ validUntil: NOW - HOUR, maxUses: 100, uses: 100 }), ctx()).ok).toBe(false);
  });
  it('H3 a coupon cannot discount more than the eligible scoped base', () => {
    // fixed 500 but eligible only 40 → discount 40
    expect(validateCoupon(C({ discountType: 'fixed', discountValue: 500, productIds: ['1'] }), ctx({ eligibleSubtotal: 40, fullSubtotal: 100 })).discount).toBe(40);
  });
  it('H4 bundle savings cannot be gamed by a high "bundle price" into a surcharge', () => {
    const cart: CartLineForBundle[] = [{ product_id: 1, quantity: 1, unit_price: 10 }, { product_id: 2, quantity: 1, unit_price: 8 }];
    expect(bundleSavings(B({ pricing_type: 'fixed', amount: 1000 }), cart)).toBe(0);
  });
  it('H5 disabled coupon with otherwise-valid everything still rejected', () => {
    expect(validateCoupon(C({ active: false, discountValue: 10, validFrom: NOW - HOUR, validUntil: NOW + HOUR }), ctx()).ok).toBe(false);
  });
});
