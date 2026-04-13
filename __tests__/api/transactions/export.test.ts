import { NextRequest, NextResponse } from 'next/server';
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
    it('should return 400 for malformed JSON', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      const request = new NextRequest('http://localhost:3000/api/transactions/export', {
        method: 'POST',
        body: '{"address":"0x1111111111111111111111111111111111111123"',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON');
    });

    it('should return 400 for non-object body', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      const request = new NextRequest('http://localhost:3000/api/transactions/export', {
        method: 'POST',
        body: JSON.stringify(['invalid']),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid');
    });

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
              start: '2025-01-01T00:00:00.000Z',
              end: '2025-12-31T23:59:59.000Z',
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

    it('should reject date ranges larger than 366 days', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      const request = new NextRequest('http://localhost:3000/api/transactions/export', {
        method: 'POST',
        body: JSON.stringify({
          address: '0x1111111111111111111111111111111111111123',
          options: {
            format: 'csv',
            dateRange: {
              start: '2020-01-01T00:00:00.000Z',
              end: '2026-01-01T00:00:00.000Z',
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
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Date range too large');
    });

    it('should reject reversed date ranges', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      const request = new NextRequest('http://localhost:3000/api/transactions/export', {
        method: 'POST',
        body: JSON.stringify({
          address: '0x1111111111111111111111111111111111111123',
          options: {
            format: 'csv',
            dateRange: {
              start: '2026-01-01T00:00:00.000Z',
              end: '2024-01-01T00:00:00.000Z',
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
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('end date must be on or after start date');
    });

    it('should reject malformed export options with 400 instead of 500', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      const request = new NextRequest('http://localhost:3000/api/transactions/export', {
        method: 'POST',
        body: JSON.stringify({
          address: '0x1111111111111111111111111111111111111123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
    });

    it('should reject oversized filter arrays', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      const request = new NextRequest('http://localhost:3000/api/transactions/export', {
        method: 'POST',
        body: JSON.stringify({
          address: '0x1111111111111111111111111111111111111123',
          options: {
            format: 'csv',
            dateRange: {
              start: '2025-01-01T00:00:00.000Z',
              end: '2025-02-01T00:00:00.000Z',
            },
            filters: {
              types: Array.from({ length: 101 }, (_, index) => `type-${index}`),
              tokens: [],
            },
            includeMetadata: false,
            includeFees: false,
            includeUsdValue: false,
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
    });

    it('should include token filters in export query', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      query.mockResolvedValue({ rows: [] });

      const request = new NextRequest('http://localhost:3000/api/transactions/export', {
        method: 'POST',
        body: JSON.stringify({
          address: '0x1111111111111111111111111111111111111123',
          options: {
            format: 'csv',
            dateRange: {
              start: '2025-01-01T00:00:00.000Z',
              end: '2025-02-01T00:00:00.000Z',
            },
            filters: {
              types: ['send'],
              tokens: ['ETH', 'USDC'],
            },
            includeMetadata: false,
            includeFees: false,
            includeUsdValue: false,
          },
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(query).toHaveBeenCalledTimes(1);
      const [queryText, queryParams] = query.mock.calls[0];
      expect(queryText).toContain('t.type = ANY');
      expect(queryText).toContain('t.token_symbol = ANY');
      expect(queryParams).toContainEqual(['send']);
      expect(queryParams).toContainEqual(['ETH', 'USDC']);
    });
  });
});
