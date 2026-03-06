import { NextRequest, NextResponse } from 'next/server';
import { GET } from '@/app/api/crypto/rewards/[userId]/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

describe('/api/crypto/rewards/[userId]', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return user rewards', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      query
        .mockResolvedValueOnce({ rows: [{ wallet_address: '0x1111111111111111111111111111111111111123' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              user_id: 1,
              amount: '100',
              type: 'quest',
              claimed: false,
            },
          ],
        });

      const request = new NextRequest('http://localhost:3000/api/crypto/rewards/1');
      const response = await GET(request, { params: Promise.resolve({ userId: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.rewards).toHaveLength(1);
    });

    it('should calculate total unclaimed rewards', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      query
        .mockResolvedValueOnce({ rows: [{ wallet_address: '0x1111111111111111111111111111111111111123' }] })
        .mockResolvedValueOnce({
          rows: [
            { id: 1, amount: '100', claimed: false, status: 'pending' },
            { id: 2, amount: '50', claimed: false, status: 'pending' },
          ],
        });

      const request = new NextRequest('http://localhost:3000/api/crypto/rewards/1');
      const response = await GET(request, { params: Promise.resolve({ userId: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totalUnclaimed).toBe('150');
    });

    it('should return 403 when authenticated wallet does not own requested userId', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' } });

      query.mockResolvedValueOnce({ rows: [{ wallet_address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' }] });

      const request = new NextRequest('http://localhost:3000/api/crypto/rewards/1');
      const response = await GET(request, { params: Promise.resolve({ userId: '1' }) });

      expect(response.status).toBe(403);
    });
  });
});
