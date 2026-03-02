import { NextRequest } from 'next/server';
import { GET } from '@/app/api/quests/daily/route';

jest.mock('@/lib/db', () => ({
  getClient: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

describe('/api/quests/daily', () => {
  const { getClient } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    const mockUserAddress = '0x1234567890123456789012345678901234567890';

    it('should return daily quests with user progress', async () => {
      withRateLimit.mockResolvedValue(null);

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({
            rows: [{ id: 1 }],
          })
          .mockResolvedValueOnce({
            rows: [
              {
                id: 1,
                quest_key: 'daily_login',
                title: 'Daily Login',
                description: 'Log in today',
                category: 'social',
                difficulty: 'easy',
                target_value: 1,
                reward_xp: 50,
                reward_vfide: 10,
                icon: '🎯',
                progress: 1,
                completed: true,
                claimed: false,
              },
            ],
          }),
        release: jest.fn(),
      };
      getClient.mockResolvedValue(mockClient);

      const request = new NextRequest(`http://localhost:3000/api/quests/daily?userAddress=${mockUserAddress}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.quests).toHaveLength(1);
      expect(data.quests[0]).toMatchObject({
        id: 1,
        questKey: 'daily_login',
        title: 'Daily Login',
        progress: 1,
        completed: true,
        claimed: false,
      });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return 400 when userAddress is missing', async () => {
      withRateLimit.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/quests/daily');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('User address required');
    });

    it('should return 404 when user not found', async () => {
      withRateLimit.mockResolvedValue(null);

      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      };
      getClient.mockResolvedValue(mockClient);

      const request = new NextRequest(`http://localhost:3000/api/quests/daily?userAddress=${mockUserAddress}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return 429 for rate limit exceeded', async () => {
      const rateLimitResponse = new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429 }
      );
      withRateLimit.mockResolvedValue(rateLimitResponse);

      const request = new NextRequest(`http://localhost:3000/api/quests/daily?userAddress=${mockUserAddress}`);
      const response = await GET(request);

      expect(response.status).toBe(429);
    });

    it('should return quests ordered by difficulty', async () => {
      withRateLimit.mockResolvedValue(null);

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [{ id: 1 }] })
          .mockResolvedValueOnce({
            rows: [
              { id: 1, quest_key: 'easy_quest', difficulty: 'easy', title: 'Easy', description: '', category: 'social', target_value: 1, reward_xp: 50, reward_vfide: 10, icon: '', progress: 0, completed: false, claimed: false },
              { id: 2, quest_key: 'medium_quest', difficulty: 'medium', title: 'Medium', description: '', category: 'trading', target_value: 5, reward_xp: 100, reward_vfide: 20, icon: '', progress: 0, completed: false, claimed: false },
              { id: 3, quest_key: 'hard_quest', difficulty: 'hard', title: 'Hard', description: '', category: 'advanced', target_value: 10, reward_xp: 200, reward_vfide: 50, icon: '', progress: 0, completed: false, claimed: false },
            ],
          }),
        release: jest.fn(),
      };
      getClient.mockResolvedValue(mockClient);

      const request = new NextRequest(`http://localhost:3000/api/quests/daily?userAddress=${mockUserAddress}`);
      const response = await GET(request);
      const data = await response.json();

      expect(data.quests).toHaveLength(3);
      expect(data.quests[0].difficulty).toBe('easy');
      expect(data.quests[1].difficulty).toBe('medium');
      expect(data.quests[2].difficulty).toBe('hard');
    });

    it('should show zero progress for unclaimed quests', async () => {
      withRateLimit.mockResolvedValue(null);

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [{ id: 1 }] })
          .mockResolvedValueOnce({
            rows: [
              {
                id: 1,
                quest_key: 'new_quest',
                title: 'New Quest',
                description: '',
                category: 'social',
                difficulty: 'easy',
                target_value: 5,
                reward_xp: 50,
                reward_vfide: 10,
                icon: '',
                progress: 0,
                completed: false,
                claimed: false,
              },
            ],
          }),
        release: jest.fn(),
      };
      getClient.mockResolvedValue(mockClient);

      const request = new NextRequest(`http://localhost:3000/api/quests/daily?userAddress=${mockUserAddress}`);
      const response = await GET(request);
      const data = await response.json();

      expect(data.quests[0].progress).toBe(0);
      expect(data.quests[0].completed).toBe(false);
      expect(data.quests[0].claimed).toBe(false);
    });

    it('should return 500 for database errors', async () => {
      withRateLimit.mockResolvedValue(null);

      const mockClient = {
        query: jest.fn().mockRejectedValue(new Error('Database error')),
        release: jest.fn(),
      };
      getClient.mockResolvedValue(mockClient);

      const request = new NextRequest(`http://localhost:3000/api/quests/daily?userAddress=${mockUserAddress}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch daily quests');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database connection errors', async () => {
      withRateLimit.mockResolvedValue(null);
      getClient.mockRejectedValue(new Error('Connection error'));

      const request = new NextRequest(`http://localhost:3000/api/quests/daily?userAddress=${mockUserAddress}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch daily quests');
    });
  });
});
