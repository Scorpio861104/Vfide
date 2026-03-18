import { NextRequest } from 'next/server';
import { DELETE, GET, PATCH, POST } from '@/app/api/groups/members/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

describe('/api/groups/members', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 401 for malformed authenticated address', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: 'bad-address' } });

      const request = new NextRequest('http://localhost:3000/api/groups/members?groupId=1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(query).not.toHaveBeenCalled();
    });

    it('should return 403 when requester is not a group member', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111111' } });
      query.mockResolvedValueOnce({ rows: [] });

      const request = new NextRequest('http://localhost:3000/api/groups/members?groupId=1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return group members for authenticated group member', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111111' } });

      query
        .mockResolvedValueOnce({ rows: [{ role: 'member' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              user_address: '0x1111111111111111111111111111111111111123',
              username: 'user1',
              role: 'member',
              joined_at: new Date().toISOString(),
            },
          ],
        });

      const request = new NextRequest('http://localhost:3000/api/groups/members?groupId=1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.members).toHaveLength(1);
    });

    it('should return 403 when non-admin tries to read another member record', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111111' } });
      query.mockResolvedValueOnce({ rows: [{ role: 'member' }] });

      const request = new NextRequest(
        'http://localhost:3000/api/groups/members?groupId=1&userAddress=0x2222222222222222222222222222222222222222'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Unauthorized');
    });

    it('should allow user to read own member record', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111111' } });

      query
        .mockResolvedValueOnce({ rows: [{ role: 'member' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              user_address: '0x1111111111111111111111111111111111111111',
              username: 'self',
              role: 'member',
              joined_at: new Date().toISOString(),
            },
          ],
        });

      const request = new NextRequest(
        'http://localhost:3000/api/groups/members?groupId=1&userAddress=0x1111111111111111111111111111111111111111'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.member.user_address).toBe('0x1111111111111111111111111111111111111111');
    });

    it('should allow admin to read another member record', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' } });

      query
        .mockResolvedValueOnce({ rows: [{ role: 'admin' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              user_address: '0x2222222222222222222222222222222222222222',
              username: 'member2',
              role: 'member',
              joined_at: new Date().toISOString(),
            },
          ],
        });

      const request = new NextRequest(
        'http://localhost:3000/api/groups/members?groupId=1&userAddress=0x2222222222222222222222222222222222222222'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.member.user_address).toBe('0x2222222222222222222222222222222222222222');
    });

    it('should return 400 when groupId is missing', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111111' } });

      const request = new NextRequest('http://localhost:3000/api/groups/members');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
      expect(query).not.toHaveBeenCalled();
    });

  });

  describe('POST', () => {
    it('should return 401 for malformed authenticated address', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: 'bad-address' } });

      const request = new NextRequest('http://localhost:3000/api/groups/members', {
        method: 'POST',
        body: JSON.stringify({
          groupId: 1,
          userAddress: '0x2222222222222222222222222222222222222222',
          actorAddress: '0x2222222222222222222222222222222222222222',
          role: 'member',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(query).not.toHaveBeenCalled();
    });

    it('should reject spoofed actorAddress that does not match authenticated user', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111111' } });

      const request = new NextRequest('http://localhost:3000/api/groups/members', {
        method: 'POST',
        body: JSON.stringify({
          groupId: 1,
          userAddress: '0x2222222222222222222222222222222222222222',
          actorAddress: '0x3333333333333333333333333333333333333333',
          role: 'member',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Unauthorized actor');
    });

    it('should return 400 for malformed JSON payload', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111111' } });

      const request = new NextRequest('http://localhost:3000/api/groups/members', {
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

    it('should return 400 for invalid role value', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111111' } });

      const request = new NextRequest('http://localhost:3000/api/groups/members', {
        method: 'POST',
        body: JSON.stringify({
          groupId: 1,
          userAddress: '0x2222222222222222222222222222222222222222',
          actorAddress: '0x1111111111111111111111111111111111111111',
          role: 'owner',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid role value');
      expect(query).not.toHaveBeenCalled();
    });

    it('should reject moderator assigning admin role', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111111' } });
      query.mockResolvedValueOnce({ rows: [{ role: 'moderator' }] });

      const request = new NextRequest('http://localhost:3000/api/groups/members', {
        method: 'POST',
        body: JSON.stringify({
          groupId: 1,
          userAddress: '0x2222222222222222222222222222222222222222',
          actorAddress: '0x1111111111111111111111111111111111111111',
          role: 'admin',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Insufficient role');
    });
  });

  describe('PATCH', () => {
    it('should return 401 for malformed authenticated address', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: 'bad-address' } });

      const request = new NextRequest('http://localhost:3000/api/groups/members', {
        method: 'PATCH',
        body: JSON.stringify({
          groupId: 1,
          userAddress: '0x2222222222222222222222222222222222222222',
          actorAddress: '0x2222222222222222222222222222222222222222',
          role: 'member',
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(query).not.toHaveBeenCalled();
    });

    it('should reject spoofed actorAddress in role updates', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111111' } });

      const request = new NextRequest('http://localhost:3000/api/groups/members', {
        method: 'PATCH',
        body: JSON.stringify({
          groupId: 1,
          userAddress: '0x2222222222222222222222222222222222222222',
          actorAddress: '0x3333333333333333333333333333333333333333',
          role: 'admin',
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Unauthorized actor');
    });

    it('should return 400 for invalid role value on PATCH', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111111' } });

      const request = new NextRequest('http://localhost:3000/api/groups/members', {
        method: 'PATCH',
        body: JSON.stringify({
          groupId: 1,
          userAddress: '0x2222222222222222222222222222222222222222',
          actorAddress: '0x1111111111111111111111111111111111111111',
          role: 'owner',
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid role value');
      expect(query).not.toHaveBeenCalled();
    });

    it('should block changing own role', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111111' } });
      query
        .mockResolvedValueOnce({ rows: [{ role: 'admin' }] })
        .mockResolvedValueOnce({ rows: [{ role: 'admin' }] });

      const request = new NextRequest('http://localhost:3000/api/groups/members', {
        method: 'PATCH',
        body: JSON.stringify({
          groupId: 1,
          userAddress: '0x1111111111111111111111111111111111111111',
          role: 'member',
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('cannot change your own role');
    });

    it('should block moderator from managing admin target', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111111' } });
      query
        .mockResolvedValueOnce({ rows: [{ role: 'moderator' }] })
        .mockResolvedValueOnce({ rows: [{ role: 'admin' }] });

      const request = new NextRequest('http://localhost:3000/api/groups/members', {
        method: 'PATCH',
        body: JSON.stringify({
          groupId: 1,
          userAddress: '0x2222222222222222222222222222222222222222',
          role: 'member',
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('manage target member');
    });
  });

  describe('DELETE', () => {
    it('should return 401 for malformed authenticated address', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: 'bad-address' } });

      const request = new NextRequest(
        'http://localhost:3000/api/groups/members?groupId=1&userAddress=0x2222222222222222222222222222222222222222'
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(query).not.toHaveBeenCalled();
    });

    it('should reject non-admin member removing another member', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111111' } });
      query.mockResolvedValueOnce({ rows: [{ role: 'member' }] });

      const request = new NextRequest(
        'http://localhost:3000/api/groups/members?groupId=1&userAddress=0x2222222222222222222222222222222222222222'
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Unauthorized');
    });

    it('should block moderator removing admin target', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111111' } });
      query
        .mockResolvedValueOnce({ rows: [{ role: 'moderator' }] })
        .mockResolvedValueOnce({ rows: [{ role: 'admin' }] });

      const request = new NextRequest(
        'http://localhost:3000/api/groups/members?groupId=1&userAddress=0x2222222222222222222222222222222222222222'
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('manage target member');
    });
  });
});
