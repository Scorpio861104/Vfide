import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/security/violations/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAdmin: jest.fn(),
}));

describe('/api/security/violations', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAdmin } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return security violations for admin', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAdmin.mockReturnValue(true);

      query.mockResolvedValue({
        rows: [{
          id: 1,
          user_address: '0x123',
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

    it('should return violations without auth (endpoint is public for logging)', async () => {
      // Note: The actual violations endpoint does not require admin auth for GET
      // It's a public endpoint for viewing violations
      withRateLimit.mockResolvedValue(null);
      query.mockResolvedValue({ rows: [] });

      const request = new NextRequest('http://localhost:3000/api/security/violations');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe('POST', () => {
    it('should log security violation', async () => {
      withRateLimit.mockResolvedValue(null);

      query.mockResolvedValue({
        rows: [{ id: 1, violation_type: 'suspicious_activity' }],
      });

      const request = new NextRequest('http://localhost:3000/api/security/violations', {
        method: 'POST',
        body: JSON.stringify({
          userAddress: '0x123',
          violationType: 'suspicious_activity',
          details: 'Multiple failed login attempts',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
