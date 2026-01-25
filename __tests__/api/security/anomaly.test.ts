import { NextRequest } from 'next/server';
import { GET } from '@/app/api/security/anomaly/route';

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

jest.mock('@/lib/security/anomalyDetection', () => ({
  getAnomalyStats: jest.fn(),
  recordActivity: jest.fn(),
  getClientIP: jest.fn().mockReturnValue('127.0.0.1'),
  getUserAgent: jest.fn().mockReturnValue('test-agent'),
}));

describe('/api/security/anomaly', () => {
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');
  const { getAnomalyStats, recordActivity } = require('@/lib/security/anomalyDetection');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return anomaly stats for authenticated user', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111123' } });
      getAnomalyStats.mockResolvedValue({ totalEvents: 10, anomalies: 0 });
      recordActivity.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/security/anomaly');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.stats).toBeDefined();
    });

    it('should return 429 for rate limit exceeded', async () => {
      const { NextResponse } = require('next/server');
      const rateLimitResponse = NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
      withRateLimit.mockResolvedValue(rateLimitResponse);

      const request = new NextRequest('http://localhost:3000/api/security/anomaly');
      const response = await GET(request);
      expect(response.status).toBe(429);
    });
  });
});
