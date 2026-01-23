import { NextRequest } from 'next/server';
import { GET } from '@/app/api/notifications/vapid/route';

describe('/api/notifications/vapid', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'test-vapid-key';
  });

  describe('GET', () => {
    it('should return VAPID public key', async () => {
      const request = new NextRequest('http://localhost:3000/api/notifications/vapid');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.publicKey).toBe('test-vapid-key');
    });

    it('should return error when VAPID key not configured', async () => {
      delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      const request = new NextRequest('http://localhost:3000/api/notifications/vapid');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('not configured');
    });
  });
});
