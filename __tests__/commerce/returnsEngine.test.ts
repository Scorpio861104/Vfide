import { describe, expect, it } from '@jest/globals';
import {
  returnedValue, computeRefund, computeExchange,
  type OrderLineSnapshot, type OrderTotalsSnapshot,
} from '@/lib/commerce/returnsEngine';

// A simple 2-line order: 2× A@$50 + 1× B@$30 = subtotal 130
const ORDER: OrderLineSnapshot[] = [
  { product_id: 1, quantity: 2, unit_price: 50 },
  { product_id: 2, quantity: 1, unit_price: 30 },
];
const TOT = (o: Partial<OrderTotalsSnapshot> = {}): OrderTotalsSnapshot => ({ subtotal: 130, discount: 0, tax: 0, shipping: 0, ...o });

// ════════════════════════════════════════════════════════
// COMMERCE OPERATIONS PHASE 1F — RETURNS & EXCHANGES SCENARIO MATRIX
//   A. Returned value / full-vs-partial   B. Refund: no discount/tax   C. Refund: with discount
//   D. Refund: with tax   E. Refund: shipping policy   F. Exchange   G. Adversarial
// ════════════════════════════════════════════════════════

describe('Phase 1F · A. Returned value', () => {
  it('A1 partial return values the returned line', () => {
    expect(returnedValue(ORDER, [{ product_id: 1, quantity: 1 }]).grossReturned).toBe(50);
  });
  it('A2 returning everything → fullReturn true', () => {
    const r = returnedValue(ORDER, [{ product_id: 1, quantity: 2 }, { product_id: 2, quantity: 1 }]);
    expect(r).toEqual({ grossReturned: 130, fullReturn: true });
  });
  it('A3 partial → fullReturn false', () => {
    expect(returnedValue(ORDER, [{ product_id: 1, quantity: 1 }]).fullReturn).toBe(false);
  });
  it('A4 over-returning a line caps at the ordered quantity', () => {
    expect(returnedValue(ORDER, [{ product_id: 1, quantity: 5 }]).grossReturned).toBe(100); // only 2 were bought
  });
  it('A5 returning a product not in the order contributes 0', () => {
    expect(returnedValue(ORDER, [{ product_id: 99, quantity: 1 }]).grossReturned).toBe(0);
  });
});

describe('Phase 1F · B. Refund with no discount/tax/shipping', () => {
  it('B1 full refund returns the subtotal', () => {
    expect(computeRefund(ORDER, TOT(), [{ product_id: 1, quantity: 2 }, { product_id: 2, quantity: 1 }]).refundAmount).toBe(130);
  });
  it('B2 partial refund returns the line value', () => {
    expect(computeRefund(ORDER, TOT(), [{ product_id: 2, quantity: 1 }]).refundAmount).toBe(30);
  });
});

describe('Phase 1F · C. Refund with discount (do NOT refund unpaid discount)', () => {
  // order had a $13 discount on a $130 subtotal (10%)
  const tot = TOT({ discount: 13 });
  it('C1 full refund reverses subtotal minus the full discount', () => {
    // 130 − 13 = 117
    expect(computeRefund(ORDER, tot, [{ product_id: 1, quantity: 2 }, { product_id: 2, quantity: 1 }]).refundAmount).toBe(117);
  });
  it('C2 partial refund reverses a proportional discount', () => {
    // returning $50 of $130 → 38.46% → discount share 13*0.3846=5.0 → net 45.0
    const r = computeRefund(ORDER, tot, [{ product_id: 1, quantity: 1 }]);
    expect(r.discountReversed).toBe(5);
    expect(r.refundAmount).toBe(45);
  });
});

describe('Phase 1F · D. Refund with tax (proportional)', () => {
  // no discount; tax 10.40 on 130 base (8%)
  const tot = TOT({ tax: 10.4 });
  it('D1 full refund returns subtotal + all tax', () => {
    expect(computeRefund(ORDER, tot, [{ product_id: 1, quantity: 2 }, { product_id: 2, quantity: 1 }]).refundAmount).toBe(140.4);
  });
  it('D2 partial refund returns line value + proportional tax', () => {
    // return $30 of $130 → tax share 10.40*(30/130)=2.40 → 32.40
    const r = computeRefund(ORDER, tot, [{ product_id: 2, quantity: 1 }]);
    expect(r.taxRefunded).toBe(2.4);
    expect(r.refundAmount).toBe(32.4);
  });
});

