import { NextRequest, NextResponse } from 'next/server';
import { GET } from '@/app/api/crypto/rewards/[userId]/route';

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

describe('/api/crypto/rewards/[userId]', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return user rewards', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      query
        .mockResolvedValueOnce({ rows: [{ wallet_address: '0x1111111111111111111111111111111111111123' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              user_id: 1,
              amount: '100',
              type: 'quest',
              claimed: false,
            },
          ],
        });

      const request = new NextRequest('http://localhost:3000/api/crypto/rewards/1');
      const response = await GET(request, { params: Promise.resolve({ userId: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.rewards).toHaveLength(1);
    });

    it('should calculate total unclaimed rewards', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      query
        .mockResolvedValueOnce({ rows: [{ wallet_address: '0x1111111111111111111111111111111111111123' }] })
        .mockResolvedValueOnce({
          rows: [
            { id: 1, amount: '100', claimed: false, status: 'pending' },
            { id: 2, amount: '50', claimed: false, status: 'pending' },
          ],
        });

      const request = new NextRequest('http://localhost:3000/api/crypto/rewards/1');
      const response = await GET(request, { params: Promise.resolve({ userId: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totalUnclaimed).toBe('150');
    });

    it('should return 403 when authenticated wallet does not own requested userId', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' } });

      query.mockResolvedValueOnce({ rows: [{ wallet_address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' }] });

      const request = new NextRequest('http://localhost:3000/api/crypto/rewards/1');
      const response = await GET(request, { params: Promise.resolve({ userId: '1' }) });

      expect(response.status).toBe(403);
    });

    it('should return 401 for malformed authenticated address', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: 'bad-address' } });

      const request = new NextRequest('http://localhost:3000/api/crypto/rewards/1');
      const response = await GET(request, { params: Promise.resolve({ userId: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(query).not.toHaveBeenCalled();
    });
  });
});
