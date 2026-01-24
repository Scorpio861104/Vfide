import { NextRequest } from 'next/server';

describe('/api/notifications/vapid', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  });

  describe('GET', () => {
    it('should return VAPID public key', async () => {
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'test-vapid-key';
      
      // Mock rate limit before importing the route
      jest.doMock('@/lib/auth/rateLimit', () => ({
        withRateLimit: jest.fn().mockResolvedValue(null),
      }));
      
      const { GET } = require('@/app/api/notifications/vapid/route');

      const request = new NextRequest('http://localhost:3000/api/notifications/vapid');
      const response = await GET(request);
      console.log('Response:', response);
      console.log('Response constructor:', response?.constructor?.name);
      console.log('Response keys:', Object.keys(response || {}));

      expect(response.status).toBe(200);
    });

    it('should return error when VAPID key not configured', async () => {
      delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      // Mock rate limit before importing the route
      jest.doMock('@/lib/auth/rateLimit', () => ({
        withRateLimit: jest.fn().mockResolvedValue(null),
      }));
      
      const { GET } = require('@/app/api/notifications/vapid/route');

      const request = new NextRequest('http://localhost:3000/api/notifications/vapid');
      const response = await GET(request);
      const data = await response.json();

      // 503 Service Unavailable when VAPID key not configured
      expect(response.status).toBe(503);
      expect(data.error).toBeDefined();
    });
  });
});
