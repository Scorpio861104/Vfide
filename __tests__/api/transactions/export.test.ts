import { NextRequest } from 'next/server';
import { GET } from '@/app/api/transactions/export/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

describe('/api/transactions/export', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should export transactions as CSV', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue(true);

      const mockTransactions = [
        {
          id: 1,
          hash: '0xabc',
          amount: '1.5',
          type: 'transfer',
          status: 'confirmed',
          created_at: new Date().toISOString(),
        },
      ];

      query.mockResolvedValue({ rows: mockTransactions });

      const request = new NextRequest('http://localhost:3000/api/transactions/export?userAddress=0x123');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('should return 401 for unauthorized users', async () => {
      withRateLimit.mockResolvedValue(null);
      const unauthorizedResponse = new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
      requireAuth.mockReturnValue(unauthorizedResponse);

      const request = new NextRequest('http://localhost:3000/api/transactions/export');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });
  });
});
