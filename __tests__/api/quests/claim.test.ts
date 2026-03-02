import { NextRequest } from 'next/server';
import { POST } from '@/app/api/quests/claim/route';

jest.mock('@/lib/db', () => ({
  getClient: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
  checkOwnership: jest.fn(),
}));

jest.mock('@/lib/auth/validation', () => ({
  validateBody: jest.fn(),
  claimQuestSchema: {},
}));

describe('/api/quests/claim', () => {
  const { getClient } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth, checkOwnership } = require('@/lib/auth/middleware');
  const { validateBody } = require('@/lib/auth/validation');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should claim quest rewards successfully', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123', id: 1 } });
      checkOwnership.mockReturnValue(true);
      validateBody.mockResolvedValue({
        success: true,
        data: {
          userAddress: '0x1111111111111111111111111111111111111123',
          questId: 1,
        },
      });

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // SELECT user
          .mockResolvedValueOnce({
            rows: [{
              id: 1,
              completed: true,
              claimed: false,
              reward_xp: 100,
              reward_vfide: 25,
              title: 'Test Quest',
            }],
          }) // SELECT quest progress
          .mockResolvedValueOnce({ rows: [] }) // UPDATE quest progress
          .mockResolvedValueOnce({ rows: [] }) // UPDATE gamification
          .mockResolvedValueOnce({ rows: [] }) // INSERT reward
          .mockResolvedValueOnce({ rows: [] }) // INSERT notification
          .mockResolvedValueOnce({ rows: [] }), // COMMIT
        release: jest.fn(),
      };
      getClient.mockResolvedValue(mockClient);

      const request = new NextRequest('http://localhost:3000/api/quests/claim', {
        method: 'POST',
        body: JSON.stringify({
          userAddress: '0x1111111111111111111111111111111111111123',
          questId: 1,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return 400 when quest is not completed', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123', id: 1 } });
      checkOwnership.mockReturnValue(true);
      validateBody.mockResolvedValue({
        success: true,
        data: {
          userAddress: '0x1111111111111111111111111111111111111123',
          questId: 1,
        },
      });

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // SELECT user
          .mockResolvedValueOnce({ rows: [] }) // SELECT quest progress (empty = not completed/claimed)
          .mockResolvedValueOnce({ rows: [] }), // ROLLBACK
        release: jest.fn(),
      };
      getClient.mockResolvedValue(mockClient);

      const request = new NextRequest('http://localhost:3000/api/quests/claim', {
        method: 'POST',
        body: JSON.stringify({
          userAddress: '0x1111111111111111111111111111111111111123',
          questId: 1,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('not completed');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return 400 when quest already claimed', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123', id: 1 } });
      checkOwnership.mockReturnValue(true);
      validateBody.mockResolvedValue({
        success: true,
        data: {
          userAddress: '0x1111111111111111111111111111111111111123',
          questId: 1,
        },
      });

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // SELECT user
          .mockResolvedValueOnce({ rows: [] }) // SELECT quest progress (empty = already claimed)
          .mockResolvedValueOnce({ rows: [] }), // ROLLBACK
        release: jest.fn(),
      };
      getClient.mockResolvedValue(mockClient);

      const request = new NextRequest('http://localhost:3000/api/quests/claim', {
        method: 'POST',
        body: JSON.stringify({
          userAddress: '0x1111111111111111111111111111111111111123',
          questId: 1,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('already claimed');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
