import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/revoke/route';

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

jest.mock('@/lib/auth/cookieAuth', () => ({
  clearAuthCookies: jest.fn(),
}));

describe('/api/auth/revoke', () => {
  const { requireAuth } = require('@/lib/auth/middleware');
  const { clearAuthCookies } = require('@/lib/auth/cookieAuth');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should revoke token successfully', async () => {
      requireAuth.mockReturnValue(true);
      clearAuthCookies.mockImplementation((response) => response);

      const request = new NextRequest('http://localhost:3000/api/auth/revoke', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(clearAuthCookies).toHaveBeenCalled();
    });

    it('should return 401 for unauthorized users', async () => {
      const unauthorizedResponse = new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
      requireAuth.mockReturnValue(unauthorizedResponse);

      const request = new NextRequest('http://localhost:3000/api/auth/revoke', {
        method: 'POST',
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });
  });
});
