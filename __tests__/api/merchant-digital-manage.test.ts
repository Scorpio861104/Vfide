import { NextRequest } from 'next/server';

// Programmable DB mock (merchant-hq pattern): a global queue the inline factory consumes in order.
const RESP: Array<{ rows?: unknown[]; rowCount?: number }> = [];
const CALLS: Array<{ sql: string; params: unknown[] }> = [];
function setResponses(r: Array<{ rows?: unknown[]; rowCount?: number }>) { RESP.length = 0; CALLS.length = 0; RESP.push(...r); }

jest.mock('@/lib/auth/rateLimit', () => ({ withRateLimit: jest.fn(async () => null) }));
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));
jest.mock('@/lib/db', () => {
  const consume = (sql: string, params: unknown[]) => {
    (globalThis as unknown as { __dCALLS: typeof CALLS }).__dCALLS?.push({ sql, params });
    const q = (globalThis as unknown as { __dRESP: typeof RESP }).__dRESP;
    const r = q && q.length ? q.shift()! : { rows: [] };
    return { rows: r.rows ?? [], rowCount: r.rowCount ?? (r.rows?.length ?? 0) };
  };
  return {
    query: jest.fn(async (sql: string, params: unknown[]) => consume(sql, params)),
    // getClient returns a transaction client backed by the same queue (BEGIN/COMMIT are no-ops).
    getClient: jest.fn(async () => ({
      query: async (sql: string, params: unknown[]) => {
        if (/^\s*(BEGIN|COMMIT|ROLLBACK)\s*$/i.test(sql)) return { rows: [], rowCount: 0 };
        return consume(sql, params);
      },
      release: () => {},
    })),
  };
});
(globalThis as unknown as { __dRESP: typeof RESP }).__dRESP = RESP;
(globalThis as unknown as { __dCALLS: typeof CALLS }).__dCALLS = CALLS;

import { POST } from '@/app/api/merchant/digital/manage/route';

const USER = { address: '0x1234567890123456789012345678901234567890' };
const req = (body: unknown) => new NextRequest('http://localhost/api/merchant/digital/manage', {
  method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' },
});

describe('Phase 1B · J. auto_fulfill (orchestration)', () => {
  it('J1 fulfills a single digital item in a paid order', async () => {
    setResponses([
      { rows: [{ id: 7, customer_address: '0xbuyer' }] },          // paid order
      { rows: [{ product_id: 100 }] },                              // digital items
      { rows: [{ id: 50, product_id: 100, download_limit: 3, expires_hours: 24, license_key_pool: ['K1'], requires_license: false }] }, // asset
      { rows: [] },                                                 // already-delivered? no
      { rowCount: 1 },                                              // pop key (tx)
      { rows: [{ id: 900 }] },                                      // insert delivery (tx)
    ]);
    const res = await POST(req({ action: 'auto_fulfill', order_id: 7 }), USER) as Response;
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.count).toBe(1);
    expect(j.delivered[0].download_url).toMatch(/\/api\/merchant\/digital\?token=/);
  });

  it('J2 unpaid/foreign order → 404', async () => {
    setResponses([{ rows: [] }]); // order lookup empty
    const res = await POST(req({ action: 'auto_fulfill', order_id: 8 }), USER) as Response;
    expect(res.status).toBe(404);
  });

  it('J3 idempotent — already-delivered item is skipped (count 0)', async () => {
    setResponses([
      { rows: [{ id: 7, customer_address: '0xbuyer' }] },
      { rows: [{ product_id: 100 }] },
      { rows: [{ id: 50, product_id: 100, download_limit: 3, expires_hours: 24, license_key_pool: ['K1'], requires_license: false }] },
      { rows: [{ '?column?': 1 }] }, // already delivered → skip
    ]);
    const res = await POST(req({ action: 'auto_fulfill', order_id: 7 }), USER) as Response;
    expect(res.status).toBe(200);
    expect((await res.json()).count).toBe(0);
  });

  it('J4 license-required exhausted item is recorded as a failure, not delivered', async () => {
    setResponses([
      { rows: [{ id: 7, customer_address: '0xbuyer' }] },
      { rows: [{ product_id: 100 }] },
      { rows: [{ id: 50, product_id: 100, download_limit: 3, expires_hours: 24, license_key_pool: [], requires_license: true }] },
      { rows: [] },          // not already delivered
      { rowCount: 1 },       // insert into failures table
    ]);
    const res = await POST(req({ action: 'auto_fulfill', order_id: 7 }), USER) as Response;
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.count).toBe(0);
    expect(j.failures[0].reason).toBe('LICENSE_POOL_EXHAUSTED');
    // a failure row must have been written
    const failCall = CALLS.find(c => /merchant_digital_delivery_failures/.test(c.sql));
    expect(Boolean(failCall)).toBe(true);
  });

  it('J5 multiple digital items in one order each get fulfilled', async () => {
    setResponses([
      { rows: [{ id: 7, customer_address: '0xbuyer' }] },
      { rows: [{ product_id: 100 }, { product_id: 200 }] }, // two digital items
      // item 100
      { rows: [{ id: 50, product_id: 100, download_limit: null, expires_hours: null, license_key_pool: null, requires_license: false }] },
      { rows: [] }, { rows: [{ id: 901 }] },
      // item 200
      { rows: [{ id: 60, product_id: 200, download_limit: 1, expires_hours: 1, license_key_pool: ['X'], requires_license: false }] },
      { rows: [] }, { rowCount: 1 }, { rows: [{ id: 902 }] },
    ]);
    const res = await POST(req({ action: 'auto_fulfill', order_id: 7 }), USER) as Response;
    expect(res.status).toBe(200);
    expect((await res.json()).count).toBe(2);
  });
});

