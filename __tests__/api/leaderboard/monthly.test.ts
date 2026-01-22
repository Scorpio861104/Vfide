import { NextRequest } from 'next/server';
import { GET } from '@/app/api/leaderboard/monthly/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

describe('/api/leaderboard/monthly', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return monthly leaderboard', async () => {
      withRateLimit.mockResolvedValue(null);

      const mockLeaderboard = [
        {
          wallet_address: '0x123',
          username: 'user1',
          monthly_points: 1000,
          rank: 1,
        },
        {
          wallet_address: '0x456',
          username: 'user2',
          monthly_points: 500,
          rank: 2,
        },
      ];

      query.mockResolvedValue({ rows: mockLeaderboard });

      const request = new NextRequest('http://localhost:3000/api/leaderboard/monthly');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.leaderboard).toHaveLength(2);
      expect(data.leaderboard[0].rank).toBe(1);
    });

    it('should return 429 for rate limit exceeded', async () => {
      const rateLimitResponse = new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429 }
      );
      withRateLimit.mockResolvedValue(rateLimitResponse);

      const request = new NextRequest('http://localhost:3000/api/leaderboard/monthly');
      const response = await GET(request);

      expect(response.status).toBe(429);
    });

    it('should handle empty leaderboard', async () => {
      withRateLimit.mockResolvedValue(null);
      query.mockResolvedValue({ rows: [] });

      const request = new NextRequest('http://localhost:3000/api/leaderboard/monthly');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.leaderboard).toHaveLength(0);
    });

    it('should return 500 for database errors', async () => {
      withRateLimit.mockResolvedValue(null);
      query.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/leaderboard/monthly');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed');
    });

    it('should support pagination', async () => {
      withRateLimit.mockResolvedValue(null);
      query.mockResolvedValue({ rows: [] });

      const request = new NextRequest('http://localhost:3000/api/leaderboard/monthly?limit=10&offset=0');
      await GET(request);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        expect.any(Array)
      );
    });
  });
});
