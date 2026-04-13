import { NextRequest } from 'next/server';
import { GET, PATCH } from '@/app/api/quests/notifications/route';

jest.mock('@/lib/db', () => ({
  getClient: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
  isAdmin: jest.fn(),
}));

describe('/api/quests/notifications', () => {
  const { getClient } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');
  const { isAdmin } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
    isAdmin.mockReturnValue(false);
  });

  describe('GET', () => {
    it('should return quest notifications', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111111', id: 1 } });

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // user lookup
          .mockResolvedValueOnce({
            rows: [{
              id: 1,
              notification_type: 'completion',
              title: 'Quest completed!',
              message: 'Quest completed!',
              icon: '🎯',
              reward_xp: 50,
              reward_vfide: '10000000000000000000',
              created_at: new Date().toISOString(),
            }],
          }),
        release: jest.fn(),
      };
      getClient.mockResolvedValue(mockClient);

      const request = new NextRequest('http://localhost:3000/api/quests/notifications?userAddress=0x1111111111111111111111111111111111111111');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.notifications).toHaveLength(1);
    });

    it('should return 400 when userAddress is missing', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111123', id: 1 } });

      const request = new NextRequest('http://localhost:3000/api/quests/notifications');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('should return 403 for cross-user access', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', id: 1 } });
      isAdmin.mockReturnValue(false);

      const request = new NextRequest('http://localhost:3000/api/quests/notifications?userAddress=0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
      const response = await GET(request);

      expect(response.status).toBe(403);
    });

    it('should return 401 for malformed authenticated address', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: 'bad-address', id: 1 } });

      const request = new NextRequest('http://localhost:3000/api/quests/notifications?userAddress=0x123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(getClient).not.toHaveBeenCalled();
    });

    it('should return 400 for malformed userAddress query', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111111', id: 1 } });

      const request = new NextRequest('http://localhost:3000/api/quests/notifications?userAddress=not-an-address');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid user address format');
      expect(getClient).not.toHaveBeenCalled();
    });
  });

  describe('PATCH', () => {
    it('should return 400 for malformed JSON', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111111', id: 1 } });

      const request = new NextRequest('http://localhost:3000/api/quests/notifications', {
        method: 'PATCH',
        body: '{"notificationIds":["11111111-1111-1111-1111-111111111111"]',
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON');
    });

    it('should return 400 for non-object body', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111111', id: 1 } });

      const request = new NextRequest('http://localhost:3000/api/quests/notifications', {
        method: 'PATCH',
        body: JSON.stringify(['invalid']),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
    });

    it('should return 403 for cross-user updates', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', id: 1 } });
      isAdmin.mockReturnValue(false);

      const request = new NextRequest('http://localhost:3000/api/quests/notifications', {
        method: 'PATCH',
        body: JSON.stringify({
          notificationIds: ['11111111-1111-1111-1111-111111111111'],
          userAddress: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        }),
      });

      const response = await PATCH(request);
      expect(response.status).toBe(403);
    });

    it('should reject oversized notificationIds arrays', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111111', id: 1 } });

      const notificationIds = Array.from({ length: 501 }, () => '11111111-1111-1111-1111-111111111111');

      const request = new NextRequest('http://localhost:3000/api/quests/notifications', {
        method: 'PATCH',
        body: JSON.stringify({
          notificationIds,
          userAddress: '0x1111111111111111111111111111111111111111',
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
    });

    it('should return 401 for malformed authenticated address on PATCH', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: 'bad-address', id: 1 } });

      const request = new NextRequest('http://localhost:3000/api/quests/notifications', {
        method: 'PATCH',
        body: JSON.stringify({
          notificationIds: ['11111111-1111-1111-1111-111111111111'],
          userAddress: '0x123',
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(getClient).not.toHaveBeenCalled();
    });

    it('should return 400 for malformed userAddress on PATCH', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111111', id: 1 } });

      const request = new NextRequest('http://localhost:3000/api/quests/notifications', {
        method: 'PATCH',
        body: JSON.stringify({
          notificationIds: ['11111111-1111-1111-1111-111111111111'],
          userAddress: 'not-an-address',
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
      expect(getClient).not.toHaveBeenCalled();
    });
  });
});
