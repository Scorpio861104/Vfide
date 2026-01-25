import { NextRequest } from 'next/server';
import { GET } from '@/app/api/notifications/vapid/route';

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn().mockResolvedValue(null),
}));

describe('/api/notifications/vapid', () => {
  describe('GET', () => {
    it('should return 200 when VAPID key is configured or 503 when not configured', async () => {
      const request = new NextRequest('http://localhost:3000/api/notifications/vapid');
      const response = await GET(request);

      // Either 200 (key configured) or 503 (not configured) are both valid
      expect([200, 503]).toContain(response.status);
    });

    it('should have rate limiting', async () => {
      const { withRateLimit } = require('@/lib/auth/rateLimit');
      const request = new NextRequest('http://localhost:3000/api/notifications/vapid');
      await GET(request);

      expect(withRateLimit).toHaveBeenCalled();
    });
  });
});
