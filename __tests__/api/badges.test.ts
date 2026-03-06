import { NextRequest } from 'next/server';
import { DELETE, GET } from '@/app/api/badges/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
  isAdmin: jest.fn(),
  requireAdmin: jest.fn(),
}));

describe('/api/badges', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth, isAdmin, requireAdmin } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return user badges', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x123' } });
      isAdmin.mockReturnValue(false);

      const mockBadges = [
        {
          id: 1,
          name: 'Early Adopter',
          description: 'Joined in first month',
          icon: '🎖️',
          earned_at: new Date().toISOString(),
        },
      ];

      query.mockResolvedValue({ rows: mockBadges });

      const request = new NextRequest('http://localhost:3000/api/badges?userAddress=0x123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.badges).toHaveLength(1);
    });

    it('should reject when requesting another user badges without admin', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0xabc' } });
      isAdmin.mockReturnValue(false);

      const request = new NextRequest('http://localhost:3000/api/badges?userAddress=0x123');
      const response = await GET(request);

      expect(response.status).toBe(403);
    });

    it('should return all badges when userAddress is not provided', async () => {
      withRateLimit.mockResolvedValue(null);

      const mockBadges = [
        {
          id: 1,
          name: 'Early Adopter',
          description: 'Joined in first month',
          icon: '🎖️',
          rarity: 'rare',
        },
      ];

      query.mockResolvedValue({ rows: mockBadges });

      const request = new NextRequest('http://localhost:3000/api/badges');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.badges).toHaveLength(1);
    });

    it('should return 500 for database errors', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x123' } });
      isAdmin.mockReturnValue(false);
      query.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/badges?userAddress=0x123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed');
    });

    it('should return 400 for invalid userAddress format', async () => {
      requireAuth.mockResolvedValue({ user: { address: '0x123' } });
      isAdmin.mockReturnValue(false);

      const request = new NextRequest('http://localhost:3000/api/badges?userAddress=not-an-address');
      const response = await GET(request);

      expect(response.status).toBe(400);
    });

    it('should return 401 when requester address is missing', async () => {
      requireAuth.mockResolvedValue({ user: {} });
      isAdmin.mockReturnValue(false);

      const request = new NextRequest('http://localhost:3000/api/badges?userAddress=0x123');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE', () => {
    it('should return 400 for invalid badgeId format', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAdmin.mockResolvedValue({ user: { address: '0xabc' } });

      const request = new NextRequest('http://localhost:3000/api/badges?userAddress=0x123&badgeId=abc', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid userAddress format in delete', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAdmin.mockResolvedValue({ user: { address: '0xabc' } });

      const request = new NextRequest('http://localhost:3000/api/badges?userAddress=invalid&badgeId=1', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      expect(response.status).toBe(400);
    });
  });
});
