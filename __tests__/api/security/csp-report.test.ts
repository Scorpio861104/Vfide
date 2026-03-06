import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/security/csp-report/route';

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn().mockResolvedValue(null),
}));

describe('/api/security/csp-report', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure rate limit continues to pass after clearAllMocks
    const { withRateLimit } = require('@/lib/auth/rateLimit');
    withRateLimit.mockResolvedValue(null);
  });

  describe('POST', () => {
    it('should accept CSP violation reports', async () => {
      const request = new NextRequest('http://localhost:3000/api/security/csp-report', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          'csp-report': {
            'document-uri': 'http://example.com/page',
            'violated-directive': 'script-src',
            'blocked-uri': 'http://evil.com/script.js',
          },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('should handle empty reports', async () => {
      const request = new NextRequest('http://localhost:3000/api/security/csp-report', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/security/csp-report', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'invalid json',
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('GET', () => {
    it('should clamp oversized limit to 200 in development mode', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      try {
        for (let i = 0; i < 210; i += 1) {
          const postRequest = new NextRequest('http://localhost:3000/api/security/csp-report', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              'csp-report': {
                'document-uri': `http://example.com/page-${i}`,
                'violated-directive': 'script-src',
                'blocked-uri': 'http://evil.com/script.js',
              },
            }),
          });

          const postResponse = await POST(postRequest);
          expect(postResponse.status).toBe(200);
        }

        const getRequest = new NextRequest('http://localhost:3000/api/security/csp-report?limit=9999');
        const getResponse = await GET(getRequest);
        const data = await getResponse.json();

        expect(getResponse.status).toBe(200);
        expect(Array.isArray(data.recent)).toBe(true);
        expect(data.recent).toHaveLength(200);
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
      }
    });
  });
});
