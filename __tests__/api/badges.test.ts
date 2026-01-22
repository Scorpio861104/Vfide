import { NextRequest } from 'next/server';
import { GET } from '@/app/api/badges/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

describe('/api/badges', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return user badges', async () => {
      withRateLimit.mockResolvedValue(null);

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

    it('should return 400 when userAddress is missing', async () => {
      withRateLimit.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/badges');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('should return 500 for database errors', async () => {
      withRateLimit.mockResolvedValue(null);
      query.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/badges?userAddress=0x123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed');
    });
  });
});
