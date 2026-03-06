import { NextRequest, NextResponse } from 'next/server';
import { GET, POST } from '@/app/api/security/violations/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

describe('/api/security/violations', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return security violations for admin', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      query.mockResolvedValue({
        rows: [{
          id: 1,
          user_address: '0x1111111111111111111111111111111111111123',
          violation_type: 'rate_limit',
          created_at: new Date().toISOString(),
        }],
      });

      const request = new NextRequest('http://localhost:3000/api/security/violations');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.violations).toHaveLength(1);
    });

    it('should reject without authentication', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue(
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      );

      const request = new NextRequest('http://localhost:3000/api/security/violations');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should reject non-positive limit', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      const request = new NextRequest('http://localhost:3000/api/security/violations?limit=0');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid limit');
    });

    it('should cap limit to max bound', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      query.mockResolvedValue({ rows: [] });

      const request = new NextRequest('http://localhost:3000/api/security/violations?limit=100000');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1'),
        [500]
      );
    });

    it('should reject malformed mixed-format limit', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      const request = new NextRequest('http://localhost:3000/api/security/violations?limit=10abc');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid limit parameter');
      expect(query).not.toHaveBeenCalled();
    });
  });

  describe('POST', () => {
    it('should log security violation', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, violation_type: 'suspicious_activity' }],
        });

      const request = new NextRequest('http://localhost:3000/api/security/violations', {
        method: 'POST',
        body: JSON.stringify({
          violationType: 'suspicious_activity',
          description: 'Multiple failed login attempts',
          severity: 'medium',
          ipAddress: '127.0.0.1',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should reject POST without authentication', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue(
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      );

      const request = new NextRequest('http://localhost:3000/api/security/violations', {
        method: 'POST',
        body: JSON.stringify({
          violationType: 'suspicious_activity',
          description: 'x',
          severity: 'low',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('should reject POST with malformed authenticated address', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: 'bad-address' } });

      const request = new NextRequest('http://localhost:3000/api/security/violations', {
        method: 'POST',
        body: JSON.stringify({
          violationType: 'suspicious_activity',
          description: 'x',
          severity: 'low',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(query).not.toHaveBeenCalled();
    });
  });
});
