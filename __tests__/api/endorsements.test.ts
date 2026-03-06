import { NextRequest, NextResponse } from 'next/server';
import { DELETE, GET, POST } from '@/app/api/endorsements/route';

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
  endorsementSchema: {
    safeParse: jest.fn(),
  },
}));

describe('/api/endorsements', () => {
  const { query, getClient } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');
  const { endorsementSchema } = require('@/lib/auth/validation');

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

    it('should clamp oversized limit values', async () => {
      withRateLimit.mockResolvedValue(null);
      query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const request = new NextRequest('http://localhost:3000/api/endorsements?endorsedAddress=0x456&limit=10000&offset=0');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('LIMIT $2 OFFSET $3'),
        ['0x456', 200, 0]
      );
    });

    it('should clamp oversized offset values', async () => {
      withRateLimit.mockResolvedValue(null);
      query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const request = new NextRequest('http://localhost:3000/api/endorsements?endorsedAddress=0x456&limit=50&offset=999999');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('LIMIT $2 OFFSET $3'),
        ['0x456', 50, 10000]
      );
    });

    it('should return 400 for malformed numeric pagination params', async () => {
      withRateLimit.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/endorsements?limit=10abc&offset=0');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid limit or offset parameter');
      expect(query).not.toHaveBeenCalled();
    });
  });

  describe('POST', () => {
    it('should return 400 for malformed JSON', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      const request = new NextRequest('http://localhost:3000/api/endorsements', {
        method: 'POST',
        body: '{"fromAddress":"0x1111111111111111111111111111111111111123"',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON');
    });

    it('should return 400 for non-object body', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      const request = new NextRequest('http://localhost:3000/api/endorsements', {
        method: 'POST',
        body: JSON.stringify(['invalid']),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('JSON object');
    });

    it('should create endorsement successfully', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });
      endorsementSchema.safeParse.mockReturnValue({
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

    it('should return 401 for malformed authenticated address shape', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: 'bad-address' } });

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

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(endorsementSchema.safeParse).not.toHaveBeenCalled();
      expect(getClient).not.toHaveBeenCalled();
    });
  });

  describe('DELETE', () => {
    it('should return 401 for malformed authenticated address', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: 'bad-address' } });

      const request = new NextRequest('http://localhost:3000/api/endorsements?endorsementId=1', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(query).not.toHaveBeenCalled();
    });
  });
});
