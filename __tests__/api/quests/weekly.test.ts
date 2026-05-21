import { NextRequest } from 'next/server';
import { GET } from '@/app/api/quests/weekly/route';

jest.mock('@/lib/db', () => ({
  getClient: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
  isAdmin: jest.fn(),
  requireOwnership: jest.fn(async () => ({ user: { sub: 'test', address: '0x0000000000000000000000000000000000000000' } })),
  requireAdmin: jest.fn(async () => ({ user: { sub: 'test', address: '0x0000000000000000000000000000000000000000' } })),
  verifyAuth: jest.fn(async () => ({ ok: true, user: { sub: 'test' } })),
  getRequestAuthToken: jest.fn(async () => null),
  optionalAuth: jest.fn(async () => null),
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

describe('/api/quests/weekly', () => {
  const { getClient } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');
  const { isAdmin } = require('@/lib/auth/middleware');
  const requesterAddress = '0x1234567890123456789012345678901234567890';
  const otherAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

  beforeEach(() => {
    jest.clearAllMocks();
    requireAuth.mockResolvedValue({ user: { address: requesterAddress } });
    isAdmin.mockReturnValue(false);
  });

  describe('GET', () => {
    it('should return weekly quests', async () => {
      withRateLimit.mockResolvedValue(null);

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [{ id: 1 }] })
          .mockResolvedValueOnce({
            rows: [{
              id: 1,
              challenge_key: 'weekly_trading',
              title: 'Weekly Trader',
              description: 'Make 10 trades this week',
              category: 'trading',
              target: 10,
              reward_xp: 200,
              reward_vfide: '50000000000000000000',
              icon: '💹',
              week_start: '2026-01-20',
              week_end: '2026-01-26',
              progress: 5,
              completed: false,
              claimed: false,
            }],
          }),
        release: jest.fn(),
      };
      getClient.mockResolvedValue(mockClient);

      const request = new NextRequest(`http://localhost:3000/api/quests/weekly?userAddress=${requesterAddress}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.challenges).toHaveLength(1);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return 400 when userAddress is missing', async () => {
      withRateLimit.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/quests/weekly');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('should return 403 for cross-user access', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: otherAddress } });
      isAdmin.mockReturnValue(false);

      const request = new NextRequest(`http://localhost:3000/api/quests/weekly?userAddress=${requesterAddress}`);
      const response = await GET(request);

      expect(response.status).toBe(403);
    });

    it('should return 401 for malformed authenticated address', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: 'bad-address' } });

      const request = new NextRequest(`http://localhost:3000/api/quests/weekly?userAddress=${requesterAddress}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(getClient).not.toHaveBeenCalled();
    });

    it('should return 400 for malformed userAddress query', async () => {
      withRateLimit.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/quests/weekly?userAddress=not-an-address');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid user address format');
      expect(getClient).not.toHaveBeenCalled();
    });
  });
});
