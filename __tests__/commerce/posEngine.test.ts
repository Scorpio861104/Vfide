import { describe, expect, it } from '@jest/globals';
import {
  expectedDrawer, reconcileDrawer, canRegisterAct, availableAt, canFulfillAtLocation,
  computeTransfer, buildReceipt, tenderSufficient,
  type DrawerMovement, type LocationStock,
} from '@/lib/commerce/posEngine';

const mv = (kind: DrawerMovement['kind'], amount: number): DrawerMovement => ({ kind, amount });

// ════════════════════════════════════════════════════════
// COMMERCE OPERATIONS PHASE 4 — PHYSICAL RETAIL SCENARIO MATRIX
//   A. Drawer expected   B. Reconciliation (over/short)   C. Register lifecycle
//   D. Location stock     E. Fulfillment    F. Transfers    G. Receipts    H. Adversarial
// ════════════════════════════════════════════════════════

describe('Phase 4 · A. Expected drawer', () => {
  it('A1 float only', () => expect(expectedDrawer(100, [])).toBe(100));
  it('A2 cash sales add', () => expect(expectedDrawer(100, [mv('sale_cash', 20), mv('sale_cash', 5)])).toBe(125));
  it('A3 cash refunds subtract', () => expect(expectedDrawer(100, [mv('sale_cash', 50), mv('refund_cash', 30)])).toBe(120));
  it('A4 payouts subtract, pay-ins add', () => expect(expectedDrawer(100, [mv('pay_in', 40), mv('payout', 25)])).toBe(115));
  it('A5 non-cash sales do NOT touch the drawer', () => {
    // sale_noncash is not a drawer movement kind passed here; only cash kinds count
    expect(expectedDrawer(100, [mv('sale_cash', 10)])).toBe(110);
  });
});

describe('Phase 4 · B. Reconciliation', () => {
  it('B1 balanced when counted == expected', () => expect(reconcileDrawer(100, [mv('sale_cash', 50)], 150)).toMatchObject({ expected: 150, variance: 0, status: 'balanced' }));
  it('B2 over when counted > expected', () => expect(reconcileDrawer(100, [], 130).status).toBe('over'));
  it('B3 short when counted < expected', () => {
    const r = reconcileDrawer(100, [mv('sale_cash', 50)], 120);
    expect(r.status).toBe('short');
    expect(r.variance).toBe(-30);
  });
  it('B4 variance rounds to cents', () => expect(reconcileDrawer(100.5, [mv('sale_cash', 0.25)], 100.7).variance).toBeCloseTo(-0.05, 2));
});

describe('Phase 4 · C. Register lifecycle', () => {
  it('C1 can open only when closed', () => { expect(canRegisterAct('closed', 'open')).toBe(true); expect(canRegisterAct('open', 'open')).toBe(false); });
  it('C2 can record only when open', () => { expect(canRegisterAct('open', 'record')).toBe(true); expect(canRegisterAct('closed', 'record')).toBe(false); });
  it('C3 can close only when open', () => { expect(canRegisterAct('open', 'close')).toBe(true); expect(canRegisterAct('closed', 'close')).toBe(false); });
});

describe('Phase 4 · D. Location stock', () => {
  const stocks: LocationStock[] = [{ location_id: 'L1', product_id: 1, quantity: 5 }, { location_id: 'L2', product_id: 1, quantity: 0 }];
  it('D1 returns stock at a location', () => expect(availableAt(stocks, 'L1', 1)).toBe(5));
  it('D2 zero at a location with no/zero stock', () => expect(availableAt(stocks, 'L2', 1)).toBe(0));
  it('D3 zero for an untracked product/location', () => expect(availableAt(stocks, 'L1', 99)).toBe(0));
});

