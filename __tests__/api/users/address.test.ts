import { NextRequest } from 'next/server';
import { GET } from '@/app/api/users/[address]/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

describe('/api/users/[address]', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return user by address', async () => {
      withRateLimit.mockResolvedValue(null);

      query.mockResolvedValue({
        rows: [{
          id: 1,
          wallet_address: '0x123',
          username: 'user1',
          display_name: 'User One',
        }],
      });

      const request = new NextRequest('http://localhost:3000/api/users/0x123');
      const response = await GET(request, { params: Promise.resolve({ address: '0x123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toBeDefined();
      expect(data.user.wallet_address).toBe('0x123');
    });

    it('should return 404 when user not found', async () => {
      withRateLimit.mockResolvedValue(null);
      query.mockResolvedValue({ rows: [] });

      const request = new NextRequest('http://localhost:3000/api/users/0x999');
      const response = await GET(request, { params: Promise.resolve({ address: '0x999' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('should return 429 for rate limit exceeded', async () => {
      const rateLimitResponse = new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429 }
      );
      withRateLimit.mockResolvedValue(rateLimitResponse);

      const request = new NextRequest('http://localhost:3000/api/users/0x123');
      const response = await GET(request, { params: Promise.resolve({ address: '0x123' }) });

      expect(response.status).toBe(429);
    });
  });
});
