import { NextRequest } from 'next/server';
import { POST } from '@/app/api/sync/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

jest.mock('@/lib/auth/validation', () => ({
  validateBody: jest.fn(),
  syncSchema: {},
}));

describe('/api/sync', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');
  const { validateBody } = require('@/lib/auth/validation');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should sync user data successfully', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue(true);
      validateBody.mockResolvedValue({
        success: true,
        data: {
          userAddress: '0x123',
          lastSync: Date.now(),
        },
      });

      query.mockResolvedValue({ rows: [{ id: 1, synced_at: new Date() }] });

      const request = new NextRequest('http://localhost:3000/api/sync', {
        method: 'POST',
        body: JSON.stringify({
          userAddress: '0x123',
          lastSync: Date.now(),
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 401 for unauthorized users', async () => {
      withRateLimit.mockResolvedValue(null);
      const unauthorizedResponse = new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
      requireAuth.mockReturnValue(unauthorizedResponse);

      const request = new NextRequest('http://localhost:3000/api/sync', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('should handle sync conflicts', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue(true);
      validateBody.mockResolvedValue({
        success: true,
        data: {
          userAddress: '0x123',
          lastSync: Date.now() - 1000000,
        },
      });

      query.mockResolvedValue({
        rows: [{ id: 1, synced_at: new Date(), conflict: true }],
      });

      const request = new NextRequest('http://localhost:3000/api/sync', {
        method: 'POST',
        body: JSON.stringify({
          userAddress: '0x123',
          lastSync: Date.now() - 1000000,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toBeDefined();
    });
  });
});
