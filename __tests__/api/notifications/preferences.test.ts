import { NextRequest } from 'next/server';
import { GET, PUT } from '@/app/api/notifications/preferences/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

describe('/api/notifications/preferences', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return notification preferences', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue(true);

      query.mockResolvedValue({
        rows: [{
          user_id: 1,
          email_notifications: true,
          push_notifications: false,
          quest_notifications: true,
        }],
      });

      const request = new NextRequest('http://localhost:3000/api/notifications/preferences?userAddress=0x123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.preferences).toBeDefined();
    });
  });

  describe('PUT', () => {
    it('should update notification preferences', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue(true);

      query.mockResolvedValue({
        rows: [{
          user_id: 1,
          email_notifications: false,
        }],
      });

      const request = new NextRequest('http://localhost:3000/api/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify({
          userAddress: '0x123',
          emailNotifications: false,
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.preferences).toBeDefined();
    });
  });
});