describe('Phase 1B · K. revoke (refund/chargeback)', () => {
  it('K1 revokes all deliveries for an owned order', async () => {
    setResponses([{ rows: [{ '?column?': 1 }] }, { rowCount: 2 }]); // owns, update 2
    const res = await POST(req({ action: 'revoke', order_id: 7, reason: 'refund' }), USER) as Response;
    expect(res.status).toBe(200);
    expect((await res.json()).revoked).toBe(2);
    const upd = CALLS.find(c => /SET revoked = true/.test(c.sql));
    expect(Boolean(upd)).toBe(true);
  });
  it('K2 revoke on a foreign order → 404', async () => {
    setResponses([{ rows: [] }]);
    const res = await POST(req({ action: 'revoke', order_id: 9 }), USER) as Response;
    expect(res.status).toBe(404);
  });
});

describe('Phase 1B · L. reissue (lost access)', () => {
  it('L1 resets download_count for an owned, non-revoked delivery', async () => {
    setResponses([
      { rows: [{ id: 900, revoked: false, download_count: 3, download_limit: 3, expires_at: null, license_key: 'K1', expires_hours: 24 }] },
      { rowCount: 1 },
    ]);
    const res = await POST(req({ action: 'reissue', delivery_id: 900 }), USER) as Response;
    expect(res.status).toBe(200);
    expect((await res.json()).download_count).toBe(0);
  });
  it('L2 cannot reissue a revoked (refunded) delivery → 409', async () => {
    setResponses([
      { rows: [{ id: 900, revoked: true, download_count: 0, download_limit: 3, expires_at: null, license_key: 'K1', expires_hours: 24 }] },
    ]);
    const res = await POST(req({ action: 'reissue', delivery_id: 900 }), USER) as Response;
    expect(res.status).toBe(409);
  });
  it('L3 reissue of a foreign/non-existent delivery → 404', async () => {
    setResponses([{ rows: [] }]);
    const res = await POST(req({ action: 'reissue', delivery_id: 12345 }), USER) as Response;
    expect(res.status).toBe(404);
  });
});

describe('Phase 1B · M. auth / validation', () => {
  it('M1 invalid action → 400', async () => {
    setResponses([]);
    const res = await POST(req({ action: 'nope' }), USER) as Response;
    expect(res.status).toBe(400);
  });
  it('M2 missing order_id on auto_fulfill → 400', async () => {
    setResponses([]);
    const res = await POST(req({ action: 'auto_fulfill' }), USER) as Response;
    expect(res.status).toBe(400);
  });
});
