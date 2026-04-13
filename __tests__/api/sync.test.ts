import { NextRequest, NextResponse } from 'next/server';
import { GET, POST } from '@/app/api/sync/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

jest.mock('@/lib/auth/validation', () => ({
  validateBody: jest.fn(),
  syncSchema: {},
}));

describe('/api/sync', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');
  const { validateBody } = require('@/lib/auth/validation');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 401 for malformed authenticated address', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: 'bad-address' } });

      const request = new NextRequest('http://localhost:3000/api/sync?userId=1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(query).not.toHaveBeenCalled();
    });
  });

  describe('POST', () => {
    it('should return 400 for malformed JSON', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({
        user: { address: '0x1111111111111111111111111111111111111123' },
      });

      const request = new NextRequest('http://localhost:3000/api/sync', {
        method: 'POST',
        body: '{"userId":"1"',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON');
    });

    it('should return 400 for non-object body', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({
        user: { address: '0x1111111111111111111111111111111111111123' },
      });

      const request = new NextRequest('http://localhost:3000/api/sync', {
        method: 'POST',
        body: JSON.stringify(['invalid']),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
    });

    it('should sync user data successfully', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({
        user: { address: '0x1111111111111111111111111111111111111123' },
      });
      validateBody.mockResolvedValue({
        success: true,
        data: {
          userId: '1',
          entity: 'quests',
          lastSyncTimestamp: new Date().toISOString(),
        },
      });

      query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, synced_at: new Date() }] });

      const request = new NextRequest('http://localhost:3000/api/sync', {
        method: 'POST',
        body: JSON.stringify({
          userId: '1',
          entity: 'quests',
          lastSyncTimestamp: new Date().toISOString(),
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 401 for unauthorized users', async () => {
      withRateLimit.mockResolvedValue(null);
      const unauthorizedResponse = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      requireAuth.mockReturnValue(unauthorizedResponse);

      const request = new NextRequest('http://localhost:3000/api/sync', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('should return 401 for malformed authenticated address', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: 'bad-address' } });

      const request = new NextRequest('http://localhost:3000/api/sync', {
        method: 'POST',
        body: JSON.stringify({
          userId: '1',
          entity: 'quests',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(query).not.toHaveBeenCalled();
    });

    it('should handle sync conflicts', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({
        user: { address: '0x1111111111111111111111111111111111111123' },
      });
      validateBody.mockResolvedValue({
        success: true,
        data: {
          userId: '1',
          entity: 'quests',
          lastSyncTimestamp: new Date(Date.now() - 1000000).toISOString(),
        },
      });

      query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, synced_at: new Date(), conflict: true }],
        });

      const request = new NextRequest('http://localhost:3000/api/sync', {
        method: 'POST',
        body: JSON.stringify({
          userId: '1',
          entity: 'quests',
          lastSyncTimestamp: new Date(Date.now() - 1000000).toISOString(),
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toBeDefined();
    });

    it('should return 403 when userId does not belong to authenticated user', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({
        user: { address: '0x1111111111111111111111111111111111111123' },
      });

      query.mockResolvedValueOnce({ rows: [{ id: 2 }] });

      const request = new NextRequest('http://localhost:3000/api/sync', {
        method: 'POST',
        body: JSON.stringify({
          userId: '1',
          entity: 'quests',
          lastSyncTimestamp: new Date().toISOString(),
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('own sync state');
    });
  });
});
