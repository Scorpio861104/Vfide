import { NextRequest } from 'next/server';

const RESP: Array<{ rows?: unknown[]; rowCount?: number }> = [];
const CALLS: Array<{ sql: string; params: unknown[] }> = [];
function setResponses(r: Array<{ rows?: unknown[]; rowCount?: number }>) { RESP.length = 0; CALLS.length = 0; RESP.push(...r); }

jest.mock('@/lib/auth/rateLimit', () => ({ withRateLimit: jest.fn(async () => null) }));
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));
jest.mock('@/lib/db', () => ({
  query: jest.fn(async (sql: string, params: unknown[]) => {
    (globalThis as unknown as { __saCALLS: typeof CALLS }).__saCALLS?.push({ sql, params });
    const q = (globalThis as unknown as { __saRESP: typeof RESP }).__saRESP;
    const r = q && q.length ? q.shift()! : { rows: [] };
    return { rows: r.rows ?? [], rowCount: r.rowCount ?? (r.rows?.length ?? 0) };
  }),
}));
(globalThis as unknown as { __saRESP: typeof RESP }).__saRESP = RESP;
(globalThis as unknown as { __saCALLS: typeof CALLS }).__saCALLS = CALLS;

import { POST } from '@/app/api/merchant/staff/route';

const TOKEN = 'staff-token-abcdef123456';
const post = (body: unknown) => POST(new NextRequest('http://localhost/api/merchant/staff', {
  method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' },
}), { address: '0x1234567890123456789012345678901234567890' } as never) as Promise<Response>;

// a cashier staff row (raw permissions JSONB) — note empty perms → normalizeStaffPermissions fills role preset
const cashier = (o: Record<string, unknown> = {}) => ({ id: 's1', role: 'cashier', permissions: {}, active: true, expires_at: null, ...o });
const manager = (o: Record<string, unknown> = {}) => ({ id: 's2', role: 'manager', permissions: {}, active: true, expires_at: null, ...o });

describe('Phase 3 · G. authorize mode — permission gating', () => {
  it('G1 cashier sale within cap → allowed', async () => {
    setResponses([{ rows: [cashier()] }, { rows: [{ total: '0' }] }]); // staff, today's total
    const res = await post({ mode: 'authorize', staffToken: TOKEN, kind: 'sale', amount: 100 });
    expect(res.status).toBe(200);
    expect((await res.json()).allowed).toBe(true);
  });
  it('G2 cashier refund → denied (403)', async () => {
    setResponses([{ rows: [cashier()] }, { rows: [{ total: '0' }] }]);
    const res = await post({ mode: 'authorize', staffToken: TOKEN, kind: 'refund' });
    expect(res.status).toBe(403);
    expect((await res.json()).reason).toBe('NOT_PERMITTED');
  });
  it('G3 cashier product_edit → denied', async () => {
    setResponses([{ rows: [cashier()] }, { rows: [{ total: '0' }] }]);
    const res = await post({ mode: 'authorize', staffToken: TOKEN, kind: 'product_edit' });
    expect(res.status).toBe(403);
  });
  it('G4 manager refund → allowed', async () => {
    setResponses([{ rows: [manager()] }, { rows: [{ total: '0' }] }]);
    const res = await post({ mode: 'authorize', staffToken: TOKEN, kind: 'refund' });
    expect(res.status).toBe(200);
  });
});

describe('Phase 3 · H. authorize mode — limits', () => {
  it('H1 cashier sale over per-tx cap → 403 OVER_MAX_SALE', async () => {
    setResponses([{ rows: [cashier()] }, { rows: [{ total: '0' }] }]);
    const res = await post({ mode: 'authorize', staffToken: TOKEN, kind: 'sale', amount: 500 });
    expect(res.status).toBe(403);
    expect((await res.json()).reason).toBe('OVER_MAX_SALE');
  });
  it('H2 cashier sale breaching daily limit → 403 OVER_DAILY_LIMIT', async () => {
    setResponses([{ rows: [cashier()] }, { rows: [{ total: '1900' }] }]); // +300 = 2200 > 2000
    const res = await post({ mode: 'authorize', staffToken: TOKEN, kind: 'sale', amount: 300 });
    expect(res.status).toBe(403);
    expect((await res.json()).reason).toBe('OVER_DAILY_LIMIT');
  });
  it('H3 today\'s total computed from the activity log', async () => {
    setResponses([{ rows: [cashier()] }, { rows: [{ total: '1500' }] }]);
    const res = await post({ mode: 'authorize', staffToken: TOKEN, kind: 'sale', amount: 100 });
    expect((await res.json()).newDailyTotal).toBe(1600);
    const totalQ = CALLS.find(c => /SUM\(\(details->>'amount'\)/.test(c.sql));
    expect(Boolean(totalQ)).toBe(true);
  });
});

describe('Phase 3 · I. authorize mode — recording + session', () => {
  it('I1 record=true on an allowed sale writes an activity log row', async () => {
    setResponses([{ rows: [cashier()] }, { rows: [{ total: '0' }] }, { rowCount: 1 }]); // staff, total, insert
    const res = await post({ mode: 'authorize', staffToken: TOKEN, kind: 'sale', amount: 100, record: true });
    expect(res.status).toBe(200);
    const ins = CALLS.find(c => /INSERT INTO staff_activity_log/.test(c.sql));
    expect(Boolean(ins)).toBe(true);
  });
  it('I2 unknown token → 404', async () => {
    setResponses([{ rows: [] }]);
    const res = await post({ mode: 'authorize', staffToken: TOKEN, kind: 'sale', amount: 10 });
    expect(res.status).toBe(404);
  });
  it('I3 inactive staff → 403 INACTIVE', async () => {
    setResponses([{ rows: [cashier({ active: false })] }, { rows: [{ total: '0' }] }]);
    const res = await post({ mode: 'authorize', staffToken: TOKEN, kind: 'sale', amount: 10 });
    expect(res.status).toBe(403);
    expect((await res.json()).reason).toBe('INACTIVE');
  });
  it('I4 expired staff → 403 EXPIRED', async () => {
    setResponses([{ rows: [cashier({ expires_at: '2000-01-01T00:00:00Z' })] }, { rows: [{ total: '0' }] }]);
    const res = await post({ mode: 'authorize', staffToken: TOKEN, kind: 'sale', amount: 10 });
    expect(res.status).toBe(403);
    expect((await res.json()).reason).toBe('EXPIRED');
  });
});
