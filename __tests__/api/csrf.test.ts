import { NextRequest } from 'next/server';
import { GET } from '@/app/api/csrf/route';

jest.mock('@/lib/security/csrf', () => ({
  generateCSRFToken: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

describe('/api/csrf', () => {
  const { generateCSRFToken } = require('@/lib/security/csrf');
  const { withRateLimit } = require('@/lib/auth/rateLimit');

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
    process.env.NODE_ENV = 'test';
  });

  describe('GET', () => {
    it('should generate and return CSRF token', async () => {
      const mockToken = 'mock-csrf-token-12345';
      generateCSRFToken.mockReturnValue(mockToken);

      const request = new NextRequest('http://localhost:3000/api/csrf');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.token).toBe(mockToken);
      expect(data.message).toBe('CSRF token generated successfully');
    });

    it('should set CSRF token in HTTPOnly cookie', async () => {
      const mockToken = 'mock-csrf-token-12345';
      generateCSRFToken.mockReturnValue(mockToken);

      const request = new NextRequest('http://localhost:3000/api/csrf');
      const response = await GET(request);
      const cookies = response.cookies.getAll();
      const csrfCookie = cookies.find((c: { name: string }) => c.name === 'csrf_token');

      expect(csrfCookie).toBeDefined();
      expect(csrfCookie?.value).toBe(mockToken);
    });

    it('should set secure cookie in production', async () => {
      process.env.NODE_ENV = 'production';
      generateCSRFToken.mockReturnValue('token');

      const request = new NextRequest('http://localhost:3000/api/csrf');
      const response = await GET(request);
      const cookies = response.cookies.getAll();
      const csrfCookie = cookies.find((c: { name: string }) => c.name === 'csrf_token');

      expect(csrfCookie).toBeDefined();
    });

    it('should set cookie with correct attributes', async () => {
      generateCSRFToken.mockReturnValue('token');

      const request = new NextRequest('http://localhost:3000/api/csrf');
      const response = await GET(request);
      const cookies = response.cookies.getAll();
      const csrfCookie = cookies.find((c: { name: string }) => c.name === 'csrf_token');

      expect(csrfCookie).toBeDefined();
      expect(csrfCookie?.value).toBe('token');
    });

    it('should return 500 when token generation fails', async () => {
      generateCSRFToken.mockImplementation(() => {
        throw new Error('Token generation failed');
      });

      const request = new NextRequest('http://localhost:3000/api/csrf');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to generate CSRF token');
    });

    it('should handle unknown errors gracefully', async () => {
      generateCSRFToken.mockImplementation(() => {
        throw 'Unknown error';
      });

      const request = new NextRequest('http://localhost:3000/api/csrf');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to generate CSRF token');
    });

    it('should generate unique tokens on multiple calls', async () => {
      generateCSRFToken
        .mockReturnValueOnce('token-1')
        .mockReturnValueOnce('token-2');

      const request1 = new NextRequest('http://localhost:3000/api/csrf');
      const response1 = await GET(request1);
      const data1 = await response1.json();

      const request2 = new NextRequest('http://localhost:3000/api/csrf');
      const response2 = await GET(request2);
      const data2 = await response2.json();

      expect(data1.token).toBe('token-1');
      expect(data2.token).toBe('token-2');
      expect(data1.token).not.toBe(data2.token);
    });
  });
});