describe('Phase 1F · E. Shipping policy', () => {
  const tot = TOT({ shipping: 9 });
  it('E1 full return refunds shipping by default', () => {
    expect(computeRefund(ORDER, tot, [{ product_id: 1, quantity: 2 }, { product_id: 2, quantity: 1 }]).shippingRefunded).toBe(9);
  });
  it('E2 full return with policy off does NOT refund shipping', () => {
    expect(computeRefund(ORDER, tot, [{ product_id: 1, quantity: 2 }, { product_id: 2, quantity: 1 }], { refundShippingOnFullReturn: false }).shippingRefunded).toBe(0);
  });
  it('E3 partial return never refunds shipping', () => {
    expect(computeRefund(ORDER, tot, [{ product_id: 1, quantity: 1 }]).shippingRefunded).toBe(0);
  });
});

describe('Phase 1F · F. Exchange', () => {
  it('F1 even exchange (same value) → nothing owed or refunded', () => {
    const r = computeExchange(ORDER, TOT(), [{ product_id: 2, quantity: 1 }], [{ unit_price: 30, quantity: 1 }]);
    expect(r).toMatchObject({ returnedCredit: 30, replacementValue: 30, amountDue: 0, amountRefund: 0 });
  });
  it('F2 upgrade exchange → buyer pays the difference', () => {
    const r = computeExchange(ORDER, TOT(), [{ product_id: 2, quantity: 1 }], [{ unit_price: 50, quantity: 1 }]);
    expect(r.amountDue).toBe(20);
    expect(r.amountRefund).toBe(0);
  });
  it('F3 downgrade exchange → buyer is refunded the difference', () => {
    const r = computeExchange(ORDER, TOT(), [{ product_id: 1, quantity: 1 }], [{ unit_price: 30, quantity: 1 }]);
    expect(r.amountRefund).toBe(20);
    expect(r.amountDue).toBe(0);
  });
  it('F4 exchange credit accounts for the proportional discount', () => {
    // $13 discount; returning $50 line → credit 50 − 5 = 45; replacement $60 → owe 15
    const r = computeExchange(ORDER, TOT({ discount: 13 }), [{ product_id: 1, quantity: 1 }], [{ unit_price: 60, quantity: 1 }]);
    expect(r.returnedCredit).toBe(45);
    expect(r.amountDue).toBe(15);
  });
});

describe('Phase 1F · G. Adversarial', () => {
  it('G1 refund never exceeds what was paid for the returned goods (over-return capped)', () => {
    // try to return 10× A — only 2 exist; refund capped at 100
    expect(computeRefund(ORDER, TOT(), [{ product_id: 1, quantity: 10 }]).grossReturned).toBe(100);
  });
  it('G2 discount cannot make a refund exceed gross (net stays ≤ gross)', () => {
    const r = computeRefund(ORDER, TOT({ discount: 13 }), [{ product_id: 1, quantity: 2 }, { product_id: 2, quantity: 1 }]);
    expect(r.refundAmount).toBeLessThanOrEqual(130);
  });
  it('G3 zero-subtotal order → zero refund (no divide-by-zero)', () => {
    expect(computeRefund([], TOT({ subtotal: 0 }), [{ product_id: 1, quantity: 1 }]).refundAmount).toBe(0);
  });
  it('G4 a fully-discounted order refunds ~0 goods value (but tax/shipping per rules)', () => {
    // subtotal 130, discount 130 → net 0; tax 0; full return shipping 5 → refund 5
    const r = computeRefund(ORDER, TOT({ discount: 130, shipping: 5 }), [{ product_id: 1, quantity: 2 }, { product_id: 2, quantity: 1 }]);
    expect(r.refundAmount).toBe(5);
  });
  it('G5 exchange with no replacement → full returned credit refunded', () => {
    const r = computeExchange(ORDER, TOT(), [{ product_id: 2, quantity: 1 }], []);
    expect(r.amountRefund).toBe(30);
  });
});
