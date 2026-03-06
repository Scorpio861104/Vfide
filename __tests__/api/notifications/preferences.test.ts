import { NextRequest } from 'next/server';
import { GET, PUT } from '@/app/api/notifications/preferences/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireOwnership: jest.fn(),
}));

describe('/api/notifications/preferences', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireOwnership } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return notification preferences', async () => {
      withRateLimit.mockResolvedValue(null);
      requireOwnership.mockResolvedValue({ user: { address: '0x123' } });

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
      expect(requireOwnership).toHaveBeenCalledWith(request, '0x123');
    });
  });

  describe('PUT', () => {
    it('should return 400 for malformed JSON', async () => {
      withRateLimit.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/notifications/preferences', {
        method: 'PUT',
        body: '{"userAddress":"0x123"',
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON');
    });

    it('should return 400 for non-object body', async () => {
      withRateLimit.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify(['invalid']),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('JSON object');
    });

    it('should update notification preferences', async () => {
      withRateLimit.mockResolvedValue(null);
      requireOwnership.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      query.mockResolvedValue({
        rows: [{
          user_id: 1,
          email_notifications: false,
        }],
      });

      const request = new NextRequest('http://localhost:3000/api/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify({
          userAddress: '0x1111111111111111111111111111111111111123',
          emailNotifications: false,
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.preferences).toBeDefined();
      expect(requireOwnership).toHaveBeenCalledWith(request, '0x1111111111111111111111111111111111111123');
    });
  });
});
