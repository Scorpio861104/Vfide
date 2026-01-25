import { NextRequest, NextResponse } from 'next/server';
import { GET } from '@/app/api/crypto/transactions/[userId]/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

describe('/api/crypto/transactions/[userId]', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return user transactions', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      const mockTransactions = [
        {
          id: 1,
          user_id: 1,
          hash: '0xabcabcabcabcabcabcabcabcabcabcabcabcabca',
          type: 'transfer',
          amount: '1.5',
          status: 'confirmed',
          created_at: new Date().toISOString(),
        },
      ];

      query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      query.mockResolvedValueOnce({ rows: mockTransactions });

      const request = new NextRequest('http://localhost:3000/api/crypto/transactions/1');
      const response = await GET(request, { params: Promise.resolve({ userId: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.transactions).toHaveLength(1);
    });

    it('should return 429 for rate limit exceeded', async () => {
      const rateLimitResponse = new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429 }
      );
      withRateLimit.mockResolvedValue(rateLimitResponse);

      const request = new NextRequest('http://localhost:3000/api/crypto/transactions/1');
      const response = await GET(request, { params: Promise.resolve({ userId: '1' }) });

      expect(response.status).toBe(429);
    });

    it('should support pagination', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });
      query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      query.mockResolvedValueOnce({ rows: [] });

      const request = new NextRequest('http://localhost:3000/api/crypto/transactions/1?limit=10&offset=0');
      await GET(request, { params: Promise.resolve({ userId: '1' }) });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        expect.any(Array)
      );
    });
  });
});
