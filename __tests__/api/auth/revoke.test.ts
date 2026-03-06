import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/revoke/route';

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
  getRequestAuthToken: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/tokenRevocation', () => ({
  revokeToken: jest.fn(),
  revokeUserTokens: jest.fn(),
  hashToken: jest.fn().mockResolvedValue('hashed-token'),
}));

describe('/api/auth/revoke', () => {
  const { requireAuth, getRequestAuthToken } = require('@/lib/auth/middleware');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { revokeToken, hashToken } = require('@/lib/auth/tokenRevocation');

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
    revokeToken.mockResolvedValue(undefined);
    getRequestAuthToken.mockResolvedValue('test-token');
  });

  describe('POST', () => {
    it('should revoke token successfully', async () => {
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111123', exp: Math.floor(Date.now() / 1000) + 3600 } });

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

    it('should return 400 for malformed JSON payload', async () => {
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111123', exp: Math.floor(Date.now() / 1000) + 3600 } });

      const request = new NextRequest('http://localhost:3000/api/auth/revoke', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'not-json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON payload');
      expect(revokeToken).not.toHaveBeenCalled();
    });

    it('should reject invalid revokeAll type with 400', async () => {
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111123', exp: Math.floor(Date.now() / 1000) + 3600 } });

      const request = new NextRequest('http://localhost:3000/api/auth/revoke', {
        method: 'POST',
        body: JSON.stringify({ revokeAll: 'yes' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid revokeAll flag');
      expect(revokeToken).not.toHaveBeenCalled();
    });

    it('should revoke using auth cookie token when auth header token is absent', async () => {
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111123', exp: Math.floor(Date.now() / 1000) + 3600 } });
      getRequestAuthToken.mockResolvedValueOnce('cookie-token');

      const request = new NextRequest('http://localhost:3000/api/auth/revoke', {
        method: 'POST',
        body: JSON.stringify({ reason: 'cookie_logout' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(hashToken).toHaveBeenCalledWith('cookie-token');
      expect(revokeToken).toHaveBeenCalled();
    });

    it('should return 401 when authenticated address is missing', async () => {
      requireAuth.mockResolvedValue({ user: { exp: Math.floor(Date.now() / 1000) + 3600 } });

      const request = new NextRequest('http://localhost:3000/api/auth/revoke', {
        method: 'POST',
        body: JSON.stringify({ reason: 'user_requested' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
      expect(revokeToken).not.toHaveBeenCalled();
    });

    it('should return 400 when token is not a string', async () => {
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111123', exp: Math.floor(Date.now() / 1000) + 3600 } });
      getRequestAuthToken.mockResolvedValueOnce({ token: 'invalid-shape' });

      const request = new NextRequest('http://localhost:3000/api/auth/revoke', {
        method: 'POST',
        body: JSON.stringify({ reason: 'user_requested' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(revokeToken).not.toHaveBeenCalled();
    });
  });
});
