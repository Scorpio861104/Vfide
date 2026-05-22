import { NextRequest } from 'next/server';
import { GET, PUT } from '@/app/api/notifications/preferences/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireOwnership: jest.fn(),
  requireAuth: jest.fn(async () => ({ user: { sub: 'test', address: '0x0000000000000000000000000000000000000000' } })),
  requireAdmin: jest.fn(async () => ({ user: { sub: 'test', address: '0x0000000000000000000000000000000000000000' } })),
  verifyAuth: jest.fn(async () => ({ ok: true, user: { sub: 'test' } })),
  getRequestAuthToken: jest.fn(async () => null),
  optionalAuth: jest.fn(async () => null),
  isAdmin: jest.fn(() => false),
  verifyOnChainAdmin: jest.fn(async () => false),
  checkOwnership: jest.fn(() => true),
  withAuth: jest.fn((handler: any) => async (req: any, ctx?: any) => {
    // V3: consult requireAuth (sync or async) so tests that set its return value flow through.
    const m = (jest.requireMock('@/lib/auth/middleware') as any);
    let user: any = { sub: 'test', address: '0x0000000000000000000000000000000000000000' };
    try {
      const r0 = typeof m.requireAuth === 'function' ? m.requireAuth(req) : null;
      const r = (r0 && typeof (r0 as any).then === 'function') ? await r0 : r0;
      if (r && typeof r.status === 'number' && typeof r.json === 'function') return r;
      if (r && r.user) user = r.user;
    } catch { /* ignore */ }
    return handler(req, user, ctx);
  }),
  withOwnership: jest.fn((extractor: any, handler: any) => async (req: any, ctx?: any) => {
    // V3: extract target address from request and use it as auth user, bubble up
    // requireAuth Response if set.
    const m = (jest.requireMock('@/lib/auth/middleware') as any);
    let user: any = { sub: 'test', address: '0x0000000000000000000000000000000000000000' };
    try {
      const r0 = typeof m.requireAuth === 'function' ? m.requireAuth(req) : null;
      const r = (r0 && typeof (r0 as any).then === 'function') ? await r0 : r0;
      if (r && typeof r.status === 'number' && typeof r.json === 'function') return r;
      if (r && r.user) user = r.user;
      else {
        const target = await extractor(req, ctx);
        if (typeof target === 'string' && target) {
          const addr = target.toLowerCase();
          user = { sub: addr, address: addr };
        }
      }
    } catch { /* ignore */ }
    return handler(req, user, ctx);
  }),
}));

describe('/api/notifications/preferences', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireOwnership } = require('@/lib/auth/middleware');
  const userAddress = '0x1234567890123456789012345678901234567890';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return notification preferences', async () => {
      withRateLimit.mockResolvedValue(null);
      requireOwnership.mockResolvedValue({ user: { address: userAddress } });

      query.mockResolvedValue({
        rows: [{
          user_id: 1,
          email_notifications: true,
          push_notifications: false,
          quest_notifications: true,
        }],
      });

      const request = new NextRequest(`http://localhost:3000/api/notifications/preferences?userAddress=${userAddress}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.preferences).toBeDefined();
      expect(requireOwnership).toHaveBeenCalledWith(request, userAddress);
    });
  });

  describe('PUT', () => {
    it('should return 400 for malformed JSON', async () => {
      withRateLimit.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/notifications/preferences', {
        method: 'PUT',
        body: '{"userAddress":"0x123"',
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON');
    });

    it('should return 400 for non-object body', async () => {
      withRateLimit.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify(['invalid']),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid request body');
    });

    it('should update notification preferences', async () => {
      withRateLimit.mockResolvedValue(null);
      requireOwnership.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      query.mockResolvedValue({
        rows: [{
          user_id: 1,
          email_notifications: false,
        }],
      });

      const request = new NextRequest('http://localhost:3000/api/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify({
          userAddress: '0x1111111111111111111111111111111111111123',
          messages: false,
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.preferences).toBeDefined();
      expect(requireOwnership).toHaveBeenCalledWith(request, '0x1111111111111111111111111111111111111123');
    });
  });
});
