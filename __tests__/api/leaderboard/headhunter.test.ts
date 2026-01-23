import { NextRequest } from 'next/server';
import { GET } from '@/app/api/leaderboard/headhunter/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

describe('/api/leaderboard/headhunter', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return headhunter leaderboard', async () => {
      withRateLimit.mockResolvedValue(null);

      query.mockResolvedValue({
        rows: [
          { wallet_address: '0x123', username: 'user1', referrals: 10, rank: 1 },
        ],
      });

      const request = new NextRequest('http://localhost:3000/api/leaderboard/headhunter');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.leaderboard).toHaveLength(1);
    });
  });
});
