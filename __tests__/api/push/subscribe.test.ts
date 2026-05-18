import { NextRequest, NextResponse } from 'next/server';
import { POST } from '@/app/api/push/subscribe/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

describe('/api/push/subscribe', () => {
  const { query } = require('@/lib/db');
  const { requireAuth } = require('@/lib/auth/middleware');
  const { withRateLimit } = require('@/lib/auth/rateLimit');

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
  });

  it('rejects unauthenticated requests', async () => {
    requireAuth.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    );

    const request = new NextRequest('http://localhost:3000/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        endpoint: 'https://example.com/push',
        keys: { p256dh: 'key', auth: 'auth' },
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    expect(query).not.toHaveBeenCalled();
  });

  it('validates the subscription payload', async () => {
    requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111111' } });

    const request = new NextRequest('http://localhost:3000/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint: 'not-a-url', keys: {} }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });

  it('stores the subscription against the authenticated wallet', async () => {
    requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111111' } });
    query.mockResolvedValue({ rows: [{ endpoint: 'https://example.com/push' }] });

    const request = new NextRequest('http://localhost:3000/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        endpoint: 'https://example.com/push',
        keys: { p256dh: 'key', auth: 'auth' },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO push_subscriptions'),
      ['0x1111111111111111111111111111111111111111', 'https://example.com/push', 'key', 'auth']
    );
  });
});
