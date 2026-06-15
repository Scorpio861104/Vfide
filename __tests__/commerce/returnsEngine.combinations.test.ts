import { describe, expect, it } from '@jest/globals';
import {
  computeRefund, computeExchange, returnedValue,
  type OrderLineSnapshot, type OrderTotalsSnapshot,
} from '@/lib/commerce/returnsEngine';

// A richer order: 3× A@$20 (60) + 2× B@$45 (90) + 1× C@$10 (10) = subtotal 160
const ORDER: OrderLineSnapshot[] = [
  { product_id: 1, quantity: 3, unit_price: 20 },
  { product_id: 2, quantity: 2, unit_price: 45 },
  { product_id: 3, quantity: 1, unit_price: 10 },
];
const TOT = (o: Partial<OrderTotalsSnapshot> = {}): OrderTotalsSnapshot => ({ subtotal: 160, discount: 0, tax: 0, shipping: 0, ...o });

// ════════════════════════════════════════════════════════
// COMMERCE OPERATIONS PHASE 1F — RETURNS COMBINATION & EDGE MATRIX
//   K. Multi-line partial   L. Discount + tax combined   M. Rounding   N. Quantity partials
//   O. Full pipeline (discount+tax+shipping)   P. Exchange combinations   Q. Edge
// ════════════════════════════════════════════════════════

describe('Phase 1F · K. Multi-line partial returns', () => {
  it('K1 returning one of each product', () => {
    const r = returnedValue(ORDER, [{ product_id: 1, quantity: 1 }, { product_id: 2, quantity: 1 }, { product_id: 3, quantity: 1 }]);
    expect(r.grossReturned).toBe(75); // 20 + 45 + 10
    expect(r.fullReturn).toBe(false);
  });
  it('K2 returning two different lines fully but not the third → not full', () => {
    const r = returnedValue(ORDER, [{ product_id: 1, quantity: 3 }, { product_id: 3, quantity: 1 }]);
    expect(r.grossReturned).toBe(70); // 60 + 10
    expect(r.fullReturn).toBe(false);
  });
  it('K3 returning all quantities of all lines → full', () => {
    const r = returnedValue(ORDER, [{ product_id: 1, quantity: 3 }, { product_id: 2, quantity: 2 }, { product_id: 3, quantity: 1 }]);
    expect(r.fullReturn).toBe(true);
  });
});

describe('Phase 1F · L. Discount + tax combined', () => {
  // 10% discount (16 off 160) and 8% tax on the discounted base (144 * 8% = 11.52)
  const tot = TOT({ discount: 16, tax: 11.52 });
  it('L1 full return reverses everything: 160 − 16 + 11.52 = 155.52', () => {
    expect(computeRefund(ORDER, tot, [{ product_id: 1, quantity: 3 }, { product_id: 2, quantity: 2 }, { product_id: 3, quantity: 1 }]).refundAmount).toBe(155.52);
  });
  it('L2 partial (return $90 of B): discount share + tax share', () => {
    // frac 90/160 = 0.5625; discount share 16*0.5625=9 → net 81; taxedBase=144; taxRefunded=11.52*(81/144)=6.48 → 87.48
    const r = computeRefund(ORDER, tot, [{ product_id: 2, quantity: 2 }]);
    expect(r.discountReversed).toBe(9);
    expect(r.taxRefunded).toBe(6.48);
    expect(r.refundAmount).toBe(87.48);
  });
});

describe('Phase 1F · M. Rounding', () => {
  it('M1 odd fractions round to cents', () => {
    // return 1× A ($20) of 160 with $10 discount → discount share 10*(20/160)=1.25 → net 18.75
    const r = computeRefund(ORDER, TOT({ discount: 10 }), [{ product_id: 1, quantity: 1 }]);
    expect(r.discountReversed).toBe(1.25);
    expect(r.refundAmount).toBe(18.75);
  });
  it('M2 tax rounding to nearest cent', () => {
    // return $10 (C) of 160, tax 13.33 on 160 base → 13.33*(10/160)=0.833 → 0.83
    const r = computeRefund(ORDER, TOT({ tax: 13.33 }), [{ product_id: 3, quantity: 1 }]);
    expect(r.taxRefunded).toBe(0.83);
  });
});

