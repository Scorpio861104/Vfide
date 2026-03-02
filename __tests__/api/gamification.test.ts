import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/gamification/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
  requireAdmin: jest.fn(),
}));

jest.mock('@/lib/auth/validation', () => ({
  validateBody: jest.fn(),
  awardXpSchema: {},
}));

describe('/api/gamification', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth, requireAdmin } = require('@/lib/auth/middleware');
  const { validateBody } = require('@/lib/auth/validation');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    const mockUserAddress = '0x1234567890123456789012345678901234567890';

    it('should return user gamification data', async () => {
      requireAuth.mockResolvedValue({ user: { address: mockUserAddress } });
      query.mockResolvedValue({
        rows: [{
          user_id: 1,
          xp: 500,
          level: 3,
          streak: 5,
          last_active: new Date(),
          achievements: [
            { id: 1, name: 'First Quest', description: 'Complete your first quest', icon: '🎯', earnedAt: new Date() },
          ],
        }],
      });

      const request = new NextRequest(`http://localhost:3000/api/gamification?userAddress=${mockUserAddress}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.xp).toBe(500);
      expect(data.level).toBe(3);
      expect(data.streak).toBe(5);
      expect(data.xpForNextLevel).toBeDefined();
      expect(data.xpProgress).toBeDefined();
    });

    it('should return 400 when userAddress is missing', async () => {
      requireAuth.mockResolvedValue({ user: { address: mockUserAddress } });
      const request = new NextRequest('http://localhost:3000/api/gamification');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('User address is required');
    });

    it('should create default entry for new user', async () => {
      requireAuth.mockResolvedValue({ user: { address: mockUserAddress } });
      query
        .mockResolvedValueOnce({ rows: [] }) // No existing data
        .mockResolvedValueOnce({
          rows: [{
            user_id: 1,
            xp: 0,
            level: 1,
            streak: 0,
            last_active: new Date(),
          }],
        });

      const request = new NextRequest(`http://localhost:3000/api/gamification?userAddress=${mockUserAddress}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.xp).toBe(0);
      expect(data.level).toBe(1);
      expect(data.streak).toBe(0);
    });

    it('should calculate XP progress correctly', async () => {
      requireAuth.mockResolvedValue({ user: { address: mockUserAddress } });
      query.mockResolvedValue({
        rows: [{
          user_id: 1,
          xp: 500,
          level: 3,
          streak: 5,
          last_active: new Date(),
          achievements: [],
        }],
      });

      const request = new NextRequest(`http://localhost:3000/api/gamification?userAddress=${mockUserAddress}`);
      const response = await GET(request);
      const data = await response.json();

      // Level 3: xpForNextLevel = 3^2 * 100 = 900
      // Level 2: xp at start = 2^2 * 100 = 400
      // Progress = 500 - 400 = 100
      expect(data.xpForNextLevel).toBe(900);
      expect(data.xpProgress).toBe(100);
    });

    it('should return 500 for database errors', async () => {
      requireAuth.mockResolvedValue({ user: { address: mockUserAddress } });
      query.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest(`http://localhost:3000/api/gamification?userAddress=${mockUserAddress}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch gamification data');
    });
  });

  describe('POST - Award XP', () => {
    const mockUserAddress = '0x1234567890123456789012345678901234567890';

    it('should award XP to user', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAdmin.mockReturnValue(true);
      validateBody.mockResolvedValue({
        success: true,
        data: {
          userAddress: mockUserAddress,
          xpAmount: 100,
          reason: 'Quest completion',
        },
      });
      query.mockResolvedValue({
        rows: [{
          user_id: 1,
          xp: 600,
          level: 3,
          leveled_up: false,
        }],
      });

      const request = new NextRequest('http://localhost:3000/api/gamification', {
        method: 'POST',
        body: JSON.stringify({
          userAddress: mockUserAddress,
          xpAmount: 100,
          reason: 'Quest completion',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.xpAwarded).toBe(100);
      expect(data.newXP).toBe(600);
      expect(data.leveled_up).toBe(false);
    });

    it('should detect level up', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAdmin.mockReturnValue(true);
      validateBody.mockResolvedValue({
        success: true,
        data: {
          userAddress: mockUserAddress,
          xpAmount: 500,
          reason: 'Major quest completion',
        },
      });
      query.mockResolvedValue({
        rows: [{
          user_id: 1,
          xp: 1000,
          level: 4,
          leveled_up: true,
        }],
      });

      const request = new NextRequest('http://localhost:3000/api/gamification', {
        method: 'POST',
        body: JSON.stringify({
          userAddress: mockUserAddress,
          xpAmount: 500,
          reason: 'Major quest completion',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.leveledUp).toBe(true);
      expect(data.newLevel).toBe(4);
    });

    it('should return 401 for non-admin users', async () => {
      withRateLimit.mockResolvedValue(null);
      const { NextResponse } = require('next/server');
      const unauthorizedResponse = NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
      requireAdmin.mockReturnValue(unauthorizedResponse);

      const request = new NextRequest('http://localhost:3000/api/gamification', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('should return 429 for rate limit exceeded', async () => {
      const { NextResponse } = require('next/server');
      const rateLimitResponse = NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
      withRateLimit.mockResolvedValue(rateLimitResponse);

      const request = new NextRequest('http://localhost:3000/api/gamification', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(429);
    });

    it('should return 400 for invalid request body', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAdmin.mockReturnValue(true);
      validateBody.mockResolvedValue({
        success: false,
        error: 'Invalid request body',
        details: ['xpAmount is required'],
      });

      const request = new NextRequest('http://localhost:3000/api/gamification', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
    });

    it('should return 400 for missing required fields', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAdmin.mockReturnValue(true);
      validateBody.mockResolvedValue({
        success: true,
        data: {
          userAddress: null,
          xpAmount: null,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/gamification', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should return 404 when user not found', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAdmin.mockReturnValue(true);
      validateBody.mockResolvedValue({
        success: true,
        data: {
          userAddress: mockUserAddress,
          xpAmount: 100,
          reason: 'Quest completion',
        },
      });
      query.mockResolvedValue({ rows: [] });

      const request = new NextRequest('http://localhost:3000/api/gamification', {
        method: 'POST',
        body: JSON.stringify({
          userAddress: mockUserAddress,
          xpAmount: 100,
          reason: 'Quest completion',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 500 for database errors', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAdmin.mockReturnValue(true);
      validateBody.mockResolvedValue({
        success: true,
        data: {
          userAddress: mockUserAddress,
          xpAmount: 100,
          reason: 'Quest completion',
        },
      });
      query.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/gamification', {
        method: 'POST',
        body: JSON.stringify({
          userAddress: mockUserAddress,
          xpAmount: 100,
          reason: 'Quest completion',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to award XP');
    });
  });
});
