import { NextRequest, NextResponse } from 'next/server';
import { GET, PATCH, POST } from '@/app/api/groups/invites/route';

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
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
      query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            group_id: 1,
            code: 'ABC123',
            inviter_address: '0x1111111111111111111111111111111111111123',
            invitee_address: '0x2222222222222222222222222222222222222456',
            status: 'pending',
          },
        ],
      });

      const request = new NextRequest('http://localhost:3000/api/groups/invites?groupId=1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.invites).toHaveLength(1);
    });

    it('should return 403 when non-admin member requests group invites', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      query.mockResolvedValueOnce({ rows: [{ role: 'member' }] });

      const request = new NextRequest('http://localhost:3000/api/groups/invites?groupId=1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Not authorized');
    });

    it('should return 400 for invalid groupId query parameter', async () => {
      withRateLimit.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/groups/invites?groupId=abc');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid groupId');
      expect(requireAuth).not.toHaveBeenCalled();
      expect(query).not.toHaveBeenCalled();
    });

    it('should return 401 for malformed authenticated address on groupId reads', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: 'bad-address' } });

      const request = new NextRequest('http://localhost:3000/api/groups/invites?groupId=1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(query).not.toHaveBeenCalled();
    });
  });

  describe('POST', () => {
    it('should create group invite', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

        // user lookup
        query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
        // member role lookup
        query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
        // generateInviteCode check (must be empty to avoid recursion)
        query.mockResolvedValueOnce({ rows: [] });
        // insert invite
        query.mockResolvedValueOnce({
          rows: [{ id: 1, code: 'ABC123', status: 'pending' }],
        });

      const request = new NextRequest('http://localhost:3000/api/groups/invites', {
        method: 'POST',
        body: JSON.stringify({
          groupId: 1,
          expiresIn: 604800000,
          maxUses: 10,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.invite).toBeDefined();
    });

    it('should return 401 for unauthorized users', async () => {
      withRateLimit.mockResolvedValue(null);
      const unauthorizedResponse = NextResponse.json(
        { error: 'Unauthorized' },
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

    it('should return 400 for malformed JSON payload', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      const request = new NextRequest('http://localhost:3000/api/groups/invites', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'not-json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON payload');
      expect(query).not.toHaveBeenCalled();
    });

    it('should return 401 for malformed authenticated address on POST', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: 'bad-address' } });

      const request = new NextRequest('http://localhost:3000/api/groups/invites', {
        method: 'POST',
        body: JSON.stringify({ groupId: 1 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(query).not.toHaveBeenCalled();
    });
  });

  describe('PATCH', () => {
    it('should return 400 for invalid action', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      const request = new NextRequest('http://localhost:3000/api/groups/invites', {
        method: 'PATCH',
        body: JSON.stringify({ code: 'ABC123', action: 'ban' }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid code or action');
      expect(query).not.toHaveBeenCalled();
    });
  });
});
