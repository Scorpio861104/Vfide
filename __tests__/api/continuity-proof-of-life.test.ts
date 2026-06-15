/**
 * Wave 95 — continuity proof-of-life actions (CID-2 off-chain).
 * Verifies set_proof_of_life / clear_proof_of_life and that GET surfaces the designation.
 */
import { NextRequest } from 'next/server';

const OWNER = '0x1111111111111111111111111111111111111111';
const POL = '0x2222222222222222222222222222222222222222';

const dbState = {
  proofOfLife: null as { address: string; note: string | null } | null,
  hasProfile: true,
};

const queryMock = jest.fn(async (sql: string, params: unknown[]) => {
  const s = sql.replace(/\s+/g, ' ').trim();
  if (s.startsWith('INSERT INTO merchant_proof_of_life')) {
    dbState.proofOfLife = { address: String(params[1]), note: (params[2] as string | null) ?? null };
    return { rows: [] };
  }
  if (s.startsWith('DELETE FROM merchant_proof_of_life')) { dbState.proofOfLife = null; return { rows: [] }; }
  if (s.includes('FROM merchant_proof_of_life')) {
    return { rows: dbState.proofOfLife ? [{ proof_of_life_address: dbState.proofOfLife.address, note: dbState.proofOfLife.note, updated_at: '2026-06-12T00:00:00Z' }] : [] };
  }
  if (s.includes('FROM merchant_succession')) return { rows: [] };
  if (s.includes('FROM merchant_operators')) return { rows: [] };
  if (s.includes('FROM merchant_profiles')) return { rows: [{ display_name: dbState.hasProfile ? 'Test Store' : null }] };
  return { rows: [] };
});

jest.mock('@/lib/auth/rateLimit', () => ({ withRateLimit: jest.fn(async () => null) }));
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));
jest.mock('@/lib/events/serverEmit', () => ({ emitServerEvent: jest.fn(async () => {}) }));
jest.mock('@/lib/auth/middleware', () => ({
  withAuth: (handler: (req: unknown, user: { address: string }) => unknown) => async (req: unknown) =>
    handler(req, { sub: 'test', address: OWNER }),
}));
jest.mock('@/lib/db', () => ({ query: (...a: unknown[]) => queryMock(...(a as [string, unknown[]])) }));

import { GET, POST } from '../../app/api/merchant/continuity/route';

beforeEach(() => { dbState.proofOfLife = null; dbState.hasProfile = true; queryMock.mockClear(); });

const post = (body: unknown) => new NextRequest('http://localhost/api/merchant/continuity', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

describe('continuity proof-of-life (Wave 95 / CID-2)', () => {
  it('sets a proof-of-life address', async () => {
    const res = await POST(post({ action: 'set_proof_of_life', proof_of_life_address: POL }));
    expect(res.status).toBe(200);
    expect(dbState.proofOfLife?.address).toBe(POL);
  });

  it('rejects self as proof-of-life', async () => {
    const res = await POST(post({ action: 'set_proof_of_life', proof_of_life_address: OWNER }));
    expect(res.status).toBe(400);
  });

  it('clears a proof-of-life address', async () => {
    dbState.proofOfLife = { address: POL, note: null };
    const res = await POST(post({ action: 'clear_proof_of_life' }));
    expect(res.status).toBe(200);
    expect(dbState.proofOfLife).toBeNull();
  });

  it('GET surfaces the proof-of-life designation', async () => {
    dbState.proofOfLife = { address: POL, note: 'trusted wallet' };
    const res = await GET(new NextRequest('http://localhost/api/merchant/continuity'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.proofOfLife?.proof_of_life_address).toBe(POL);
  });
});
