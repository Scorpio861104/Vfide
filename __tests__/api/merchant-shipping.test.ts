import { NextRequest } from 'next/server';

const RESP: Array<{ rows?: unknown[]; rowCount?: number }> = [];
const CALLS: Array<{ sql: string; params: unknown[] }> = [];
function setResponses(r: Array<{ rows?: unknown[]; rowCount?: number }>) { RESP.length = 0; CALLS.length = 0; RESP.push(...r); }

jest.mock('@/lib/auth/rateLimit', () => ({ withRateLimit: jest.fn(async () => null) }));
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));
jest.mock('@/lib/db', () => ({
  query: jest.fn(async (sql: string, params: unknown[]) => {
    (globalThis as unknown as { __sCALLS: typeof CALLS }).__sCALLS?.push({ sql, params });
    const q = (globalThis as unknown as { __sRESP: typeof RESP }).__sRESP;
    const r = q && q.length ? q.shift()! : { rows: [] };
    return { rows: r.rows ?? [], rowCount: r.rowCount ?? (r.rows?.length ?? 0) };
  }),
}));
(globalThis as unknown as { __sRESP: typeof RESP }).__sRESP = RESP;
(globalThis as unknown as { __sCALLS: typeof CALLS }).__sCALLS = CALLS;

import { GET, POST } from '@/app/api/merchant/shipping/route';

const USER = { address: '0x1234567890123456789012345678901234567890' };
const get = (qs: string) => new NextRequest(`http://localhost/api/merchant/shipping${qs}`, { method: 'GET' });
const post = (body: unknown) => new NextRequest('http://localhost/api/merchant/shipping', {
  method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' },
});

describe('Phase 1C · J. Zone CRUD', () => {
  it('J1 add_zone returns a zone id', async () => {
    setResponses([{ rows: [{ id: 11 }] }]);
    const res = await POST(post({ action: 'add_zone', name: 'Domestic', countries: ['us'] }), USER) as Response;
    expect(res.status).toBe(201);
    expect((await res.json()).zone_id).toBe(11);
    // countries uppercased before insert
    const ins = CALLS.find(c => /INSERT INTO merchant_shipping_zones/.test(c.sql));
    expect((ins!.params as unknown[])[2]).toEqual(['US']);
  });
  it('J2 update_zone on unowned zone → 404', async () => {
    setResponses([{ rows: [] }]); // ownsZone false
    const res = await POST(post({ action: 'update_zone', zone_id: 99, name: 'X' }), USER) as Response;
    expect(res.status).toBe(404);
  });
  it('J3 delete_zone owned → cascades (deleted true)', async () => {
    setResponses([{ rows: [{ '?column?': 1 }] }, { rowCount: 1 }]);
    const res = await POST(post({ action: 'delete_zone', zone_id: 11 }), USER) as Response;
    expect(res.status).toBe(200);
    expect((await res.json()).deleted).toBe(true);
  });
  it('J4 update_zone with no fields → 400', async () => {
    setResponses([{ rows: [{ '?column?': 1 }] }]);
    const res = await POST(post({ action: 'update_zone', zone_id: 11 }), USER) as Response;
    expect(res.status).toBe(400);
  });
});

describe('Phase 1C · K. Rate CRUD', () => {
  it('K1 add_rate on owned zone returns rate id', async () => {
    setResponses([{ rows: [{ '?column?': 1 }] }, { rows: [{ id: 21 }] }]); // ownsZone, insert
    const res = await POST(post({ action: 'add_rate', zone_id: 11, name: 'Standard', rate_type: 'weight', base_amount: 3, per_kg: 2 }), USER) as Response;
    expect(res.status).toBe(201);
    expect((await res.json()).rate_id).toBe(21);
  });
  it('K2 add_rate on unowned zone → 404', async () => {
    setResponses([{ rows: [] }]);
    const res = await POST(post({ action: 'add_rate', zone_id: 99, name: 'X', rate_type: 'flat', base_amount: 1 }), USER) as Response;
    expect(res.status).toBe(404);
  });
  it('K3 update_rate owned', async () => {
    setResponses([{ rows: [{ '?column?': 1 }] }, { rowCount: 1 }]);
    const res = await POST(post({ action: 'update_rate', rate_id: 21, base_amount: 9 }), USER) as Response;
    expect(res.status).toBe(200);
  });
  it('K4 delete_rate unowned → 404', async () => {
    setResponses([{ rows: [] }]);
    const res = await POST(post({ action: 'delete_rate', rate_id: 99 }), USER) as Response;
    expect(res.status).toBe(404);
  });
  it('K5 invalid rate_type → 400', async () => {
    setResponses([]);
    const res = await POST(post({ action: 'add_rate', zone_id: 11, name: 'X', rate_type: 'bogus', base_amount: 1 }), USER) as Response;
    expect(res.status).toBe(400);
  });
});

describe('Phase 1C · L. Public quote', () => {
  it('L1 quote returns options + ships_to_destination true', async () => {
    // GET ?action=quote loads zones then rates
    setResponses([
      { rows: [{ id: 1, name: 'Domestic', countries: ['US'], sort_order: 0 }] },
      { rows: [{ id: 1, zone_id: 1, name: 'Standard', rate_type: 'flat', base_amount: 5, per_kg: null, pct: null, free_over: null, min_weight_g: null, max_weight_g: null, active: true }] },
    ]);
    const res = await GET(get('?action=quote&merchant=0x1234567890123456789012345678901234567890&country=US&weight=500&subtotal=50')) as Response;
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.ships_to_destination).toBe(true);
    expect(j.options[0].amount).toBe(5);
  });
  it('L2 quote for uncovered destination → ships_to_destination false, empty options', async () => {
    setResponses([
      { rows: [{ id: 1, name: 'Domestic', countries: ['US'], sort_order: 0 }] },
      { rows: [{ id: 1, zone_id: 1, name: 'Standard', rate_type: 'flat', base_amount: 5, per_kg: null, pct: null, free_over: null, min_weight_g: null, max_weight_g: null, active: true }] },
    ]);
    const res = await GET(get('?action=quote&merchant=0x1234567890123456789012345678901234567890&country=JP&weight=500&subtotal=50')) as Response;
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.ships_to_destination).toBe(false);
    expect(j.options).toEqual([]);
  });
  it('L3 quote without merchant → 400', async () => {
    setResponses([]);
    const res = await GET(get('?action=quote&country=US')) as Response;
    expect(res.status).toBe(400);
  });
});

describe('Phase 1C · M. validation', () => {
  it('M1 unknown action → 400', async () => {
    setResponses([]);
    const res = await POST(post({ action: 'nope' }), USER) as Response;
    expect(res.status).toBe(400);
  });
});
