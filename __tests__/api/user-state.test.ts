import { NextRequest, NextResponse } from 'next/server';
import { GET } from '@/app/api/user/state/route';

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  runWithDbUserAddressContext: jest.fn(),
  query: jest.fn(),
}));

describe('/api/user/state GET', () => {
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');
  const { runWithDbUserAddressContext } = require('@/lib/db');

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
    requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111111' } });
  });

  it('returns 503 with degraded flag when database is unavailable', async () => {
    runWithDbUserAddressContext.mockRejectedValue(Object.assign(new Error('password authentication failed'), { code: '28P01' }));

    const request = new NextRequest('http://localhost:3000/api/user/state?address=0x1111111111111111111111111111111111111111');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data).toMatchObject({ error: 'User state temporarily unavailable', degraded: true });
  });

  it('returns aggregated user state when database is available', async () => {
    runWithDbUserAddressContext.mockImplementation(async (_address: string, fn: () => Promise<any>) => {
      return fn();
    });

    const { query } = require('@/lib/db');
    query
      .mockResolvedValueOnce({ rows: [{ proof_score: 7000, badges: ['founder'] }] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ count: '2' }] });

    const request = new NextRequest('http://localhost:3000/api/user/state?address=0x1111111111111111111111111111111111111111');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.proofScore).toBe(7000);
    expect(data.isMerchant).toBe(true);
    expect(data.activeLoanCount).toBe(2);
  });
});
