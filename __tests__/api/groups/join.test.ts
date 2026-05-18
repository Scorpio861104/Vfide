import { NextRequest, NextResponse } from 'next/server';
import { POST } from '@/app/api/groups/join/route';

jest.mock('@/lib/db', () => ({
  getClient: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

describe('/api/groups/join', () => {
  const { getClient } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should join group successfully', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });
      const query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1, group_id: 1, is_active: true, max_uses: null, current_uses: 0, metadata: null }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] });

      getClient.mockResolvedValue({ query, release: jest.fn() });

      const request = new NextRequest('http://localhost:3000/api/groups/join', {
        method: 'POST',
        body: JSON.stringify({
          code: 'ABC123',
          userId: 1,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 401 for unauthorized users', async () => {
      withRateLimit.mockResolvedValue(null);
      const unauthorizedResponse = NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
      requireAuth.mockReturnValue(unauthorizedResponse);
      getClient.mockResolvedValue({ query: jest.fn(), release: jest.fn() });

      const request = new NextRequest('http://localhost:3000/api/groups/join', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('should return 401 for malformed authenticated address', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: 'bad-address' } });

      const request = new NextRequest('http://localhost:3000/api/groups/join', {
        method: 'POST',
        body: JSON.stringify({
          code: 'ABC123',
          userId: 1,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(getClient).not.toHaveBeenCalled();
    });

    it('should return 400 when already a member', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });
      const query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1, group_id: 1, is_active: true, metadata: null }] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] });

      getClient.mockResolvedValue({ query, release: jest.fn() });

      const request = new NextRequest('http://localhost:3000/api/groups/join', {
        method: 'POST',
        body: JSON.stringify({
          code: 'ABC123',
          userId: 1,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('already');
    });

    it('should return pending status when invite requires approval', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      const query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            group_id: 1,
            is_active: true,
            max_uses: null,
            current_uses: 0,
            require_approval: true,
          }],
        })
        .mockResolvedValueOnce({ rows: [] });

      getClient.mockResolvedValue({ query, release: jest.fn() });

      const request = new NextRequest('http://localhost:3000/api/groups/join', {
        method: 'POST',
        body: JSON.stringify({
          code: 'ABC123',
          userId: 1,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.status).toBe('pending');
      expect(data.message).toContain('request');
    });

    it('should return 403 when body userId does not match authenticated wallet user', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      const query = jest.fn().mockResolvedValueOnce({ rows: [{ id: 1 }] });
      getClient.mockResolvedValue({ query, release: jest.fn() });

      const request = new NextRequest('http://localhost:3000/api/groups/join', {
        method: 'POST',
        body: JSON.stringify({
          code: 'ABC123',
          userId: 999,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Unauthorized userId');
    });

    it('should return 400 for malformed JSON payload', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });
      getClient.mockResolvedValue({ query: jest.fn(), release: jest.fn() });

      const request = new NextRequest('http://localhost:3000/api/groups/join', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'not-json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON payload');
    });

    it('should return 400 for invalid userId value', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });
      getClient.mockResolvedValue({ query: jest.fn(), release: jest.fn() });

      const request = new NextRequest('http://localhost:3000/api/groups/join', {
        method: 'POST',
        body: JSON.stringify({
          code: 'ABC123',
          userId: -1,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid request body');
    });
  });
});
