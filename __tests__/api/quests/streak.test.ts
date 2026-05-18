import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/quests/streak/route';

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

describe('/api/quests/streak', () => {
  const { getClient } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');
  const { isAdmin } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
    isAdmin.mockReturnValue(false);
  });

  describe('GET', () => {
    it('should return user streak data', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1234567890123456789012345678901234567890', id: 1 } });

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // user lookup
          .mockResolvedValueOnce({
            rows: [{
              streak_type: 'login',
              current_streak: 5,
              longest_streak: 10,
              last_activity_date: new Date().toISOString().split('T')[0],
              total_days: 30,
            }],
          }),
        release: jest.fn(),
      };
      getClient.mockResolvedValue(mockClient);

      const request = new NextRequest('http://localhost:3000/api/quests/streak?userAddress=0x1234567890123456789012345678901234567890');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.streak.currentStreak).toBe(5);
      expect(data.streak.longestStreak).toBe(10);
    });

    it('should return 400 when userAddress is missing', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111123', id: 1 } });

      const request = new NextRequest('http://localhost:3000/api/quests/streak');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('should return 403 for cross-user access', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111111', id: 1 } });
      isAdmin.mockReturnValue(false);

      const request = new NextRequest('http://localhost:3000/api/quests/streak?userAddress=0x2222222222222222222222222222222222222222');
      const response = await GET(request);

      expect(response.status).toBe(403);
    });

    it('should return 401 for malformed authenticated address', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: 'bad-address', id: 1 } });

      const request = new NextRequest('http://localhost:3000/api/quests/streak?userAddress=0x123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(getClient).not.toHaveBeenCalled();
    });

    it('should return 400 for malformed userAddress query', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1234567890123456789012345678901234567890', id: 1 } });

      const request = new NextRequest('http://localhost:3000/api/quests/streak?userAddress=not-an-address');
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
      requireAuth.mockResolvedValue({ user: { address: '0x1234567890123456789012345678901234567890', id: 1 } });

      const request = new NextRequest('http://localhost:3000/api/quests/streak', {
        method: 'POST',
        body: '{"}userAddress":"0x1234567890123456789012345678901234567890"',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON');
    });

    it('should return 400 for non-object body', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1234567890123456789012345678901234567890', id: 1 } });

      const request = new NextRequest('http://localhost:3000/api/quests/streak', {
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
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111111', id: 1 } });
      isAdmin.mockReturnValue(false);

      const request = new NextRequest('http://localhost:3000/api/quests/streak', {
        method: 'POST',
        body: JSON.stringify({
          userAddress: '0x2222222222222222222222222222222222222222',
          streakType: 'login',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should return 401 for malformed authenticated address on POST', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: 'bad-address', id: 1 } });

      const request = new NextRequest('http://localhost:3000/api/quests/streak', {
        method: 'POST',
        body: JSON.stringify({ userAddress: '0x123', streakType: 'login' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(getClient).not.toHaveBeenCalled();
    });

    it('should return 400 for malformed target userAddress on POST', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1234567890123456789012345678901234567890', id: 1 } });

      const request = new NextRequest('http://localhost:3000/api/quests/streak', {
        method: 'POST',
        body: JSON.stringify({ userAddress: 'not-an-address', streakType: 'login' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
      expect(getClient).not.toHaveBeenCalled();
    });
  });
});
