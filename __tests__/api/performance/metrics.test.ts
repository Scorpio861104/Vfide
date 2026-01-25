import { NextRequest } from 'next/server';
import { POST } from '@/app/api/performance/metrics/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

describe('/api/performance/metrics', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should accept performance metrics', async () => {
      withRateLimit.mockResolvedValue(null);
      query.mockResolvedValue({ rows: [{ id: 1, metric_name: 'lcp', value: 2500 }] });

      const request = new NextRequest('http://localhost:3000/api/performance/metrics', {
        method: 'POST',
        body: JSON.stringify({
          metricName: 'lcp',
          value: 2500,
          metadata: { url: '/dashboard', fcp: 1200 },
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

      const request = new NextRequest('http://localhost:3000/api/performance/metrics', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(429);
    });
  });
});
