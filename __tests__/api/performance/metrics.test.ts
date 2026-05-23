import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/performance/metrics/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAdmin: jest.fn(),
  requireAuth: jest.fn(async () => ({ user: { sub: 'test', address: '0x0000000000000000000000000000000000000000' } })),
  requireOwnership: jest.fn(async () => ({ user: { sub: 'test', address: '0x0000000000000000000000000000000000000000' } })),
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

describe('/api/performance/metrics', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAdmin } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should reject invalid (non-positive) limit', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAdmin.mockResolvedValue({ user: { address: '0x1234567890123456789012345678901234567890' } });

      const request = new NextRequest('http://localhost:3000/api/performance/metrics?limit=0');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid limit');
      expect(query).not.toHaveBeenCalled();
    });

    it('should reject oversized metric filter', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAdmin.mockResolvedValue({ user: { address: '0x1234567890123456789012345678901234567890' } });

      const request = new NextRequest(`http://localhost:3000/api/performance/metrics?metric=${'x'.repeat(101)}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid metric filter');
      expect(query).not.toHaveBeenCalled();
    });
  });

  describe('POST', () => {
    it('should accept performance metrics', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAdmin.mockResolvedValue({ user: { address: '0x1234567890123456789012345678901234567890' } });
      query.mockResolvedValue({ rows: [{ id: 1, metric_name: 'lcp', value: 2500 }] });

      const request = new NextRequest('http://localhost:3000/api/performance/metrics', {
        method: 'POST',
        body: JSON.stringify({
          metricName: 'lcp',
          value: 2500,
          metadata: { url: '/dashboard', fcp: 1200 },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 429 for rate limit exceeded', async () => {
      const rateLimitResponse = new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429 }
      );
      withRateLimit.mockResolvedValue(rateLimitResponse);

      const request = new NextRequest('http://localhost:3000/api/performance/metrics', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(429);
    });

    it('should reject invalid metricName with 400', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAdmin.mockResolvedValue({ user: { address: '0x1234567890123456789012345678901234567890' } });

      const request = new NextRequest('http://localhost:3000/api/performance/metrics', {
        method: 'POST',
        body: JSON.stringify({
          metricName: '',
          value: 123,
          metadata: {},
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid request body');
      expect(query).not.toHaveBeenCalled();
    });

    it('should reject non-finite metric values with 400', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAdmin.mockResolvedValue({ user: { address: '0x1234567890123456789012345678901234567890' } });

      const request = new NextRequest('http://localhost:3000/api/performance/metrics', {
        method: 'POST',
        body: JSON.stringify({
          metricName: 'lcp',
          value: 'not-a-number',
          metadata: {},
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid request body');
      expect(query).not.toHaveBeenCalled();
    });

    it('should reject oversized metadata with 400', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAdmin.mockResolvedValue({ user: { address: '0x1234567890123456789012345678901234567890' } });

      const request = new NextRequest('http://localhost:3000/api/performance/metrics', {
        method: 'POST',
        body: JSON.stringify({
          metricName: 'lcp',
          value: 2500,
          metadata: {
            payload: 'x'.repeat(11000),
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Metadata too large');
      expect(query).not.toHaveBeenCalled();
    });

    it('should return 400 for malformed JSON payload', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAdmin.mockResolvedValue({ user: { address: '0x1234567890123456789012345678901234567890' } });

      const request = new NextRequest('http://localhost:3000/api/performance/metrics', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'not-json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON payload');
      expect(query).not.toHaveBeenCalled();
    });
  });
});
