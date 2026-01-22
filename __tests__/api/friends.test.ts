import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/friends/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

describe('/api/friends', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return user friends list', async () => {
      withRateLimit.mockResolvedValue(null);

      const mockFriends = [
        {
          id: 1,
          user_address: '0x123',
          friend_address: '0x456',
          status: 'accepted',
          created_at: new Date().toISOString(),
        },
      ];

      query.mockResolvedValue({ rows: mockFriends });

      const request = new NextRequest('http://localhost:3000/api/friends?userAddress=0x123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.friends).toHaveLength(1);
    });

    it('should return 400 when userAddress is missing', async () => {
      withRateLimit.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/friends');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });
  });

  describe('POST', () => {
    it('should send friend request successfully', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue(true);

      query.mockResolvedValue({
        rows: [{
          id: 1,
          user_address: '0x123',
          friend_address: '0x456',
          status: 'pending',
        }],
      });

      const request = new NextRequest('http://localhost:3000/api/friends', {
        method: 'POST',
        body: JSON.stringify({
          userAddress: '0x123',
          friendAddress: '0x456',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.friendship).toBeDefined();
    });

    it('should return 401 for unauthorized users', async () => {
      withRateLimit.mockResolvedValue(null);
      const unauthorizedResponse = new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
      requireAuth.mockReturnValue(unauthorizedResponse);

      const request = new NextRequest('http://localhost:3000/api/friends', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });
  });
});
