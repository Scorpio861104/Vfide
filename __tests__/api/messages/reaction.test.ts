import { NextRequest, NextResponse } from 'next/server';
import { POST } from '@/app/api/messages/reaction/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

describe('/api/messages/reaction', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should return 400 for malformed JSON', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      const request = new NextRequest('http://localhost:3000/api/messages/reaction', {
        method: 'POST',
        body: '{"messageId": "1"',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON');
    });

    it('should add reaction successfully', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      query
        .mockResolvedValueOnce({ rows: [{ id: '1' }] }) // Membership check
        .mockResolvedValueOnce({ rows: [] }) // Check existing reaction
        .mockResolvedValueOnce({ rows: [] }) // Insert reaction
        .mockResolvedValueOnce({
          rows: [{
            reaction_type: 'emoji',
            emoji: '👍',
            image_url: null,
            image_name: null,
            users: [{ address: '0x1111111111111111111111111111111111111123', username: 'test', avatar: null }],
          }],
        }); // Get all reactions

      const request = new NextRequest('http://localhost:3000/api/messages/reaction', {
        method: 'POST',
        body: JSON.stringify({
          messageId: '1',
          conversationId: '1',
          emoji: '👍',
          userAddress: '0x1111111111111111111111111111111111111123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.reactions).toBeDefined();
    });

    it('should return 401 for unauthorized users', async () => {
      withRateLimit.mockResolvedValue(null);
      const unauthorizedResponse = NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
      requireAuth.mockReturnValue(unauthorizedResponse);
      query.mockResolvedValue({ rows: [] });

      const request = new NextRequest('http://localhost:3000/api/messages/reaction', {
        method: 'POST',
        body: JSON.stringify({
          messageId: '1',
          conversationId: '1',
          emoji: '👍',
          userAddress: '0x1111111111111111111111111111111111111123',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('should return 403 when user is not part of the message conversation', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      query.mockResolvedValueOnce({ rows: [] }); // Membership check fails

      const request = new NextRequest('http://localhost:3000/api/messages/reaction', {
        method: 'POST',
        body: JSON.stringify({
          messageId: '1',
          conversationId: '1',
          emoji: '👍',
          userAddress: '0x1111111111111111111111111111111111111123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('own conversations');
    });
  });
});
