import { NextRequest } from 'next/server';
import { POST } from '@/app/api/security/csp-report/route';

describe('/api/security/csp-report', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should accept CSP violation reports', async () => {
      const request = new NextRequest('http://localhost:3000/api/security/csp-report', {
        method: 'POST',
        body: JSON.stringify({
          'csp-report': {
            'document-uri': 'http://example.com/page',
            'violated-directive': 'script-src',
            'blocked-uri': 'http://evil.com/script.js',
          },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(204);
    });

    it('should handle empty reports', async () => {
      const request = new NextRequest('http://localhost:3000/api/security/csp-report', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(204);
    });

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/security/csp-report', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });
});
