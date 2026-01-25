import { NextRequest, NextResponse } from 'next/server';
import { GET, POST } from '@/app/api/friends/route';

const mockQuery = jest.fn();
const mockGetClient = jest.fn();

jest.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  getClient: () => mockGetClient(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

jest.mock('@/lib/auth/validation', () => ({
  validateBody: jest.fn(),
  friendRequestSchema: {},
}));

describe('/api/friends', () => {
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');
  const { validateBody } = require('@/lib/auth/validation');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return user friends list', async () => {
      withRateLimit.mockResolvedValue(null);
      // The API requires authentication and checks the user address
      requireAuth.mockReturnValue({
        user: { address: '0x1111111111111111111111111111111111111123' }
      });

      const mockFriends = [
        {
          id: 1,
          user_address: '0x1111111111111111111111111111111111111123',
          friend_address: '0x2222222222222222222222222222222222222456',
          status: 'accepted',
          created_at: new Date().toISOString(),
        },
      ];

      mockQuery.mockResolvedValue({ rows: mockFriends });

      // API uses 'address' param, not 'userAddress' - must match requireAuth address
      const request = new NextRequest('http://localhost:3000/api/friends?address=0x1111111111111111111111111111111111111123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.friends).toHaveLength(1);
    });

    it('should return 400 when address is missing', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({
        user: { address: '0x1111111111111111111111111111111111111123' }
      });

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
      requireAuth.mockReturnValue({
        user: { address: '0x1111111111111111111111111111111111111123' }
      });

      validateBody.mockResolvedValue({
        success: true,
        data: { from: '0x1111111111111111111111111111111111111123', to: '0x2222222222222222222222222222222222222456' }
      });

      // Mock client with all required query calls in sequence
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce(undefined) // BEGIN
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // from user lookup
          .mockResolvedValueOnce({ rows: [{ id: 2 }] }) // to user lookup
          .mockResolvedValueOnce({ rows: [] }) // existing friendship check
          .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1, friend_id: 2, status: 'pending' }] }) // INSERT friendship
          .mockResolvedValueOnce(undefined) // INSERT notification
          .mockResolvedValueOnce(undefined), // COMMIT
        release: jest.fn(),
      };
      mockGetClient.mockResolvedValue(mockClient);

      const request = new NextRequest('http://localhost:3000/api/friends', {
        method: 'POST',
        body: JSON.stringify({
          from: '0x1111111111111111111111111111111111111123',
          to: '0x2222222222222222222222222222222222222456',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.friendship).toBeDefined();
    });

    it('should return 401 for unauthorized users', async () => {
      withRateLimit.mockResolvedValue(null);
      // Must return a NextResponse, not Response, since the code checks `instanceof NextResponse`
      const unauthorizedResponse = NextResponse.json(
        { error: 'Unauthorized' },
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
