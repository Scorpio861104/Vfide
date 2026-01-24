import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/revoke/route';

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

jest.mock('@/lib/auth/cookieAuth', () => ({
  clearAuthCookies: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/tokenRevocation', () => ({
  revokeToken: jest.fn(),
  revokeUserTokens: jest.fn(),
  hashToken: jest.fn().mockResolvedValue('hashed-token'),
}));

jest.mock('@/lib/auth/jwt', () => ({
  extractToken: jest.fn().mockReturnValue('test-token'),
}));

describe('/api/auth/revoke', () => {
  const { requireAuth } = require('@/lib/auth/middleware');
  const { clearAuthCookies } = require('@/lib/auth/cookieAuth');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { revokeToken } = require('@/lib/auth/tokenRevocation');

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
    revokeToken.mockResolvedValue(undefined);
  });

  describe('POST', () => {
    it('should revoke token successfully', async () => {
      requireAuth.mockResolvedValue({ user: { address: '0x123', exp: Math.floor(Date.now() / 1000) + 3600 } });

      const request = new NextRequest('http://localhost:3000/api/auth/revoke', {
        method: 'POST',
        body: JSON.stringify({ reason: 'user_requested' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 401 for unauthorized users', async () => {
      const { NextResponse } = require('next/server');
      const unauthorizedResponse = NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
      requireAuth.mockResolvedValue(unauthorizedResponse);

      const request = new NextRequest('http://localhost:3000/api/auth/revoke', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });
  });
});
