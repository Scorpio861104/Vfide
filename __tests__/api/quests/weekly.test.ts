import { NextRequest } from 'next/server';
import { GET } from '@/app/api/quests/weekly/route';

jest.mock('@/lib/db', () => ({
  getClient: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

describe('/api/quests/weekly', () => {
  const { getClient } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');

  beforeEach(() => {
    jest.clearAllMocks();
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
              quest_key: 'weekly_trading',
              title: 'Weekly Trader',
              description: 'Make 10 trades this week',
              difficulty: 'medium',
              target_value: 10,
              reward_xp: 200,
              reward_vfide: 50,
              progress: 5,
              completed: false,
            }],
          }),
        release: jest.fn(),
      };
      getClient.mockResolvedValue(mockClient);

      const request = new NextRequest('http://localhost:3000/api/quests/weekly?userAddress=0x123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.quests).toHaveLength(1);
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
  });
});
