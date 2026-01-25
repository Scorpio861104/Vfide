import { NextRequest, NextResponse } from 'next/server';
import { POST } from '@/app/api/leaderboard/claim-prize/route';

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

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

describe('/api/leaderboard/claim-prize', () => {
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should claim prize successfully', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // user lookup
        .mockResolvedValueOnce({ rows: [{ id: 1, prize_amount: '100000000000000000000', final_rank: 1, tier_name: 'Gold' }] }) // leaderboard lookup
        .mockResolvedValueOnce({ rows: [{ distribution_complete: true }] }) // pool check
        .mockResolvedValueOnce({ rows: [] }) // update leaderboard
        .mockResolvedValueOnce({ rows: [] }) // create reward
        .mockResolvedValueOnce({ rows: [] }) // create notification
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const request = new NextRequest('http://localhost:3000/api/leaderboard/claim-prize', {
        method: 'POST',
        body: JSON.stringify({
          userAddress: '0x1111111111111111111111111111111111111123',
          monthYear: '2024-01',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockRelease).toHaveBeenCalled();
    });

    it('should return 401 for unauthorized users', async () => {
      withRateLimit.mockResolvedValue(null);
      const unauthorizedResponse = NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
      requireAuth.mockReturnValue(unauthorizedResponse);

      const request = new NextRequest('http://localhost:3000/api/leaderboard/claim-prize', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });
  });
});
