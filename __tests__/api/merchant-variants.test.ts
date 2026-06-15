import { NextRequest } from 'next/server';

// Programmable DB mock (merchant-hq pattern): a module-level response queue the factory consumes in order.
// Tests push a sequence of responses via setResponses(); the inline jest.fn keeps its implementation.
const RESP: Array<{ rows?: unknown[]; rowCount?: number }> = [];
const CALLS: Array<{ sql: string; params: unknown[] }> = [];
function setResponses(r: Array<{ rows?: unknown[]; rowCount?: number }>) { RESP.length = 0; CALLS.length = 0; RESP.push(...r); }

jest.mock('@/lib/auth/rateLimit', () => ({ withRateLimit: jest.fn(async () => null) }));
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));
jest.mock('@/lib/db', () => ({
  query: jest.fn(async (sql: string, params: unknown[]) => {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    (globalThis as unknown as { __vCALLS: typeof CALLS }).__vCALLS?.push({ sql, params });
    const q = (globalThis as unknown as { __vRESP: typeof RESP }).__vRESP;
    const r = q && q.length ? q.shift()! : { rows: [] };
    return { rows: r.rows ?? [], rowCount: r.rowCount ?? (r.rows?.length ?? 0) };
  }),
  getClient: jest.fn(),
}));
(globalThis as unknown as { __vRESP: typeof RESP }).__vRESP = RESP;
(globalThis as unknown as { __vCALLS: typeof CALLS }).__vCALLS = CALLS;

import { GET, POST, PATCH, DELETE } from '@/app/api/merchant/products/[id]/variants/route';

const USER = { address: '0x1234567890123456789012345678901234567890' };
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const reqGet = (id: string) => new NextRequest(`http://localhost/api/merchant/products/${id}/variants`, { method: 'GET' });
const reqBody = (method: string, id: string, body: unknown) =>
  new NextRequest(`http://localhost/api/merchant/products/${id}/variants`, {
    method, body: JSON.stringify(body), headers: { 'content-type': 'application/json' },
  });


describe('Phase 1A · I. Variant CRUD — create', () => {
  it('I1 creates a variant on an owned product (201)', async () => {
    setResponses([{ rows: [{ id: 1 }] }, { rows: [{ id: 501 }] }]);
    const res = await POST(reqBody('POST', '1', { name: 'Large / Blue', price_override: 35, inventory_count: 10, attributes: { size: 'L', color: 'Blue' } }), USER, ctx('1')) as Response;
    expect(res.status).toBe(201);
    expect((await res.json()).variant_id).toBe(501);
  });
  it('I2 rejects create on a product the caller does NOT own (404)', async () => {
    setResponses([{ rows: [] }]);
    const res = await POST(reqBody('POST', '999', { name: 'X' }), USER, ctx('999')) as Response;
    expect(res.status).toBe(404);
  });
  it('I3 rejects invalid body — missing name (400)', async () => {
    setResponses([{ rows: [{ id: 1 }] }]);
    const res = await POST(reqBody('POST', '1', { price_override: 5 }), USER, ctx('1')) as Response;
    expect(res.status).toBe(400);
  });
  it('I4 negative price_override rejected by schema (400)', async () => {
    setResponses([{ rows: [{ id: 1 }] }]);
    const res = await POST(reqBody('POST', '1', { name: 'X', price_override: -5 }), USER, ctx('1')) as Response;
    expect(res.status).toBe(400);
  });
});

