import { NextRequest, NextResponse } from 'next/server';
import { GET, PUT, POST } from '@/app/api/users/[address]/route';

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

describe('/api/users/[address]', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return user by address', async () => {
      withRateLimit.mockResolvedValue(null);

      query.mockResolvedValue({
        rows: [{
          id: 1,
          wallet_address: '0x1111111111111111111111111111111111111123',
          username: 'user1',
          display_name: 'User One',
        }],
      });

      const request = new NextRequest('http://localhost:3000/api/users/0x123');
      const response = await GET(request, { params: Promise.resolve({ address: '0x1111111111111111111111111111111111111123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toBeDefined();
      expect(data.user.wallet_address).toBe('0x1111111111111111111111111111111111111123');
    });

    it('should return 404 when user not found', async () => {
      withRateLimit.mockResolvedValue(null);
      query.mockResolvedValue({ rows: [] });

      const request = new NextRequest('http://localhost:3000/api/users/0x999');
      const response = await GET(request, { params: Promise.resolve({ address: '0x999' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('should return 429 for rate limit exceeded', async () => {
      const rateLimitResponse = new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429 }
      );
      withRateLimit.mockResolvedValue(rateLimitResponse);

      const request = new NextRequest('http://localhost:3000/api/users/0x123');
      const response = await GET(request, { params: Promise.resolve({ address: '0x1111111111111111111111111111111111111123' }) });

      expect(response.status).toBe(429);
    });
  });

  describe('PUT', () => {
    it('should reject malformed authenticated address', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: 'bad-address' } });

      const request = new NextRequest('http://localhost:3000/api/users/0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', {
        method: 'PUT',
        body: JSON.stringify({ bio: 'updated' }),
      });

      const response = await PUT(request, {
        params: Promise.resolve({ address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(query).not.toHaveBeenCalled();
    });

    it('should reject when authenticated user does not own target address', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' } });

      const request = new NextRequest('http://localhost:3000/api/users/0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', {
        method: 'PUT',
        body: JSON.stringify({ bio: 'updated' }),
      });

      const response = await PUT(request, {
        params: Promise.resolve({ address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('only update your own profile');
    });

    it('should reject unauthenticated PUT', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));

      const request = new NextRequest('http://localhost:3000/api/users/0x1111111111111111111111111111111111111123', {
        method: 'PUT',
        body: JSON.stringify({ bio: 'updated' }),
      });

      const response = await PUT(request, {
        params: Promise.resolve({ address: '0x1111111111111111111111111111111111111123' }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('POST avatar', () => {
    it('should reject malformed authenticated address', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: 'bad-address' } });

      const request = new NextRequest('http://localhost:3000/api/users/0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb/avatar', {
        method: 'POST',
      });

      const response = await POST(request, {
        params: Promise.resolve({ address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(query).not.toHaveBeenCalled();
    });

    it('should reject when authenticated user does not own target address', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' } });

      const request = new NextRequest('http://localhost:3000/api/users/0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb/avatar', {
        method: 'POST',
      });

      const response = await POST(request, {
        params: Promise.resolve({ address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('only update your own avatar');
    });
  });
});
