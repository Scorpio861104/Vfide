import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/groups/invites/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

describe('/api/groups/invites', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return group invites', async () => {
      withRateLimit.mockResolvedValue(null);

      query.mockResolvedValue({
        rows: [
          {
            id: 1,
            group_id: 1,
            inviter_address: '0x1111111111111111111111111111111111111123',
            invitee_address: '0x2222222222222222222222222222222222222456',
            status: 'pending',
          },
        ],
      });

      const request = new NextRequest('http://localhost:3000/api/groups/invites?userAddress=0x456');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.invites).toHaveLength(1);
    });
  });

  describe('POST', () => {
    it('should create group invite', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue(true);

      query.mockResolvedValue({
        rows: [{ id: 1, status: 'pending' }],
      });

      const request = new NextRequest('http://localhost:3000/api/groups/invites', {
        method: 'POST',
        body: JSON.stringify({
          groupId: 1,
          inviterAddress: '0x1111111111111111111111111111111111111123',
          inviteeAddress: '0x2222222222222222222222222222222222222456',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.invite).toBeDefined();
    });

    it('should return 401 for unauthorized users', async () => {
      withRateLimit.mockResolvedValue(null);
      const unauthorizedResponse = new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
      requireAuth.mockReturnValue(unauthorizedResponse);

      const request = new NextRequest('http://localhost:3000/api/groups/invites', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });
  });
});
