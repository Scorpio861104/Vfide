import { NextRequest, NextResponse } from 'next/server';
import { GET, POST } from '@/app/api/errors/route';

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

describe('/api/errors', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth, requireAdmin } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return errors for admin and cap limit', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAdmin.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111111' } });
      query.mockResolvedValue({ rows: [{ id: 1, message: 'Test' }] });

      const request = new NextRequest('http://localhost:3000/api/errors?limit=10000');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.errors).toHaveLength(1);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        [200]
      );
    });

    it('should reject GET without admin auth', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAdmin.mockResolvedValue(
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      );

      const request = new NextRequest('http://localhost:3000/api/errors');
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it('should reject invalid severity filter', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAdmin.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111111' } });

      const request = new NextRequest('http://localhost:3000/api/errors?severity=debug');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid severity');
      expect(query).not.toHaveBeenCalled();
    });

    it('should reject malformed limit parameter', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAdmin.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111111' } });

      const request = new NextRequest('http://localhost:3000/api/errors?limit=10abc');
      const response = await GET(request);

      expect(response.status).toBe(400);
      expect(query).not.toHaveBeenCalled();
    });
  });

  describe('POST', () => {
    it('should log error successfully', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1234567890123456789012345678901234567890' } });
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
      requireAuth.mockResolvedValue({ user: { address: '0x1234567890123456789012345678901234567890' } });
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

    it('should reject invalid severity in POST body', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1234567890123456789012345678901234567890' } });

      const request = new NextRequest('http://localhost:3000/api/errors', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Test error',
          severity: 'debug',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid severity');
      expect(query).not.toHaveBeenCalled();
    });

    it('should reject oversized metadata in POST body', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1234567890123456789012345678901234567890' } });

      const request = new NextRequest('http://localhost:3000/api/errors', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Test error',
          metadata: { payload: 'x'.repeat(11000) },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('metadata too large');
      expect(query).not.toHaveBeenCalled();
    });

    it('should return 400 for malformed JSON payload', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1234567890123456789012345678901234567890' } });

      const request = new NextRequest('http://localhost:3000/api/errors', {
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

    it('should return 401 when authenticated address is malformed', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: 'invalid-address' } });

      const request = new NextRequest('http://localhost:3000/api/errors', {
        method: 'POST',
        body: JSON.stringify({ message: 'Test error' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
      expect(query).not.toHaveBeenCalled();
    });
  });
});
