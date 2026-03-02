import { NextRequest } from 'next/server';
import { GET } from '@/app/api/quests/achievements/route';

jest.mock('@/lib/db', () => ({
  getClient: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

describe('/api/quests/achievements', () => {
  const { getClient } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return user achievements', async () => {
      withRateLimit.mockResolvedValue(null);

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // user lookup
          .mockResolvedValueOnce({
            rows: [{
              id: 1,
              milestone_key: 'first_quest',
              title: 'First Quest',
              description: 'Complete your first quest',
              category: 'quests',
              requirement_type: 'quests_completed',
              target: 1,
              reward_xp: 100,
              reward_vfide: '0',
              reward_badge: null,
              icon: '🎯',
              rarity: 'common',
              progress: 1,
              unlocked: true,
              claimed: false,
            }],
          }),
        release: jest.fn(),
      };
      getClient.mockResolvedValue(mockClient);

      const request = new NextRequest('http://localhost:3000/api/quests/achievements?userAddress=0x123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.achievements).toHaveLength(1);
    });

    it('should return 400 when userAddress is missing', async () => {
      withRateLimit.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/quests/achievements');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });
  });
});
