import { NextRequest } from 'next/server';
import { GET } from '@/app/api/stats/protocol/route';

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

describe('/api/stats/protocol GET', () => {
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { query } = require('@/lib/db');

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
  });

  it('returns 503 with degraded flag when database is unavailable', async () => {
    query.mockRejectedValue(Object.assign(new Error('relation does not exist'), { code: '42P01' }));

    const request = new NextRequest('http://localhost:3000/api/stats/protocol');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data).toMatchObject({ error: 'Protocol stats temporarily unavailable', degraded: true });
  });

  it('returns protocol aggregates when database is available', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ count: '10' }] })
      .mockResolvedValueOnce({ rows: [{ count: '3' }] })
      .mockResolvedValueOnce({ rows: [{ count: '25', volume: '12345' }] });

    const request = new NextRequest('http://localhost:3000/api/stats/protocol');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.totalUsers).toBe(10);
    expect(data.totalMerchants).toBe(3);
    expect(data.totalTransactions).toBe(25);
    expect(data.totalVolume).toBe('12345');
  });
});
