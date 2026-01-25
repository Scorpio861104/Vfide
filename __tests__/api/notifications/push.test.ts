import { NextRequest, NextResponse } from 'next/server';
import { POST } from '@/app/api/notifications/push/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

describe('/api/notifications/push', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should send push notification successfully', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });
      query.mockResolvedValue({ rows: [{ id: 1, endpoint: 'https://example.com/push' }] });

      const request = new NextRequest('http://localhost:3000/api/notifications/push', {
        method: 'POST',
        body: JSON.stringify({
          userAddress: '0x1111111111111111111111111111111111111123',
          subscription: {
            endpoint: 'https://example.com/push',
            keys: {
              p256dh: 'test-key',
              auth: 'test-auth',
            },
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 401 for unauthorized users', async () => {
      withRateLimit.mockResolvedValue(null);
      const unauthorizedResponse = NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
      requireAuth.mockReturnValue(unauthorizedResponse);
      query.mockResolvedValue({ rows: [] });

      const request = new NextRequest('http://localhost:3000/api/notifications/push', {
        method: 'POST',
        body: JSON.stringify({
          userAddress: '0x1111111111111111111111111111111111111123',
          subscription: {
            endpoint: 'https://example.com/push',
            keys: {
              p256dh: 'test-key',
              auth: 'test-auth',
            },
          },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });
  });
});
