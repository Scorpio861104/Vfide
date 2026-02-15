import { NextRequest, NextResponse } from 'next/server';
import { GET, PUT } from '@/app/api/crypto/payment-requests/[id]/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

describe('/api/crypto/payment-requests/[id]', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return payment request by id', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      query.mockResolvedValue({
        rows: [{
          id: 1,
          from_address: '0x1111111111111111111111111111111111111123',
          to_address: '0x2222222222222222222222222222222222222456',
          amount: '1.5',
          status: 'pending',
        }],
      });

      const request = new NextRequest('http://localhost:3000/api/crypto/payment-requests/1');
      const response = await GET(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.request).toBeDefined();
    });

    it('should return 404 when payment request not found', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });
      query.mockResolvedValue({ rows: [] });

      const request = new NextRequest('http://localhost:3000/api/crypto/payment-requests/999');
      const response = await GET(request, { params: Promise.resolve({ id: '999' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });
  });

  describe('PUT', () => {
    it('should update payment request status', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            from_address: '0x1111111111111111111111111111111111111123',
            to_address: '0x2222222222222222222222222222222222222456',
            status: 'pending',
          }],
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            status: 'accepted',
          }],
        });

      const request = new NextRequest('http://localhost:3000/api/crypto/payment-requests/1', {
        method: 'PUT',
        body: JSON.stringify({
          status: 'accepted',
        }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.request).toBeDefined();
    });

    it('should return 401 for unauthorized users', async () => {
      withRateLimit.mockResolvedValue(null);
      const unauthorizedResponse = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      requireAuth.mockReturnValue(unauthorizedResponse);

      const request = new NextRequest('http://localhost:3000/api/crypto/payment-requests/1', {
        method: 'PUT',
        body: JSON.stringify({}),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '1' }) });
      expect(response.status).toBe(401);
    });
  });
});
