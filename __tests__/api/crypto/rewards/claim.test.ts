import { NextRequest } from 'next/server';
import { POST } from '@/app/api/crypto/rewards/[userId]/claim/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

describe('/api/crypto/rewards/[userId]/claim', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should claim rewards successfully', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue(true);

      query.mockResolvedValue({
        rows: [{ id: 1, claimed: true, amount: '100' }],
      });

      const request = new NextRequest('http://localhost:3000/api/crypto/rewards/1/claim', {
        method: 'POST',
        body: JSON.stringify({
          rewardIds: [1, 2],
        }),
      });

      const response = await POST(request, { params: { userId: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 401 for unauthorized users', async () => {
      withRateLimit.mockResolvedValue(null);
      const unauthorizedResponse = new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
      requireAuth.mockReturnValue(unauthorizedResponse);

      const request = new NextRequest('http://localhost:3000/api/crypto/rewards/1/claim', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: { userId: '1' } });
      expect(response.status).toBe(401);
    });
  });
});
