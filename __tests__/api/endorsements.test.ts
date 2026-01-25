import { NextRequest, NextResponse } from 'next/server';
import { GET, POST } from '@/app/api/endorsements/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

jest.mock('@/lib/auth/validation', () => ({
  validateBody: jest.fn(),
  endorsementSchema: {},
}));

describe('/api/endorsements', () => {
  const { query, getClient } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');
  const { validateBody } = require('@/lib/auth/validation');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return user endorsements', async () => {
      withRateLimit.mockResolvedValue(null);

      const mockEndorsements = [
        {
          id: 1,
          endorser: '0x1111111111111111111111111111111111111123',
          endorsed: '0x2222222222222222222222222222222222222456',
          skill: 'Trading',
          created_at: new Date().toISOString(),
        },
      ];

      query.mockResolvedValue({ rows: mockEndorsements });

      const request = new NextRequest('http://localhost:3000/api/endorsements?userAddress=0x456');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.endorsements).toHaveLength(1);
    });
  });

  describe('POST', () => {
    it('should create endorsement successfully', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });
      validateBody.mockResolvedValue({
        success: true,
        data: {
          fromAddress: '0x1111111111111111111111111111111111111123',
          toAddress: '0x2222222222222222222222222222222222222456',
          skill: 'Trading',
          message: 'Great trader!',
        },
      });

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // endorser lookup
          .mockResolvedValueOnce({ rows: [{ id: 2 }] }) // endorsed lookup
          .mockResolvedValueOnce({ rows: [] }) // check existing
          .mockResolvedValueOnce({ rows: [{ id: 1, endorser_id: 1, endorsed_id: 2 }] }) // INSERT
          .mockResolvedValueOnce({ rows: [] }) // notification
          .mockResolvedValueOnce({ rows: [] }) // activity
          .mockResolvedValueOnce({ rows: [] }), // COMMIT
        release: jest.fn(),
      };
      getClient.mockResolvedValue(mockClient);

      const request = new NextRequest('http://localhost:3000/api/endorsements', {
        method: 'POST',
        body: JSON.stringify({
          fromAddress: '0x1111111111111111111111111111111111111123',
          toAddress: '0x2222222222222222222222222222222222222456',
          skill: 'Trading',
          message: 'Great trader!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.endorsement).toBeDefined();
    });

    it('should return 401 for unauthorized users', async () => {
      withRateLimit.mockResolvedValue(null);
      const unauthorizedResponse = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      requireAuth.mockReturnValue(unauthorizedResponse);
      
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      getClient.mockResolvedValue(mockClient);

      const request = new NextRequest('http://localhost:3000/api/endorsements', {
        method: 'POST',
        body: JSON.stringify({
          fromAddress: '0x1111111111111111111111111111111111111123',
          toAddress: '0x2222222222222222222222222222222222222456',
          skill: 'Trading',
          message: 'Great trader!',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });
  });
});
