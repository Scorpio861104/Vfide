import { NextRequest } from 'next/server';
import { PUT } from '@/app/api/messages/edit/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

describe('/api/messages/edit', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PUT', () => {
    it('should edit message successfully', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue(true);

      query.mockResolvedValue({
        rows: [{ id: 1, content: 'Updated content' }],
      });

      const request = new NextRequest('http://localhost:3000/api/messages/edit', {
        method: 'PUT',
        body: JSON.stringify({
          messageId: 1,
          content: 'Updated content',
          userAddress: '0x123',
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBeDefined();
    });

    it('should return 401 for unauthorized users', async () => {
      withRateLimit.mockResolvedValue(null);
      const unauthorizedResponse = new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
      requireAuth.mockReturnValue(unauthorizedResponse);

      const request = new NextRequest('http://localhost:3000/api/messages/edit', {
        method: 'PUT',
        body: JSON.stringify({}),
      });

      const response = await PUT(request);
      expect(response.status).toBe(401);
    });
  });
});
