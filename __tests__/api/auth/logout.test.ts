import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/logout/route';

jest.mock('@/lib/auth/cookieAuth', () => ({
  clearAuthCookies: jest.fn(),
}));

describe('/api/auth/logout', () => {
  const { clearAuthCookies } = require('@/lib/auth/cookieAuth');

  beforeEach(() => {
    jest.clearAllMocks();
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
      expect(data.message).toContain('logout');
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
  });
});