describe('Phase 1A · J. Variant CRUD — update / reorder', () => {
  it('J1 updates price_override; UPDATE is product-scoped (ownership-safe)', async () => {
    setResponses([{ rows: [{ id: 1 }] }, { rowCount: 1 }]);
    const res = await PATCH(reqBody('PATCH', '1', { variant_id: 501, price_override: 42 }), USER, ctx('1')) as Response;
    expect(res.status).toBe(200);
    const updateCall = CALLS.find(c => /UPDATE merchant_product_variants/.test(c.sql));
    expect(updateCall && /product_id = \$/.test(updateCall.sql)).toBe(true);
  });
  it('J2 reorder via sort_order succeeds', async () => {
    setResponses([{ rows: [{ id: 1 }] }, { rowCount: 1 }]);
    const res = await PATCH(reqBody('PATCH', '1', { variant_id: 501, sort_order: 3 }), USER, ctx('1')) as Response;
    expect(res.status).toBe(200);
  });
  it('J3 update of a variant not on this product → 404 (0 rows)', async () => {
    setResponses([{ rows: [{ id: 1 }] }, { rowCount: 0 }]);
    const res = await PATCH(reqBody('PATCH', '1', { variant_id: 999, name: 'Z' }), USER, ctx('1')) as Response;
    expect(res.status).toBe(404);
  });
  it('J4 empty update (no fields) → 400', async () => {
    setResponses([{ rows: [{ id: 1 }] }]);
    const res = await PATCH(reqBody('PATCH', '1', { variant_id: 501 }), USER, ctx('1')) as Response;
    expect(res.status).toBe(400);
  });
  it('J5 status flip to archived via PATCH allowed', async () => {
    setResponses([{ rows: [{ id: 1 }] }, { rowCount: 1 }]);
    const res = await PATCH(reqBody('PATCH', '1', { variant_id: 501, status: 'archived' }), USER, ctx('1')) as Response;
    expect(res.status).toBe(200);
  });
});

describe('Phase 1A · K. Variant CRUD — delete (archive, not destroy)', () => {
  it('K1 DELETE archives rather than hard-deleting', async () => {
    setResponses([{ rows: [{ id: 1 }] }, { rowCount: 1 }]);
    const res = await DELETE(reqBody('DELETE', '1', { variant_id: 501 }), USER, ctx('1')) as Response;
    expect(res.status).toBe(200);
    expect((await res.json()).archived).toBe(true);
    const archiveCall = CALLS.find(c => /merchant_product_variants/.test(c.sql) && /status = 'archived'/.test(c.sql));
    expect(Boolean(archiveCall)).toBe(true);
    const hardDelete = CALLS.find(c => /DELETE FROM merchant_product_variants/.test(c.sql));
    expect(hardDelete).toBeUndefined();
  });
  it('K2 archive of a non-existent variant → 404', async () => {
    setResponses([{ rows: [{ id: 1 }] }, { rowCount: 0 }]);
    const res = await DELETE(reqBody('DELETE', '1', { variant_id: 12345 }), USER, ctx('1')) as Response;
    expect(res.status).toBe(404);
  });
  it('K3 archive on unowned product → 404 (ownership gate first)', async () => {
    setResponses([{ rows: [] }]);
    const res = await DELETE(reqBody('DELETE', '2', { variant_id: 1 }), USER, ctx('2')) as Response;
    expect(res.status).toBe(404);
  });
});

describe('Phase 1A · L. Variant listing', () => {
  it('L1 GET returns variants for an owned product', async () => {
    setResponses([{ rows: [{ id: 1 }] }, { rows: [{ id: 1, name: 'S' }, { id: 2, name: 'L' }] }]);
    const res = await GET(reqGet('1'), USER, ctx('1')) as Response;
    expect(res.status).toBe(200);
    expect((await res.json()).variants).toHaveLength(2);
  });
  it('L2 GET on unowned product → 404', async () => {
    setResponses([{ rows: [] }]);
    const res = await GET(reqGet('999'), USER, ctx('999')) as Response;
    expect(res.status).toBe(404);
  });
  it('L3 GET with a non-numeric product id → 404', async () => {
    setResponses([{ rows: [] }]);
    const res = await GET(reqGet('abc'), USER, ctx('abc')) as Response;
    expect(res.status).toBe(404);
  });
});