describe('Phase 1F · N. Quantity partials', () => {
  it('N1 returning 2 of 3 A units', () => {
    expect(returnedValue(ORDER, [{ product_id: 1, quantity: 2 }]).grossReturned).toBe(40);
  });
  it('N2 refund for 2 of 3 A units (no discount/tax)', () => {
    expect(computeRefund(ORDER, TOT(), [{ product_id: 1, quantity: 2 }]).refundAmount).toBe(40);
  });
  it('N3 returning more than owned caps (5 of 3 A) → 60', () => {
    expect(computeRefund(ORDER, TOT(), [{ product_id: 1, quantity: 5 }]).refundAmount).toBe(60);
  });
});

describe('Phase 1F · O. Full pipeline (discount + tax + shipping)', () => {
  const tot = TOT({ discount: 16, tax: 11.52, shipping: 12 });
  it('O1 full return refunds goods (net) + tax + shipping', () => {
    // 144 net + 11.52 tax + 12 shipping = 167.52
    expect(computeRefund(ORDER, tot, [{ product_id: 1, quantity: 3 }, { product_id: 2, quantity: 2 }, { product_id: 3, quantity: 1 }]).refundAmount).toBe(167.52);
  });
  it('O2 partial return excludes shipping', () => {
    const r = computeRefund(ORDER, tot, [{ product_id: 1, quantity: 1 }]);
    expect(r.shippingRefunded).toBe(0);
  });
  it('O3 full return, shipping policy off', () => {
    const r = computeRefund(ORDER, tot, [{ product_id: 1, quantity: 3 }, { product_id: 2, quantity: 2 }, { product_id: 3, quantity: 1 }], { refundShippingOnFullReturn: false });
    expect(r.refundAmount).toBe(155.52); // 167.52 − 12 shipping
  });
});

describe('Phase 1F · P. Exchange combinations', () => {
  it('P1 multiple replacements summed', () => {
    const r = computeExchange(ORDER, TOT(), [{ product_id: 2, quantity: 1 }], [{ unit_price: 20, quantity: 2 }, { unit_price: 10, quantity: 1 }]);
    expect(r.replacementValue).toBe(50); // 40 + 10
    expect(r.returnedCredit).toBe(45);
    expect(r.amountDue).toBe(5);
  });
  it('P2 exchange multiple returned lines for one replacement', () => {
    const r = computeExchange(ORDER, TOT(), [{ product_id: 1, quantity: 1 }, { product_id: 3, quantity: 1 }], [{ unit_price: 45, quantity: 1 }]);
    expect(r.returnedCredit).toBe(30); // 20 + 10
    expect(r.amountDue).toBe(15);
  });
  it('P3 exchange with discount reduces the credit proportionally', () => {
    // $32 discount on 160 (20%); return $45 (B) → credit 45 − 9 = 36; replacement $45 → owe 9
    const r = computeExchange(ORDER, TOT({ discount: 32 }), [{ product_id: 2, quantity: 1 }], [{ unit_price: 45, quantity: 1 }]);
    expect(r.returnedCredit).toBe(36);
    expect(r.amountDue).toBe(9);
  });
});

describe('Phase 1F · Q. Edge', () => {
  it('Q1 empty return list → zero refund', () => {
    expect(computeRefund(ORDER, TOT({ tax: 10, shipping: 5 }), []).refundAmount).toBe(0);
  });
  it('Q2 return of only product not in order → zero', () => {
    expect(computeRefund(ORDER, TOT(), [{ product_id: 99, quantity: 1 }]).refundAmount).toBe(0);
  });
  it('Q3 negative-quantity return is ignored (floored to 0 contribution)', () => {
    expect(returnedValue(ORDER, [{ product_id: 1, quantity: -5 }]).grossReturned).toBe(0);
  });
  it('Q4 shipping not refunded when there is no shipping', () => {
    expect(computeRefund(ORDER, TOT(), [{ product_id: 1, quantity: 3 }, { product_id: 2, quantity: 2 }, { product_id: 3, quantity: 1 }]).shippingRefunded).toBe(0);
  });
  it('Q5 refund never negative even with weird totals', () => {
    expect(computeRefund(ORDER, TOT({ discount: 1000 }), [{ product_id: 1, quantity: 1 }]).refundAmount).toBeGreaterThanOrEqual(0);
  });
});
