import { NextRequest } from 'next/server';
import { GET } from '@/app/api/leaderboard/monthly/route';

// Mock the database client
const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockClient = {
  query: mockQuery,
  release: mockRelease,
};

jest.mock('@/lib/db', () => ({
  getClient: jest.fn(() => Promise.resolve(mockClient)),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

describe('/api/leaderboard/monthly', () => {
  const { getClient } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return monthly leaderboard with parallel queries', async () => {
      withRateLimit.mockResolvedValue(null);

      const mockPrizePool = {
        total_pool: '1000000000000000000000',
        distributed_amount: '0',
        distribution_complete: false,
        distribution_date: null,
      };

      const mockLeaderboard = [
        {
          user_id: 1,
          wallet_address: '0x1111111111111111111111111111111111111123',
          username: 'user1',
          total_xp_earned: 1000,
          quests_completed: 10,
          challenges_completed: 5,
          current_streak: 3,
          transactions_count: 20,
          social_interactions: 15,
          governance_votes: 5,
          activity_score: 1500,
          final_rank: 1,
          prize_amount: '100000000000000000000',
          prize_claimed: false,
          tier_name: 'Gold',
        },
        {
          user_id: 2,
          wallet_address: '0x2222222222222222222222222222222222222456',
          username: 'user2',
          total_xp_earned: 500,
          quests_completed: 5,
          challenges_completed: 2,
          current_streak: 1,
          transactions_count: 10,
          social_interactions: 8,
          governance_votes: 2,
          activity_score: 800,
          final_rank: 2,
          prize_amount: '50000000000000000000',
          prize_claimed: false,
          tier_name: 'Silver',
        },
      ];

      // Mock parallel query responses
      mockQuery
        .mockResolvedValueOnce({ rows: [mockPrizePool] }) // Prize pool query
        .mockResolvedValueOnce({ rows: mockLeaderboard }); // Leaderboard query

      const request = new NextRequest('http://localhost:3000/api/leaderboard/monthly');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.leaderboard).toHaveLength(2);
      expect(data.leaderboard[0].rank).toBe(1);
      expect(data.leaderboard[0].walletAddress).toBe('0x1111111111111111111111111111111111111123');
      expect(data.prizePool.total).toBe('1000');
      expect(mockRelease).toHaveBeenCalled();
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
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // Prize pool
        .mockResolvedValueOnce({ rows: [] }); // Leaderboard

      const request = new NextRequest('http://localhost:3000/api/leaderboard/monthly');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.leaderboard).toHaveLength(0);
      expect(mockRelease).toHaveBeenCalled();
    });

    it('should return 500 for database errors', async () => {
      withRateLimit.mockResolvedValue(null);
      mockQuery.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/leaderboard/monthly');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed');
      expect(mockRelease).toHaveBeenCalled();
    });

    it('should support limit parameter with cap at 100', async () => {
      withRateLimit.mockResolvedValue(null);
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const request = new NextRequest('http://localhost:3000/api/leaderboard/monthly?limit=10');
      await GET(request);

      // Check that the second query (leaderboard) uses the limit
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('LIMIT'),
        expect.arrayContaining([10])
      );
      expect(mockRelease).toHaveBeenCalled();
    });

    it('should cap limit at 100', async () => {
      withRateLimit.mockResolvedValue(null);
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const request = new NextRequest('http://localhost:3000/api/leaderboard/monthly?limit=200');
      await GET(request);

      // Should be capped at 100
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('LIMIT'),
        expect.arrayContaining([100])
      );
      expect(mockRelease).toHaveBeenCalled();
    });

    it('should default to limit 50', async () => {
      withRateLimit.mockResolvedValue(null);
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const request = new NextRequest('http://localhost:3000/api/leaderboard/monthly');
      await GET(request);

      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('LIMIT'),
        expect.arrayContaining([50])
      );
      expect(mockRelease).toHaveBeenCalled();
    });

    it('should check user in already-fetched results before querying', async () => {
      withRateLimit.mockResolvedValue(null);

      const mockLeaderboard = [
        {
          user_id: 1,
          wallet_address: '0x1111111111111111111111111111111111111123',
          username: 'user1',
          total_xp_earned: 1000,
          quests_completed: 10,
          challenges_completed: 5,
          current_streak: 3,
          transactions_count: 20,
          social_interactions: 15,
          governance_votes: 5,
          activity_score: 1500,
          final_rank: 1,
          prize_amount: '100000000000000000000',
          prize_claimed: false,
          tier_name: 'Gold',
        },
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // Prize pool
        .mockResolvedValueOnce({ rows: mockLeaderboard }); // Leaderboard

      const request = new NextRequest('http://localhost:3000/api/leaderboard/monthly?userAddress=0x123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.userPosition).toBeDefined();
      expect(data.userPosition.rank).toBe(1);
      // Should only have 2 queries (no additional user query needed)
      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockRelease).toHaveBeenCalled();
    });

    it('should query user position when not in top results', async () => {
      withRateLimit.mockResolvedValue(null);

      const mockLeaderboard = [
        {
          user_id: 1,
          wallet_address: '0x1111111111111111111111111111111111111123',
          username: 'user1',
          total_xp_earned: 1000,
          quests_completed: 10,
          challenges_completed: 5,
          current_streak: 3,
          transactions_count: 20,
          social_interactions: 15,
          governance_votes: 5,
          activity_score: 1500,
          final_rank: 1,
          prize_amount: '100000000000000000000',
          prize_claimed: false,
          tier_name: 'Gold',
        },
      ];

      const mockUserPosition = {
        user_id: 2,
        wallet_address: '0x2222222222222222222222222222222222222456',
        total_xp_earned: 100,
        quests_completed: 1,
        challenges_completed: 1,
        current_streak: 1,
        transactions_count: 5,
        social_interactions: 3,
        governance_votes: 1,
        activity_score: 200,
        final_rank: 50,
        prize_amount: '0',
        prize_claimed: false,
        tier_name: null,
        current_rank: '50',
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // Prize pool
        .mockResolvedValueOnce({ rows: mockLeaderboard }) // Leaderboard
        .mockResolvedValueOnce({ rows: [mockUserPosition] }); // User position query

      const request = new NextRequest('http://localhost:3000/api/leaderboard/monthly?userAddress=0x456');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.userPosition).toBeDefined();
      expect(data.userPosition.rank).toBe(50);
      // Should have 3 queries (including user position query)
      expect(mockQuery).toHaveBeenCalledTimes(3);
      expect(mockRelease).toHaveBeenCalled();
    });
  });
});