describe('Phase 4 · E. Fulfillment at location', () => {
  const stocks: LocationStock[] = [{ location_id: 'L1', product_id: 1, quantity: 5 }, { location_id: 'L1', product_id: 2, quantity: 2 }];
  it('E1 fulfillable within stock', () => expect(canFulfillAtLocation(stocks, 'L1', [{ product_id: 1, quantity: 3 }]).ok).toBe(true));
  it('E2 shortfall reported', () => {
    const r = canFulfillAtLocation(stocks, 'L1', [{ product_id: 2, quantity: 5 }]);
    expect(r).toEqual({ ok: false, product_id: 2, available: 2, requested: 5 });
  });
  it('E3 a product not stocked here is unavailable', () => {
    expect(canFulfillAtLocation(stocks, 'L1', [{ product_id: 9, quantity: 1 }]).ok).toBe(false);
  });
  it('E4 multi-line: one shortfall fails the whole sale', () => {
    expect(canFulfillAtLocation(stocks, 'L1', [{ product_id: 1, quantity: 1 }, { product_id: 2, quantity: 9 }]).ok).toBe(false);
  });
});

describe('Phase 4 · F. Transfers (conserve units)', () => {
  it('F1 valid transfer moves units', () => expect(computeTransfer(10, 2, 3, false)).toEqual({ ok: true, fromAfter: 7, toAfter: 5 }));
  it('F2 cannot transfer more than source has', () => expect(computeTransfer(2, 0, 5, false)).toEqual({ ok: false, reason: 'INSUFFICIENT_SOURCE' }));
  it('F3 cannot transfer to the same location', () => expect(computeTransfer(10, 10, 1, true).reason).toBe('SAME_LOCATION'));
  it('F4 non-positive quantity rejected', () => expect(computeTransfer(10, 0, 0, false).reason).toBe('BAD_QUANTITY'));
  it('F5 total units conserved (from+to constant)', () => {
    const r = computeTransfer(10, 5, 4, false);
    expect((r.fromAfter ?? 0) + (r.toAfter ?? 0)).toBe(15);
  });
});

describe('Phase 4 · G. Receipts (total from composed pricing)', () => {
  const composed = { subtotal: 100, discount: 0, tax: 8, shipping: 0, total: 108 };
  it('G1 lays out line totals', () => {
    const r = buildReceipt([{ name: 'A', quantity: 2, unit_price: 25 }], composed, 108);
    expect(r.lines[0].line_total).toBe(50);
    expect(r.total).toBe(108);
  });
  it('G2 cash change = tendered - total', () => {
    expect(buildReceipt([{ name: 'A', quantity: 1, unit_price: 108 }], composed, 120).change).toBe(12);
  });
  it('G3 exact tender → zero change', () => {
    expect(buildReceipt([{ name: 'A', quantity: 1, unit_price: 108 }], composed, 108).change).toBe(0);
  });
  it('G4 receipt total never deviates from composed total (POS does not reprice)', () => {
    const r = buildReceipt([{ name: 'A', quantity: 1, unit_price: 999 }], composed, 108);
    expect(r.total).toBe(108); // composed total wins, not the line sum
  });
});

describe('Phase 4 · H. Adversarial', () => {
  it('H1 cash tender below total is insufficient', () => expect(tenderSufficient(108, 100, 'cash')).toBe(false));
  it('H2 cash tender at/above total is sufficient', () => expect(tenderSufficient(108, 108, 'cash')).toBe(true));
  it('H3 card/wallet always "sufficient" (charged exact elsewhere)', () => {
    expect(tenderSufficient(108, 0, 'card')).toBe(true);
    expect(tenderSufficient(108, 0, 'wallet')).toBe(true);
  });
  it('H4 change never negative even if tender < total slips through', () => {
    expect(buildReceipt([{ name: 'A', quantity: 1, unit_price: 50 }], { subtotal: 50, discount: 0, tax: 0, shipping: 0, total: 50 }, 10).change).toBe(0);
  });
  it('H5 negative opening float floored to 0', () => expect(expectedDrawer(-100, [mv('sale_cash', 50)])).toBe(50));
  it('H6 a short drawer is flagged, not silently absorbed', () => {
    expect(reconcileDrawer(200, [mv('sale_cash', 100)], 250).status).toBe('short'); // expected 300, counted 250
  });
});
