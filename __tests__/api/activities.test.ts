import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/activities/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
  isAdmin: jest.fn(),
}));

jest.mock('@/lib/auth/validation', () => ({
  validateBody: jest.fn(),
  activitySchema: {},
}));

describe('/api/activities', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');
  const { isAdmin } = require('@/lib/auth/middleware');
  const { validateBody } = require('@/lib/auth/validation');

  beforeEach(() => {
    jest.clearAllMocks();
    isAdmin.mockReturnValue(false);
  });

  describe('GET', () => {
    it('should return user activities', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x123' } });

      const mockActivities = [
        {
          id: 1,
          user_address: '0x1111111111111111111111111111111111111123',
          activity_type: 'transaction',
          description: 'Sent 10 ETH',
          created_at: new Date().toISOString(),
        },
      ];

      query.mockResolvedValue({ rows: mockActivities });

      const request = new NextRequest('http://localhost:3000/api/activities?userAddress=0x123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.activities).toHaveLength(1);
    });

    it('should return 403 for cross-user userAddress query', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0xabc' } });
      isAdmin.mockReturnValue(false);

      const request = new NextRequest('http://localhost:3000/api/activities?userAddress=0x123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('own activities');
    });

    it('should return activities when userAddress is missing (returns all activities)', async () => {
      withRateLimit.mockResolvedValue(null);

      const mockActivities = [{ id: 1, activity_type: 'transaction' }];
      query.mockResolvedValue({ rows: mockActivities });

      const request = new NextRequest('http://localhost:3000/api/activities');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.activities).toBeDefined();
    });

    it('should clamp oversized offset to 10000', async () => {
      withRateLimit.mockResolvedValue(null);
      query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const request = new NextRequest('http://localhost:3000/api/activities?limit=50&offset=999999');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('LIMIT $1 OFFSET $2'),
        [50, 10000]
      );
    });
  });

  describe('POST', () => {
    it('should return 400 for malformed JSON', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      const request = new NextRequest('http://localhost:3000/api/activities', {
        method: 'POST',
        body: '{"userAddress":"0x1111111111111111111111111111111111111123"',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON');
    });

    it('should return 400 for non-object body', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      const request = new NextRequest('http://localhost:3000/api/activities', {
        method: 'POST',
        body: JSON.stringify(['invalid']),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('JSON object');
    });

    it('should create activity successfully', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      // Mock user lookup and insert
      query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })  // user lookup
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            activity_type: 'transaction',
          }],
        });  // insert

      const request = new NextRequest('http://localhost:3000/api/activities', {
        method: 'POST',
        body: JSON.stringify({
          userAddress: '0x1111111111111111111111111111111111111123',
          activityType: 'transaction',
          title: 'Test Activity',
          description: 'Sent 10 ETH',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.activity).toBeDefined();
    });

    it('should return 401 for unauthorized users', async () => {
      withRateLimit.mockResolvedValue(null);
      const { NextResponse } = require('next/server');
      const unauthorizedResponse = NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
      requireAuth.mockResolvedValue(unauthorizedResponse);

      const request = new NextRequest('http://localhost:3000/api/activities', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('should return 403 when creating activity for another user address', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      const request = new NextRequest('http://localhost:3000/api/activities', {
        method: 'POST',
        body: JSON.stringify({
          userAddress: '0x2222222222222222222222222222222222222222',
          activityType: 'transaction',
          title: 'Forged Activity',
          description: 'Should be forbidden',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('own address');
    });

    it('should reject oversized title in POST body', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      const request = new NextRequest('http://localhost:3000/api/activities', {
        method: 'POST',
        body: JSON.stringify({
          userAddress: '0x1111111111111111111111111111111111111123',
          activityType: 'transaction',
          title: 'x'.repeat(201),
          description: 'Test',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('title too long');
      expect(query).not.toHaveBeenCalled();
    });

    it('should reject oversized data payload in POST body', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      const request = new NextRequest('http://localhost:3000/api/activities', {
        method: 'POST',
        body: JSON.stringify({
          userAddress: '0x1111111111111111111111111111111111111123',
          activityType: 'transaction',
          title: 'Bounded Activity',
          data: { payload: 'x'.repeat(11000) },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('data too large');
      expect(query).not.toHaveBeenCalled();
    });
  });
});
