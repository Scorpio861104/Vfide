import { NextRequest, NextResponse } from 'next/server';
import { POST } from '@/app/api/groups/join/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

jest.mock('@/lib/auth/validation', () => ({
  validateBody: jest.fn(),
  joinGroupSchema: {},
}));

describe('/api/groups/join', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');
  const { validateBody } = require('@/lib/auth/validation');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should join group successfully', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue(true);
      validateBody.mockResolvedValue({
        success: true,
        data: {
          userAddress: '0x1111111111111111111111111111111111111123',
          groupId: 1,
        },
      });

      query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, member_count: 10 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const request = new NextRequest('http://localhost:3000/api/groups/join', {
        method: 'POST',
        body: JSON.stringify({
          userAddress: '0x1111111111111111111111111111111111111123',
          groupId: 1,
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

      const request = new NextRequest('http://localhost:3000/api/groups/join', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('should return 400 when already a member', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue(true);
      validateBody.mockResolvedValue({
        success: true,
        data: {
          userAddress: '0x1111111111111111111111111111111111111123',
          groupId: 1,
        },
      });

      query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const request = new NextRequest('http://localhost:3000/api/groups/join', {
        method: 'POST',
        body: JSON.stringify({
          userAddress: '0x1111111111111111111111111111111111111123',
          groupId: 1,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('already');
    });
  });
});
