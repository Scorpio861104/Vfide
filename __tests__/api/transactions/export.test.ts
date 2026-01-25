import { NextRequest } from 'next/server';
import { POST } from '@/app/api/transactions/export/route';

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

  describe('POST', () => {
    it('should export transactions as CSV', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      const mockTransactions = [
        {
          id: 1,
          hash: '0xabcabcabcabcabcabcabcabcabcabcabcabcabca',
          amount: '1.5',
          type: 'transfer',
          status: 'confirmed',
          timestamp: new Date().toISOString(),
          from_address: '0x1111111111111111111111111111111111111123',
          to_address: '0x2222222222222222222222222222222222222456',
          token_symbol: 'ETH',
          usd_value: '3000',
          fee: '0.001',
          metadata: null,
        },
      ];

      query.mockResolvedValue({ rows: mockTransactions });

      const request = new NextRequest('http://localhost:3000/api/transactions/export', {
        method: 'POST',
        body: JSON.stringify({
          address: '0x1111111111111111111111111111111111111123',
          options: {
            format: 'csv',
            dateRange: {
              start: new Date('2024-01-01').toISOString(),
              end: new Date().toISOString(),
            },
            filters: {
              types: [],
              tokens: [],
            },
            includeMetadata: true,
            includeFees: true,
            includeUsdValue: true,
          },
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should return 401 for unauthorized users', async () => {
      withRateLimit.mockResolvedValue(null);
      const unauthorizedResponse = NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
      requireAuth.mockReturnValue(unauthorizedResponse);

      const request = new NextRequest('http://localhost:3000/api/transactions/export', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });
  });
});
