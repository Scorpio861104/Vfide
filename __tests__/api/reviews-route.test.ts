import { NextRequest } from 'next/server';

const RESP: Array<{ rows?: unknown[]; rowCount?: number }> = [];
function setResponses(r: Array<{ rows?: unknown[]; rowCount?: number }>) { RESP.length = 0; RESP.push(...r); }

const BUYER = '0x1111111111111111111111111111111111111111';
const MERCHANT = '0x2222222222222222222222222222222222222222';

jest.mock('@/lib/auth/rateLimit', () => ({ withRateLimit: jest.fn(async () => null) }));
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));
jest.mock('@/lib/auth/middleware', () => ({
  withAuth: (h: (req: NextRequest, user: { address: string }) => unknown) => (req: NextRequest) => h(req, { address: (globalThis as unknown as { __ME: string }).__ME }),
}));
jest.mock('@/lib/db', () => ({
  query: jest.fn(async () => {
    const q = (globalThis as unknown as { __RESP: typeof RESP }).__RESP;
    const r = q && q.length ? q.shift()! : { rows: [] };
    return { rows: r.rows ?? [], rowCount: r.rowCount ?? (r.rows?.length ?? 0) };
  }),
}));
(globalThis as unknown as { __RESP: typeof RESP }).__RESP = RESP;
(globalThis as unknown as { __ME: string }).__ME = BUYER;

import { POST } from '@/app/api/merchant/reviews/route';

const review = (body: unknown) => POST(new NextRequest('http://localhost/api/merchant/reviews', {
  method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' },
})) as Promise<Response>;

describe('Social · H. Reviews route — anti-abuse on the real path', () => {
  it('H1 a self-review (reviewer == merchant) is rejected 400', async () => {
    (globalThis as unknown as { __ME: string }).__ME = MERCHANT;
    const res = await review({ merchant_address: MERCHANT, product_id: 1, rating: 5, title: 'great', body: 'me' });
    expect(res.status).toBe(400);
    (globalThis as unknown as { __ME: string }).__ME = BUYER; // restore
  });

  it('H2 a duplicate review (already reviewed product) is rejected 409', async () => {
    setResponses([{ rows: [{ id: 99 }] }]); // existing review found
    const res = await review({ merchant_address: MERCHANT, product_id: 1, rating: 4 });
    expect(res.status).toBe(409);
  });

  it('H3 a VERIFIED purchaser review is stored with verified_purchase=true', async () => {
    setResponses([
      { rows: [] },                 // no existing review
      { rows: [{ id: 50 }] },       // purchase verification: paid order found
      { rows: [{ id: 50 }] },       // order_id lookup
      { rows: [{ id: 1, verified_purchase: true }] }, // insert returning
    ]);
    const res = await review({ merchant_address: MERCHANT, product_id: 1, rating: 5 });
    expect(res.status).toBe(201);
    expect((await res.json()).review.verified_purchase).toBe(true);
  });

  it('H4 a NON-purchaser review is allowed but flagged verified_purchase=false', async () => {
    setResponses([
      { rows: [] },                 // no existing review
      { rows: [] },                 // purchase verification: NO paid order
      { rows: [{ id: 2, verified_purchase: false }] }, // insert returning (no order_id lookup branch)
    ]);
    const res = await review({ merchant_address: MERCHANT, product_id: 7, rating: 1 });
    expect(res.status).toBe(201);
    expect((await res.json()).review.verified_purchase).toBe(false);
  });

  it('H5 an invalid rating (out of 1-5) is rejected 400', async () => {
    const res = await review({ merchant_address: MERCHANT, product_id: 1, rating: 99 });
    expect(res.status).toBe(400);
  });
});
