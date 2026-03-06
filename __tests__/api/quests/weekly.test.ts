import { NextRequest } from 'next/server';
import { GET } from '@/app/api/quests/weekly/route';

jest.mock('@/lib/db', () => ({
  getClient: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
  isAdmin: jest.fn(),
}));

describe('/api/quests/weekly', () => {
  const { getClient } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');
  const { isAdmin } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
    requireAuth.mockResolvedValue({ user: { address: '0x123' } });
    isAdmin.mockReturnValue(false);
  });

  describe('GET', () => {
    it('should return weekly quests', async () => {
      withRateLimit.mockResolvedValue(null);

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [{ id: 1 }] })
          .mockResolvedValueOnce({
            rows: [{
              id: 1,
              challenge_key: 'weekly_trading',
              title: 'Weekly Trader',
              description: 'Make 10 trades this week',
              category: 'trading',
              target: 10,
              reward_xp: 200,
              reward_vfide: '50000000000000000000',
              icon: '💹',
              week_start: '2026-01-20',
              week_end: '2026-01-26',
              progress: 5,
              completed: false,
              claimed: false,
            }],
          }),
        release: jest.fn(),
      };
      getClient.mockResolvedValue(mockClient);

      const request = new NextRequest('http://localhost:3000/api/quests/weekly?userAddress=0x123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.challenges).toHaveLength(1);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return 400 when userAddress is missing', async () => {
      withRateLimit.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/quests/weekly');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('should return 403 for cross-user access', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0xabc' } });
      isAdmin.mockReturnValue(false);

      const request = new NextRequest('http://localhost:3000/api/quests/weekly?userAddress=0x123');
      const response = await GET(request);

      expect(response.status).toBe(403);
    });
  });
});
