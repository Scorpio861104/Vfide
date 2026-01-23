import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/crypto/payment-requests/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

describe('/api/crypto/payment-requests', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return payment requests', async () => {
      withRateLimit.mockResolvedValue(null);
      
      query.mockResolvedValue({
        rows: [
          {
            id: 1,
            from_address: '0x123',
            to_address: '0x456',
            amount: '1.5',
            status: 'pending',
          },
        ],
      });

      const request = new NextRequest('http://localhost:3000/api/crypto/payment-requests?userAddress=0x123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.requests).toHaveLength(1);
    });
  });

  describe('POST', () => {
    it('should create payment request', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue(true);

      query.mockResolvedValue({
        rows: [{ id: 1, from_address: '0x123', to_address: '0x456' }],
      });

      const request = new NextRequest('http://localhost:3000/api/crypto/payment-requests', {
        method: 'POST',
        body: JSON.stringify({
          fromAddress: '0x123',
          toAddress: '0x456',
          amount: '1.5',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.request).toBeDefined();
    });
  });
});
