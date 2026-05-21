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
  requireOwnership: jest.fn(async () => ({ user: { sub: 'test', address: '0x0000000000000000000000000000000000000000' } })),
  requireAdmin: jest.fn(async () => ({ user: { sub: 'test', address: '0x0000000000000000000000000000000000000000' } })),
  verifyAuth: jest.fn(async () => ({ ok: true, user: { sub: 'test' } })),
  getRequestAuthToken: jest.fn(async () => null),
  optionalAuth: jest.fn(async () => null),
  isAdmin: jest.fn(() => false),
  verifyOnChainAdmin: jest.fn(async () => false),
  checkOwnership: jest.fn(() => true),
  withAuth: jest.fn((handler: any) => async (req: any, ctx?: any) => {
    // V2: consult requireAuth so tests that set its return value flow through.
    const m = (jest.requireMock('@/lib/auth/middleware') as any);
    let user: any = { sub: 'test', address: '0x0000000000000000000000000000000000000000' };
    try {
      const r = typeof m.requireAuth === 'function' ? m.requireAuth(req) : null;
      if (r && typeof r.status === 'number' && typeof r.json === 'function') return r;
      if (r && r.user) user = r.user;
    } catch { /* ignore */ }
    return handler(req, user, ctx);
  }),
  withOwnership: jest.fn((extractor: any, handler: any) => async (req: any, ctx?: any) => {
    // V2: extract target address from request and use it as auth user, bubble up
    // requireAuth Response if set.
    const m = (jest.requireMock('@/lib/auth/middleware') as any);
    let user: any = { sub: 'test', address: '0x0000000000000000000000000000000000000000' };
    try {
      const r = typeof m.requireAuth === 'function' ? m.requireAuth(req) : null;
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

    it('should return 401 for malformed authenticated address', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: 'bad-address' } });

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

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(query).not.toHaveBeenCalled();
    });

    it('should normalize userAddress before query writes', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: ' 0x1111111111111111111111111111111111111123 ' } });
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

      expect(response.status).toBe(200);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO push_subscriptions'),
        ['0x1111111111111111111111111111111111111123', 'https://example.com/push', JSON.stringify({ p256dh: 'test-key', auth: 'test-auth' })]
      );
    });
  });
});
