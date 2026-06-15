import { NextRequest } from 'next/server';

const RESP: Array<{ rows?: unknown[]; rowCount?: number }> = [];
const CALLS: Array<{ sql: string; params: unknown[] }> = [];
function setResponses(r: Array<{ rows?: unknown[]; rowCount?: number }>) { RESP.length = 0; CALLS.length = 0; RESP.push(...r); }

const ADDR = '0x1234567890123456789012345678901234567890';

jest.mock('@/lib/auth/rateLimit', () => ({ withRateLimit: jest.fn(async () => null) }));
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));
// Local middleware mock: withAuth pass-through + requireOwnership success (the route uses both).
jest.mock('@/lib/auth/middleware', () => ({
  withAuth: (handler: (req: NextRequest, user: { address: string }) => unknown) =>
    (request: NextRequest, user: { address: string } = { address: ADDR }) => handler(request, user),
  requireOwnership: jest.fn(async () => ({ address: ADDR })),
}));
jest.mock('@/lib/db', () => ({
  query: jest.fn(async (sql: string, params: unknown[]) => {
    (globalThis as unknown as { __rCALLS: typeof CALLS }).__rCALLS?.push({ sql, params });
    const q = (globalThis as unknown as { __rRESP: typeof RESP }).__rRESP;
    const r = q && q.length ? q.shift()! : { rows: [] };
    return { rows: r.rows ?? [], rowCount: r.rowCount ?? (r.rows?.length ?? 0) };
  }),
}));
(globalThis as unknown as { __rRESP: typeof RESP }).__rRESP = RESP;
(globalThis as unknown as { __rCALLS: typeof CALLS }).__rCALLS = CALLS;

import { POST, PATCH } from '@/app/api/merchant/returns/route';

const post = (body: unknown) => new NextRequest('http://localhost/api/merchant/returns', {
  method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' },
});
const patch = (body: unknown) => new NextRequest('http://localhost/api/merchant/returns', {
  method: 'PATCH', body: JSON.stringify(body), headers: { 'content-type': 'application/json' },
});

describe('Phase 1F · H. RMA creation', () => {
  it('H1 creates a return for an owned order', async () => {
    setResponses([
      { rows: [{ customer_address: ADDR }] }, // order ownership lookup — caller IS the order's customer
      { rows: [{ product_id: 1 }] },          // order items for F-BE-036 validation (product 1 is valid)
      { rows: [{ id: 'ret-1', order_id: '5', customer_address: ADDR, items: [], type: 'refund', reason: null, status: 'requested', refund_amount: null, credit_amount: null, created_at: '2026-01-01' }] }, // insert
    ]);
    const res = await POST(post({ merchantAddress: ADDR, orderId: '5', items: [{ product_id: 1, quantity: 1 }], type: 'refund', reason: 'defective' }), { address: ADDR }) as Response;
    expect([200, 201]).toContain(res.status);
  });
});

describe('Phase 1F · I. Authoritative refund on completion', () => {
  it('I1 computes refund from order totals, overriding the client amount', async () => {
    // PATCH flow: current row → (compute: order row, order items) → UPDATE return → [restock] → settle order → revoke
    setResponses([
      { rows: [{ status: 'approved', items: [{ product_id: 2, quantity: 1 }], order_id: '5', type: 'refund' }] }, // current
      { rows: [{ id: 5, subtotal: '130', discount_amount: '0', tax_amount: '10.40', shipping_amount: '0' }] },      // order totals
      { rows: [{ product_id: 1, quantity: 2, unit_price: '50' }, { product_id: 2, quantity: 1, unit_price: '30' }] }, // order items
      { rowCount: 1 }, // UPDATE merchant_returns
      // status 'completed' triggers restock (items has product_id) then settle:
      { rowCount: 1 }, // restock product 2
      { rowCount: 1 }, // persist __restocked marker
      { rows: [{ id: 5 }] }, // settle order → refunded
      { rowCount: 1 }, // revoke digital deliveries
    ]);
    const res = await PATCH(patch({ returnId: 'ret-1', merchantAddress: ADDR, status: 'completed', refundAmount: 999 }), { address: ADDR }) as Response;
    expect(res.status).toBe(200);
    // the UPDATE merchant_returns must have used the COMPUTED refund (30 + 2.40 = 32.40), not 999
    const upd = CALLS.find(c => /UPDATE merchant_returns\s+SET status/.test(c.sql));
    expect(upd).toBeTruthy();
    expect((upd!.params as unknown[])[3]).toBe(32.4);
  });

  it('I2 invalid transition (completed→completed) rejected', async () => {
    setResponses([{ rows: [{ status: 'completed', items: [], order_id: '5', type: 'refund' }] }]);
    const res = await PATCH(patch({ returnId: 'ret-1', merchantAddress: ADDR, status: 'completed' }), { address: ADDR }) as Response;
    expect(res.status).toBe(400);
  });

  it('I3 return not found → 404', async () => {
    setResponses([{ rows: [] }]);
    const res = await PATCH(patch({ returnId: 'nope', merchantAddress: ADDR, status: 'approved' }), { address: ADDR }) as Response;
    expect(res.status).toBe(404);
  });

  it('I4 missing fields → 400', async () => {
    setResponses([]);
    const res = await PATCH(patch({ returnId: 'ret-1' }), { address: ADDR }) as Response;
    expect(res.status).toBe(400);
  });
});

describe('Phase 1F · J. Settlement linkage', () => {
  it('J1 completing a refund return settles the order + revokes digital deliveries', async () => {
    setResponses([
      { rows: [{ status: 'approved', items: [], order_id: '7', type: 'refund' }] }, // current
      { rows: [{ id: 7, subtotal: '100', discount_amount: '0', tax_amount: '0', shipping_amount: '0' }] }, // order totals
      { rows: [] }, // order items (queried before returnLines check; empty → skips computeRefund)
      { rowCount: 1 }, // UPDATE merchant_returns
      { rowCount: 1 }, // persist __restocked marker (restock branch runs on completed)
      { rows: [{ id: 7 }] }, // settle order
      { rowCount: 2 }, // revoke deliveries
    ]);
    const res = await PATCH(patch({ returnId: 'ret-2', merchantAddress: ADDR, status: 'completed', refundAmount: 10 }), { address: ADDR }) as Response;
    expect(res.status).toBe(200);
    const settle = CALLS.find(c => /UPDATE merchant_orders SET status = 'refunded'/.test(c.sql));
    const revoke = CALLS.find(c => /merchant_digital_deliveries SET revoked = true/.test(c.sql) && /return_completed/.test(c.sql));
    expect(Boolean(settle)).toBe(true);
    expect(Boolean(revoke)).toBe(true);
  });
});
