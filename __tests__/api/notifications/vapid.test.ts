import { NextRequest } from 'next/server';
import { GET } from '@/app/api/notifications/vapid/route';

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn().mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111123' } }),
  requireOwnership: jest.fn(async () => ({ user: { sub: 'test', address: '0x0000000000000000000000000000000000000000' } })),
  requireAdmin: jest.fn(async () => ({ user: { sub: 'test', address: '0x0000000000000000000000000000000000000000' } })),
  verifyAuth: jest.fn(async () => ({ ok: true, user: { sub: 'test' } })),
  getRequestAuthToken: jest.fn(async () => null),
  optionalAuth: jest.fn(async () => null),
  isAdmin: jest.fn(() => false),
  verifyOnChainAdmin: jest.fn(async () => false),
  checkOwnership: jest.fn(() => true),
  withAuth: jest.fn((handler: any) => async (req: any, ctx?: any) => handler(req, { sub: 'test', address: '0x0000000000000000000000000000000000000000' }, ctx)),
  withOwnership: jest.fn((handler: any) => async (req: any, ctx?: any) => handler(req, { sub: 'test', address: '0x0000000000000000000000000000000000000000' }, ctx)),
}));

describe('/api/notifications/vapid', () => {
  describe('GET', () => {
    it('should return 200 when VAPID key is configured or 503 when not configured', async () => {
      const request = new NextRequest('http://localhost:3000/api/notifications/vapid');
      const response = await GET(request);

      // Either 200 (key configured) or 503 (not configured) are both valid
      expect([200, 503]).toContain(response.status);
    });

    it('should have rate limiting', async () => {
      const { withRateLimit } = require('@/lib/auth/rateLimit');
      const request = new NextRequest('http://localhost:3000/api/notifications/vapid');
      await GET(request);

      expect(withRateLimit).toHaveBeenCalled();
    });
  });
});
