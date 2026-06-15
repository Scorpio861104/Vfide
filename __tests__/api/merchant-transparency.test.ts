/**
 * API-handler test for the PUBLIC merchant transparency endpoint (Wave 76 Priority 1).
 * Proves a customer-facing caller (no auth) gets the grandmother-test answer with a mocked DB.
 */

import { NextRequest } from 'next/server';

const MERCHANT = '0x2222222222222222222222222222222222222222';

jest.mock('@/lib/auth/rateLimit', () => ({ withRateLimit: jest.fn(async () => null) }));
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() } }));

jest.mock('@/lib/db', () => ({
  query: jest.fn(async (sql: string) => {
    const s = sql.replace(/\s+/g, ' ');
    if (s.includes('FROM merchant_profiles')) return { rows: [{ display_name: 'Test Store', verified_at: '2025-01-01T00:00:00Z', created_at: '2024-01-01T00:00:00Z' }] };
    if (s.includes('FROM shipments')) return { rows: [{ status: 'delivered_confirmed', n: '10' }] };
    if (s.includes('FROM disputes')) return { rows: [{ total: '1', upheld: '0', refunded: '1' }] };
    if (s.includes('merchant_succession')) return { rows: [{ c: '1' }] };
    if (s.includes('merchant_operators')) return { rows: [{ c: '1' }] };
    return { rows: [] };
  }),
}));

import { GET } from '@/app/api/merchant/[address]/transparency/route';

function req(): NextRequest {
  return new NextRequest(`http://localhost/api/merchant/${MERCHANT}/transparency`, { method: 'GET' });
}

describe('Public merchant transparency endpoint (Wave 76)', () => {
  it('returns the grandmother-test panel for a public caller', async () => {
    const res = await GET(req(), { params: Promise.resolve({ address: MERCHANT }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.displayName).toBe('Test Store');
    expect(json.verified).toBe(true); // verified_at set
    expect(typeof json.plainSummary).toBe('string');
    expect(json.plainSummary.length).toBeGreaterThan(0);
    expect(Array.isArray(json.protections)).toBe(true);
    expect(json.disputeSummary).toBeTruthy();
  });

  it('rejects a malformed address', async () => {
    const res = await GET(req(), { params: Promise.resolve({ address: 'not-an-address' }) });
    expect(res.status).toBe(400);
  });
});
