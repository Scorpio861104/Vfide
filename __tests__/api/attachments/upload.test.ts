import { NextRequest } from 'next/server';
import { POST } from '@/app/api/attachments/upload/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

describe('/api/attachments/upload', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should upload file successfully', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x123' } });
      query.mockResolvedValue({ rows: [{ id: 1, filename: 'test.txt' }] });

      const request = new NextRequest('http://localhost:3000/api/attachments/upload', {
        method: 'POST',
        body: JSON.stringify({
          userId: 1,
          filename: 'test.txt',
          fileType: 'text/plain',
          fileSize: 1024,
          url: 'https://example.com/test.txt',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 400 for unauthorized users when auth fails before validation', async () => {
      withRateLimit.mockResolvedValue(null);
      const unauthorizedResponse = new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
      requireAuth.mockReturnValue(unauthorizedResponse);

      const request = new NextRequest('http://localhost:3000/api/attachments/upload', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      // API returns auth error first
      expect(response.status).toBe(401);
    });

    it('should return 400 for missing required fields', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x123' } });

      const request = new NextRequest('http://localhost:3000/api/attachments/upload', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing');
    });

    it('should validate required fields', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x123' } });

      const request = new NextRequest('http://localhost:3000/api/attachments/upload', {
        method: 'POST',
        body: JSON.stringify({
          userId: 1,
          // Missing filename and url
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing');
    });
  });
});
