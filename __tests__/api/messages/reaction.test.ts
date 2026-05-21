import { NextRequest, NextResponse } from 'next/server';
import { POST } from '@/app/api/messages/reaction/route';

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

describe('/api/messages/reaction', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should return 400 for malformed JSON', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      const request = new NextRequest('http://localhost:3000/api/messages/reaction', {
        method: 'POST',
        body: '{"messageId": "1"',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON');
    });

    it('should add reaction successfully', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      query
        .mockResolvedValueOnce({ rows: [{ id: '1' }] }) // Membership check
        .mockResolvedValueOnce({ rows: [] }) // Check existing reaction
        .mockResolvedValueOnce({ rows: [] }) // Insert reaction
        .mockResolvedValueOnce({
          rows: [{
            reaction_type: 'emoji',
            emoji: '👍',
            image_url: null,
            image_name: null,
            users: [{ address: '0x1111111111111111111111111111111111111123', username: 'test', avatar: null }],
          }],
        }); // Get all reactions

      const request = new NextRequest('http://localhost:3000/api/messages/reaction', {
        method: 'POST',
        body: JSON.stringify({
          messageId: '1',
          conversationId: '1',
          emoji: '👍',
          userAddress: '0x1111111111111111111111111111111111111123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.reactions).toBeDefined();
    });

    it('should return 401 for unauthorized users', async () => {
      withRateLimit.mockResolvedValue(null);
      const unauthorizedResponse = NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
      requireAuth.mockReturnValue(unauthorizedResponse);
      query.mockResolvedValue({ rows: [] });

      const request = new NextRequest('http://localhost:3000/api/messages/reaction', {
        method: 'POST',
        body: JSON.stringify({
          messageId: '1',
          conversationId: '1',
          emoji: '👍',
          userAddress: '0x1111111111111111111111111111111111111123',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('should return 401 for malformed authenticated address', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: 'bad-address' } });

      const request = new NextRequest('http://localhost:3000/api/messages/reaction', {
        method: 'POST',
        body: JSON.stringify({
          messageId: '1',
          conversationId: '1',
          emoji: '👍',
          userAddress: '0x1111111111111111111111111111111111111123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 when user is not part of the message conversation', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      query.mockResolvedValueOnce({ rows: [] }); // Membership check fails

      const request = new NextRequest('http://localhost:3000/api/messages/reaction', {
        method: 'POST',
        body: JSON.stringify({
          messageId: '1',
          conversationId: '1',
          emoji: '👍',
          userAddress: '0x1111111111111111111111111111111111111123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('own conversations');
    });
  });
});
