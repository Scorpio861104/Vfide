import { NextRequest, NextResponse } from 'next/server';
import { POST } from '@/app/api/quests/weekly/claim/route';

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

describe('/api/quests/weekly/claim', () => {
  const { getClient } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth, checkOwnership } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should return 400 for malformed JSON', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123', id: 1 } });

      const request = new NextRequest('http://localhost:3000/api/quests/weekly/claim', {
        method: 'POST',
        body: '{"challengeId":1',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON');
    });

    it('should return 400 for non-object body', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123', id: 1 } });

      const request = new NextRequest('http://localhost:3000/api/quests/weekly/claim', {
        method: 'POST',
        body: JSON.stringify(['invalid']),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('JSON object');
    });

    it('should claim weekly quest successfully', async () => {
      withRateLimit.mockResolvedValue(null);
      // Route doesn't await requireAuth, so it uses sync return
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123', id: 1 } });
      checkOwnership.mockReturnValue(true);

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN (implicit)
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // user lookup
          .mockResolvedValueOnce({ 
            rows: [{ 
              completed: true, 
              claimed: false, 
              reward_xp: 200, 
              reward_vfide: '50000000000000000000',
              title: 'Weekly Trader',
              week_start: '2026-01-20'
            }] 
          }) // progress check
          .mockResolvedValueOnce({ rows: [] }) // claim update
          .mockResolvedValueOnce({ rows: [] }) // XP update
          .mockResolvedValueOnce({ rows: [] }) // reward record
          .mockResolvedValueOnce({ rows: [] }), // COMMIT
        release: jest.fn(),
      };
      getClient.mockResolvedValue(mockClient);

      const request = new NextRequest('http://localhost:3000/api/quests/weekly/claim', {
        method: 'POST',
        body: JSON.stringify({
          userAddress: '0x1111111111111111111111111111111111111123',
          challengeId: 1,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return 401 for unauthorized users', async () => {
      withRateLimit.mockResolvedValue(null);
      const unauthorizedResponse = NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
      requireAuth.mockReturnValue(unauthorizedResponse);

      const request = new NextRequest('http://localhost:3000/api/quests/weekly/claim', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });
  });
});
