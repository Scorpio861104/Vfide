import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/logout/route';

jest.mock('@/lib/auth/cookieAuth', () => ({
  clearAuthCookies: jest.fn(),
  getAuthCookie: jest.fn(async () => null),
}));

jest.mock('@/lib/auth/middleware', () => ({
  getRequestAuthToken: jest.fn(),
  withAuth: jest.fn((handler: Function) => handler),
}));

jest.mock('@/lib/auth/tokenRevocation', () => ({
  revokeToken: jest.fn(),
  hashToken: jest.fn(async () => 'mocked-hash'),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn().mockResolvedValue(null),
}));

describe('/api/auth/logout', () => {
  const { clearAuthCookies } = require('@/lib/auth/cookieAuth');
  const { getRequestAuthToken } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
    getRequestAuthToken.mockResolvedValue(null);
  });

  describe('POST', () => {
    it('should logout user successfully', async () => {
      clearAuthCookies.mockImplementation((response) => response);

      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message.toLowerCase()).toContain('log');
      expect(clearAuthCookies).toHaveBeenCalled();
    });

    it('should clear auth cookies', async () => {
      clearAuthCookies.mockImplementation((response) => response);

      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
      });

      await POST(request);

      expect(clearAuthCookies).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should handle errors gracefully', async () => {
      clearAuthCookies.mockImplementation(() => {
        throw new Error('Cookie clear error');
      });

      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it('should ignore malformed token payload and still logout', async () => {
      clearAuthCookies.mockImplementation((response) => response);
      getRequestAuthToken.mockResolvedValue({ token: 'invalid-shape' });

      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
