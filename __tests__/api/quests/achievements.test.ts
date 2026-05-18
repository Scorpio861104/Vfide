import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/quests/achievements/route';

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

describe('/api/quests/achievements', () => {
  const { getClient } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');
  const { isAdmin } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
    requireAuth.mockResolvedValue({ user: { address: '0x1234567890123456789012345678901234567890' } });
    isAdmin.mockReturnValue(false);
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

      const request = new NextRequest('http://localhost:3000/api/quests/achievements?userAddress=0x1234567890123456789012345678901234567890');
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

    it('should return 403 for cross-user access', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' } });
      isAdmin.mockReturnValue(false);

      const request = new NextRequest('http://localhost:3000/api/quests/achievements?userAddress=0x1234567890123456789012345678901234567890');
      const response = await GET(request);

      expect(response.status).toBe(403);
    });

    it('should return 401 for malformed authenticated address', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: 'bad-address' } });

      const request = new NextRequest('http://localhost:3000/api/quests/achievements?userAddress=0x123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(getClient).not.toHaveBeenCalled();
    });

    it('should return 400 for malformed userAddress query', async () => {
      withRateLimit.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/quests/achievements?userAddress=not-an-address');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid user address format');
      expect(getClient).not.toHaveBeenCalled();
    });
  });

  describe('POST', () => {
    it('should return 400 for malformed JSON', async () => {
      withRateLimit.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/quests/achievements', {
        method: 'POST',
        body: '{"milestoneKey":"first_quest"',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON');
    });

    it('should return 400 for non-object body', async () => {
      withRateLimit.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/quests/achievements', {
        method: 'POST',
        body: JSON.stringify(['invalid']),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid request body');
    });

    it('should return 403 for cross-user updates', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' } });
      isAdmin.mockReturnValue(false);

      const request = new NextRequest('http://localhost:3000/api/quests/achievements', {
        method: 'POST',
        body: JSON.stringify({
          milestoneKey: 'first_quest',
          userAddress: '0x1234567890123456789012345678901234567890',
          progress: 1,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it('should return 401 for malformed authenticated address on POST', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: 'bad-address' } });

      const request = new NextRequest('http://localhost:3000/api/quests/achievements', {
        method: 'POST',
        body: JSON.stringify({ milestoneKey: 'first_quest', userAddress: '0x123', progress: 1 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(getClient).not.toHaveBeenCalled();
    });

    it('should return 400 for malformed userAddress on POST', async () => {
      withRateLimit.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/quests/achievements', {
        method: 'POST',
        body: JSON.stringify({ milestoneKey: 'first_quest', userAddress: 'not-an-address', progress: 1 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
      expect(getClient).not.toHaveBeenCalled();
    });
  });
});
