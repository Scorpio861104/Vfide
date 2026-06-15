import { NextRequest } from 'next/server';

const RESP: Array<{ rows?: unknown[]; rowCount?: number }> = [];
const CALLS: Array<{ sql: string; params: unknown[] }> = [];
function setResponses(r: Array<{ rows?: unknown[]; rowCount?: number }>) { RESP.length = 0; CALLS.length = 0; RESP.push(...r); }

jest.mock('@/lib/auth/rateLimit', () => ({ withRateLimit: jest.fn(async () => null) }));
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));
jest.mock('@/lib/db', () => {
  const consume = (sql: string, params: unknown[]) => {
    (globalThis as unknown as { __bCALLS: typeof CALLS }).__bCALLS?.push({ sql, params });
    const q = (globalThis as unknown as { __bRESP: typeof RESP }).__bRESP;
    const r = q && q.length ? q.shift()! : { rows: [] };
    return { rows: r.rows ?? [], rowCount: r.rowCount ?? (r.rows?.length ?? 0) };
  };
  return {
    query: jest.fn(async (sql: string, params: unknown[]) => consume(sql, params)),
    getClient: jest.fn(async () => ({
      query: async (sql: string, params: unknown[]) => {
        if (/^\s*(BEGIN|COMMIT|ROLLBACK)\s*$/i.test(sql)) return { rows: [], rowCount: 0 };
        return consume(sql, params);
      },
      release: () => {},
    })),
  };
});
(globalThis as unknown as { __bRESP: typeof RESP }).__bRESP = RESP;
(globalThis as unknown as { __bCALLS: typeof CALLS }).__bCALLS = CALLS;

import { GET, POST } from '@/app/api/merchant/bundles/route';

const USER = { address: '0x1234567890123456789012345678901234567890' };
const get = (qs: string) => new NextRequest(`http://localhost/api/merchant/bundles${qs}`, { method: 'GET' });
const post = (body: unknown) => new NextRequest('http://localhost/api/merchant/bundles', {
  method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' },
});

describe('Phase 1E · I. Bundle CRUD', () => {
  it('I1 add_bundle verifies product ownership then inserts bundle + components', async () => {
    setResponses([
      { rows: [{ id: 1 }, { id: 2 }] },   // owned products
      { rows: [{ id: 50 }] },             // insert bundle (tx)
      { rowCount: 1 },                    // component 1 (tx)
      { rowCount: 1 },                    // component 2 (tx)
    ]);
    const res = await POST(post({ action: 'add_bundle', name: 'Combo', pricing_type: 'fixed', amount: 15, components: [{ product_id: 1, quantity: 1 }, { product_id: 2, quantity: 1 }] }), USER) as Response;
    expect(res.status).toBe(201);
    expect((await res.json()).bundle_id).toBe(50);
  });
  it('I2 add_bundle with a non-owned product → 400', async () => {
    setResponses([{ rows: [{ id: 1 }] }]); // only 1 of 2 owned
    const res = await POST(post({ action: 'add_bundle', name: 'X', pricing_type: 'fixed', amount: 10, components: [{ product_id: 1, quantity: 1 }, { product_id: 99, quantity: 1 }] }), USER) as Response;
    expect(res.status).toBe(400);
  });
  it('I3 update_bundle on unowned → 404', async () => {
    setResponses([{ rows: [] }]);
    const res = await POST(post({ action: 'update_bundle', bundle_id: 99, active: false }), USER) as Response;
    expect(res.status).toBe(404);
  });
  it('I4 delete_bundle owned → deleted', async () => {
    setResponses([{ rows: [{ '?column?': 1 }] }, { rowCount: 1 }]);
    const res = await POST(post({ action: 'delete_bundle', bundle_id: 50 }), USER) as Response;
    expect(res.status).toBe(200);
    expect((await res.json()).deleted).toBe(true);
  });
  it('I5 invalid pricing_type → 400', async () => {
    setResponses([]);
    const res = await POST(post({ action: 'add_bundle', name: 'X', pricing_type: 'bogus', amount: 1, components: [{ product_id: 1, quantity: 1 }] }), USER) as Response;
    expect(res.status).toBe(400);
  });
  it('I6 empty components → 400', async () => {
    setResponses([]);
    const res = await POST(post({ action: 'add_bundle', name: 'X', pricing_type: 'fixed', amount: 1, components: [] }), USER) as Response;
    expect(res.status).toBe(400);
  });
});

describe('Phase 1E · J. Bundle preview (public)', () => {
  const cart = Buffer.from(JSON.stringify([{ product_id: 1, quantity: 1, unit_price: 10 }, { product_id: 2, quantity: 1, unit_price: 8 }])).toString('base64');
  it('J1 preview returns bundle_discount for a matching cart', async () => {
    setResponses([
      { rows: [{ id: 50, name: 'Combo', pricing_type: 'fixed', amount: 15, active: true }] }, // bundles
      { rows: [{ bundle_id: 50, product_id: 1, quantity: 1 }, { bundle_id: 50, product_id: 2, quantity: 1 }] }, // components
    ]);
    const res = await GET(get(`?action=preview&merchant=0x1234567890123456789012345678901234567890&cart=${encodeURIComponent(cart)}`)) as Response;
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.bundle_discount).toBe(3); // 18 components − 15 bundle
    expect(j.applied[0].bundle_id).toBe(50);
  });
  it('J2 preview with no merchant → 400', async () => {
    setResponses([]);
    const res = await GET(get('?action=preview&cart=' + cart)) as Response;
    expect(res.status).toBe(400);
  });
  it('J3 preview with an empty/garbage cart → zero discount', async () => {
    setResponses([
      { rows: [{ id: 50, name: 'Combo', pricing_type: 'fixed', amount: 15, active: true }] },
      { rows: [{ bundle_id: 50, product_id: 1, quantity: 1 }, { bundle_id: 50, product_id: 2, quantity: 1 }] },
    ]);
    const res = await GET(get('?action=preview&merchant=0x1234567890123456789012345678901234567890&cart=not-base64')) as Response;
    expect(res.status).toBe(200);
    expect((await res.json()).bundle_discount).toBe(0);
  });
});

describe('Phase 1E · K. validation', () => {
  it('K1 unknown action → 400', async () => {
    setResponses([]);
    const res = await POST(post({ action: 'nope' }), USER) as Response;
    expect(res.status).toBe(400);
  });
});
