import { NextRequest } from 'next/server';
import { POST } from '@/app/api/leaderboard/claim-prize/route';

jest.mock('@/lib/auth/middleware', () => ({
  withAuth: jest.fn((handler: Function) => handler),
  requireAuth: jest.fn(async () => ({ user: { sub: 'test', address: '0x0000000000000000000000000000000000000000' } })),
  requireOwnership: jest.fn(async () => ({ user: { sub: 'test', address: '0x0000000000000000000000000000000000000000' } })),
  requireAdmin: jest.fn(async () => ({ user: { sub: 'test', address: '0x0000000000000000000000000000000000000000' } })),
  verifyAuth: jest.fn(async () => ({ ok: true, user: { sub: 'test' } })),
  getRequestAuthToken: jest.fn(async () => null),
  optionalAuth: jest.fn(async () => null),
  isAdmin: jest.fn(() => false),
  verifyOnChainAdmin: jest.fn(async () => false),
  checkOwnership: jest.fn(() => true),
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

describe('/api/leaderboard/claim-prize', () => {
  describe('POST', () => {
    it('should return 403 - monthly competition prizes are not available (Howey compliance)', async () => {
      const request = new NextRequest('http://localhost:3000/api/leaderboard/claim-prize', {
        method: 'POST',
        body: JSON.stringify({
          userAddress: '0x1111111111111111111111111111111111111123',
          monthYear: '2024-01',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('not available');
    });
  });
});
