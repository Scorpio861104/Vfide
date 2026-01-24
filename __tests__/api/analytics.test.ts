import { NextRequest } from 'next/server';
import { POST } from '@/app/api/analytics/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

describe('/api/analytics', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should track analytics event successfully', async () => {
      withRateLimit.mockResolvedValue(null);
      query.mockResolvedValue({ rows: [{ id: 1, event_type: 'page_view' }] });

      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        body: JSON.stringify({
          eventType: 'page_view',
          eventData: { page: '/dashboard' },
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

      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(429);
    });

    it('should return 400 for invalid request body', async () => {
      withRateLimit.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('eventType');
    });
  });
});
