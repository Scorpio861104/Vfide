import { NextRequest } from 'next/server';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
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

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/validation', () => ({
  validateBody: jest.fn(),
  createGroupWithMembersSchema: {},
}));

describe('/api/groups', () => {
  const { GET, POST } = require('@/app/api/groups/route');
  const { query, getClient } = require('@/lib/db');
  const { requireAuth } = require('@/lib/auth/middleware');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { validateBody } = require('@/lib/auth/validation');

  const authAddress = '0x1234567890123456789012345678901234567890';

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
    requireAuth.mockResolvedValue({ user: { address: authAddress } });
  });

  describe('GET', () => {
    it('returns 400 for invalid limit parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/groups?limit=abc');
      const response = await GET(request);
      expect(response.status).toBe(400);
    });

    it('returns groups for authenticated user', async () => {
      query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              name: 'Core Team',
              description: 'Ops group',
              icon: '👥',
              color: '#00F0FF',
              creator_id: 5,
              member_count: 2,
              created_at: new Date('2026-01-01').toISOString(),
              creator_address: authAddress,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              group_id: 1,
              user_address: authAddress,
              role: 'admin',
              joined_at: new Date('2026-01-01').toISOString(),
            },
          ],
        });

      const request = new NextRequest('http://localhost:3000/api/groups?limit=20&offset=0');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.groups).toHaveLength(1);
      expect(data.groups[0].id).toBe(1);
      expect(data.groups[0].icon).toBe('👥');
      expect(data.groups[0].color).toBe('#00F0FF');
    });
  });

  describe('POST', () => {
    function createMockClient() {
      return {
        query: jest.fn(),
        release: jest.fn(),
      };
    }

    it('returns 400 for invalid body', async () => {
      validateBody.mockResolvedValue({ success: false, error: 'Validation failed', details: [] });

      const request = new NextRequest('http://localhost:3000/api/groups', {
        method: 'POST',
        body: JSON.stringify({ name: '' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('returns 404 when requested members do not exist', async () => {
      validateBody.mockResolvedValue({
        success: true,
        data: {
          name: 'Core Team',
          description: 'Ops',
          memberAddresses: ['0x2222222222222222222222222222222222222222'],
          icon: '👥',
          color: '#00F0FF',
          isPrivate: false,
        },
      });

      const client = createMockClient();
      client.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] });

      getClient.mockResolvedValue(client);

      const request = new NextRequest('http://localhost:3000/api/groups', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Core Team',
          description: 'Ops',
          memberAddresses: ['0x2222222222222222222222222222222222222222'],
          icon: '👥',
          color: '#00F0FF',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('Some members do not exist');
      expect(client.release).toHaveBeenCalled();
    });

    it('creates DB-backed group with members', async () => {
      validateBody.mockResolvedValue({
        success: true,
        data: {
          name: 'Core Team',
          description: 'Ops',
          memberAddresses: ['0x2222222222222222222222222222222222222222'],
          icon: '👥',
          color: '#00F0FF',
          isPrivate: false,
        },
      });

      const client = createMockClient();
      client.query
        .mockResolvedValueOnce({ rows: [{ id: 7 }] })
        .mockResolvedValueOnce({ rows: [{ id: 8, wallet_address: '0x2222222222222222222222222222222222222222' }] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
          rows: [
            {
              id: 99,
              name: 'Core Team',
              description: 'Ops',
              icon: '👥',
              color: '#00F0FF',
              creator_id: 7,
              member_count: 2,
              created_at: new Date('2026-01-01').toISOString(),
              creator_address: authAddress,
            },
          ],
        })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
          rows: [
            {
              group_id: 99,
              user_address: authAddress,
              role: 'admin',
              joined_at: new Date('2026-01-01').toISOString(),
            },
            {
              group_id: 99,
              user_address: '0x2222222222222222222222222222222222222222',
              role: 'member',
              joined_at: new Date('2026-01-01').toISOString(),
            },
          ],
        })
        .mockResolvedValueOnce({});

      getClient.mockResolvedValue(client);

      const request = new NextRequest('http://localhost:3000/api/groups', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Core Team',
          description: 'Ops',
          memberAddresses: ['0x2222222222222222222222222222222222222222'],
          icon: '👥',
          color: '#00F0FF',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.group.id).toBe(99);
      expect(data.group.members).toHaveLength(2);
      expect(data.group.icon).toBe('👥');
      expect(data.group.color).toBe('#00F0FF');
      expect(client.release).toHaveBeenCalled();
    });

    it('rolls back and returns 500 on insert failure', async () => {
      validateBody.mockResolvedValue({
        success: true,
        data: {
          name: 'Core Team',
          description: 'Ops',
          memberAddresses: [],
          icon: '👥',
          color: '#00F0FF',
          isPrivate: false,
        },
      });

      const client = createMockClient();
      client.query
        .mockResolvedValueOnce({ rows: [{ id: 7 }] })
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('insert failed'))
        .mockResolvedValueOnce({});

      getClient.mockResolvedValue(client);

      const request = new NextRequest('http://localhost:3000/api/groups', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Core Team',
          description: 'Ops',
          memberAddresses: [],
          icon: '👥',
          color: '#00F0FF',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
      expect(client.release).toHaveBeenCalled();
    });
  });
});
