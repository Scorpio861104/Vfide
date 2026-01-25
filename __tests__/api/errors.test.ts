import { NextRequest } from 'next/server';
import { POST } from '@/app/api/errors/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

describe('/api/errors', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should log error successfully', async () => {
      withRateLimit.mockResolvedValue(null);
      query.mockResolvedValue({ rows: [{ id: 1, message: 'Test error' }] });

      const request = new NextRequest('http://localhost:3000/api/errors', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Test error',
          stack: 'Error stack trace',
          metadata: { url: '/test' },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 429 for rate limit exceeded', async () => {
      const rateLimitResponse = new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429 }
      );
      withRateLimit.mockResolvedValue(rateLimitResponse);

      const request = new NextRequest('http://localhost:3000/api/errors', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(429);
    });

    it('should handle missing error data', async () => {
      withRateLimit.mockResolvedValue(null);
      query.mockResolvedValue({ rows: [{ id: 1, message: 'Unknown error' }] });

      const request = new NextRequest('http://localhost:3000/api/errors', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Unknown error',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
