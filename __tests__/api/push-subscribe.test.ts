import { NextRequest } from 'next/server';
import { POST } from '@/app/api/push/subscribe/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

describe('/api/push/subscribe POST', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
    requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111111' } });
  });

  it('returns 503 when persistence layer is unavailable', async () => {
    query.mockRejectedValue(Object.assign(new Error('relation does not exist'), { code: '42P01' }));

    const request = new NextRequest('http://localhost:3000/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        endpoint: 'https://example.com/push/endpoint',
        keys: { p256dh: 'abc', auth: 'def' },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toContain('temporarily unavailable');
  });

  it('returns success when subscription is persisted', async () => {
    query.mockResolvedValue({ rowCount: 1, rows: [] });

    const request = new NextRequest('http://localhost:3000/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        endpoint: 'https://example.com/push/endpoint',
        keys: { p256dh: 'abc', auth: 'def' },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(query).toHaveBeenCalledTimes(1);
  });
});
