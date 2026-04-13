import { NextRequest } from 'next/server';
import { DELETE, GET, PATCH, POST } from '@/app/api/notifications/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
  isAdmin: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/validation', () => ({
  validateBody: jest.fn(),
  notificationSchema: {},
}));

describe('/api/notifications', () => {
  const { query, getClient } = require('@/lib/db');
  const { requireAuth } = require('@/lib/auth/middleware');
  const { isAdmin } = require('@/lib/auth/middleware');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { validateBody } = require('@/lib/auth/validation');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    const mockUserAddress = '0x1234567890123456789012345678901234567890';

    it('should return user notifications', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: mockUserAddress } });

      const mockNotifications = [
        {
          id: 1,
          user_id: 1,
          type: 'quest_completed',
          title: 'Quest Completed',
          message: 'You completed a quest!',
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ];

      query.mockResolvedValue({ rows: mockNotifications });

      const request = new NextRequest(`http://localhost:3000/api/notifications?userAddress=${mockUserAddress}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.notifications).toHaveLength(1);
    });

    it('should return 401 for unauthorized users', async () => {
      withRateLimit.mockResolvedValue(null);
      const { NextResponse } = require('next/server');
      const unauthorizedResponse = NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
      requireAuth.mockReturnValue(unauthorizedResponse);

      const request = new NextRequest('http://localhost:3000/api/notifications?userAddress=0x123');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should return 400 when userAddress is missing', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: mockUserAddress } });

      const request = new NextRequest('http://localhost:3000/api/notifications');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('should return 400 for malformed limit parameter', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: mockUserAddress } });

      const request = new NextRequest(
        `http://localhost:3000/api/notifications?userAddress=${mockUserAddress}&limit=10abc&offset=0`
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid unreadOnly parameter', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: mockUserAddress } });

      const request = new NextRequest(
        `http://localhost:3000/api/notifications?userAddress=${mockUserAddress}&unreadOnly=1`
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
    });

    it('should filter unread notifications', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: mockUserAddress } });
      query.mockResolvedValue({ rows: [] });

      const request = new NextRequest(
        `http://localhost:3000/api/notifications?userAddress=${mockUserAddress}&unreadOnly=true`
      );
      await GET(request);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('is_read = false'),
        expect.any(Array)
      );
    });

    it('should clamp oversized limit values', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: mockUserAddress } });
      query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const request = new NextRequest(
        `http://localhost:3000/api/notifications?userAddress=${mockUserAddress}&limit=9999&offset=0`
      );

      const response = await GET(request);
      expect(response.status).toBe(200);
      expect(query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('LIMIT $3 OFFSET $4'),
        [mockUserAddress.toLowerCase(), false, 200, 0]
      );
    });

    it('should clamp oversized offset values', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: mockUserAddress } });
      query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const request = new NextRequest(
        `http://localhost:3000/api/notifications?userAddress=${mockUserAddress}&limit=50&offset=999999`
      );

      const response = await GET(request);
      expect(response.status).toBe(200);
      expect(query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('LIMIT $3 OFFSET $4'),
        [mockUserAddress.toLowerCase(), false, 50, 10000]
      );
    });

    it('should return 500 for database errors', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: mockUserAddress } });
      query.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest(`http://localhost:3000/api/notifications?userAddress=${mockUserAddress}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  describe('POST', () => {
    const mockUserAddress = '0x1234567890123456789012345678901234567890';

    it('should return 400 for malformed JSON', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: mockUserAddress } });

      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'POST',
        body: '{"userAddress":"0x123"',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON');
    });

    it('should create a notification', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: mockUserAddress } });
      isAdmin.mockReturnValue(false);

      query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })  // user lookup
        .mockResolvedValueOnce({ rows: [{ id: 1, title: 'Test' }] });  // insert

      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'POST',
        body: JSON.stringify({
          userAddress: mockUserAddress,
          type: 'system',
          title: 'Test',
          message: 'Test notification',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.notification).toBeDefined();
    });

    it('should reject creating notifications for another user', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: mockUserAddress } });
      isAdmin.mockReturnValue(false);

      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'POST',
        body: JSON.stringify({
          userAddress: '0x0000000000000000000000000000000000000001',
          type: 'system',
          title: 'Injected',
          message: 'Should not be allowed',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it('should return 429 for rate limit exceeded', async () => {
      const { NextResponse } = require('next/server');
      const rateLimitResponse = NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
      withRateLimit.mockResolvedValue(rateLimitResponse);

      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(429);
    });

    it('should return 401 for unauthorized users', async () => {
      withRateLimit.mockResolvedValue(null);
      const { NextResponse } = require('next/server');
      const unauthorizedResponse = NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
      requireAuth.mockReturnValue(unauthorizedResponse);

      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid request body', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid request body');
    });

    it('should return 400 for invalid userAddress format in POST', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: mockUserAddress } });

      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'POST',
        body: JSON.stringify({
          userAddress: 'invalid-address',
          type: 'system',
          title: 'Test',
          message: 'Test notification',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('PATCH/DELETE', () => {
    const mockUserAddress = '0x1234567890123456789012345678901234567890';

    it('should return 400 for malformed JSON on PATCH', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: mockUserAddress } });

      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'PATCH',
        body: '{"notificationIds":[1,2]'
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON');
    });

    it('should return 400 for non-object body on PATCH', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: mockUserAddress } });

      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'PATCH',
        body: JSON.stringify(['invalid']),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid request body');
    });

    it('should return 400 for malformed JSON on DELETE', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: mockUserAddress } });

      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'DELETE',
        body: '{"notificationIds":[1,2]'
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON');
    });

    it('should reject oversized notificationIds on PATCH', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: mockUserAddress } });

      const notificationIds = Array.from({ length: 501 }, (_, index) => index + 1);
      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'PATCH',
        body: JSON.stringify({ notificationIds }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid request body');
    });

    it('should reject oversized notificationIds on DELETE', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: mockUserAddress } });

      const notificationIds = Array.from({ length: 501 }, (_, index) => index + 1);
      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'DELETE',
        body: JSON.stringify({ notificationIds }),
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid request body');
    });

    it('should reject non-integer notificationIds on PATCH', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: mockUserAddress } });

      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'PATCH',
        body: JSON.stringify({ notificationIds: ['abc'] }),
      });

      const response = await PATCH(request);
      expect(response.status).toBe(400);
    });

    it('should reject non-boolean deleteAll on DELETE', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: mockUserAddress } });

      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'DELETE',
        body: JSON.stringify({ deleteAll: 'yes', userAddress: mockUserAddress }),
      });

      const response = await DELETE(request);
      expect(response.status).toBe(400);
    });
  });
});
