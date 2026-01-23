import { NextRequest } from 'next/server';
import { GET } from '@/app/api/quests/achievements/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

describe('/api/quests/achievements', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return user achievements', async () => {
      withRateLimit.mockResolvedValue(null);

      query.mockResolvedValue({
        rows: [{
          id: 1,
          name: 'First Quest',
          description: 'Complete your first quest',
          icon: '🎯',
          earned_at: new Date().toISOString(),
        }],
      });

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
