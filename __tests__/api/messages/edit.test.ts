import { NextRequest, NextResponse } from 'next/server';
import { PATCH } from '@/app/api/messages/edit/route';

jest.mock('@/lib/db', () => ({
  getClient: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

describe('/api/messages/edit', () => {
  const { getClient } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PATCH', () => {
    it('should edit message successfully', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({
            rows: [{
              id: 1,
              content: 'Original content',
              sender: '0x1111111111111111111111111111111111111123',
              conversation_id: '1',
              is_deleted: false,
              timestamp: new Date()
            }],
          }) // SELECT message
          .mockResolvedValueOnce({ rows: [] }) // INSERT edit history
          .mockResolvedValueOnce({ rows: [{ id: 1, content: 'Updated content' }] }) // UPDATE message
          .mockResolvedValueOnce({ rows: [] }), // COMMIT
        release: jest.fn(),
      };
      getClient.mockResolvedValue(mockClient);

      const request = new NextRequest('http://localhost:3000/api/messages/edit', {
        method: 'PATCH',
        body: JSON.stringify({
          messageId: '1',
          conversationId: '1',
          newContent: 'Updated content',
          userAddress: '0x1111111111111111111111111111111111111123',
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBeDefined();
    });

    it('should return 401 for unauthorized users', async () => {
      withRateLimit.mockResolvedValue(null);
      const unauthorizedResponse = NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
      requireAuth.mockReturnValue(unauthorizedResponse);

      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      getClient.mockResolvedValue(mockClient);

      const request = new NextRequest('http://localhost:3000/api/messages/edit', {
        method: 'PATCH',
        body: JSON.stringify({
          messageId: '1',
          conversationId: '1',
          newContent: 'Updated content',
          userAddress: '0x1111111111111111111111111111111111111123',
        }),
      });

      const response = await PATCH(request);
      expect(response.status).toBe(401);
    });
  });
});
