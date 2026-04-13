import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/analytics/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
  requireAdmin: jest.fn(),
}));

describe('/api/analytics', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth, requireAdmin } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 400 for malformed limit parameter', async () => {
      withRateLimit.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/analytics?limit=10abc');
      const response = await GET(request);

      expect(response.status).toBe(400);
    });

    it('should return 403 when requesting another user analytics', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' } });

      const request = new NextRequest('http://localhost:3000/api/analytics?userId=0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
      const response = await GET(request);

      expect(response.status).toBe(403);
    });
  });

  describe('POST', () => {
    it('should track analytics event successfully', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1234567890123456789012345678901234567890' } });
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
      requireAuth.mockResolvedValue({ user: { address: '0x1234567890123456789012345678901234567890' } });

      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
    });

    it('should reject oversized metrics batch', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1234567890123456789012345678901234567890' } });

      const metrics = Array.from({ length: 201 }, (_, i) => ({
        event: 'performance',
        value: i,
        timestamp: Date.now(),
      }));

      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        body: JSON.stringify({ metrics }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid batch metric payload');
    });

    it('should reject batch with invalid event type', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1234567890123456789012345678901234567890' } });

      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        body: JSON.stringify({
          metrics: [
            { event: 'performance', value: 100, timestamp: Date.now() },
            { event: 'totally_invalid_event', value: 1, timestamp: Date.now() },
          ],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid event type in batch');
    });

    it('should reject malformed request body', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1234567890123456789012345678901234567890' } });

      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        body: JSON.stringify(null),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid request body');
      expect(query).not.toHaveBeenCalled();
    });

    it('should reject oversized single eventData payload', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1234567890123456789012345678901234567890' } });

      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        body: JSON.stringify({
          eventType: 'page_view',
          eventData: {
            payload: 'x'.repeat(11000),
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Event data too large');
      expect(query).not.toHaveBeenCalled();
    });

    it('should reject oversized batch eventData payload', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1234567890123456789012345678901234567890' } });

      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        body: JSON.stringify({
          metrics: [
            {
              event: 'performance',
              value: 100,
              properties: { payload: 'x'.repeat(11000) },
              timestamp: Date.now(),
            },
          ],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Event data too large');
      expect(query).not.toHaveBeenCalled();
    });

    it('should return 400 for malformed JSON payload', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1234567890123456789012345678901234567890' } });

      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'not-json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON payload');
      expect(query).not.toHaveBeenCalled();
    });
  });
});
