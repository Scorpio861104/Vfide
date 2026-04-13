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

  const encryptedPayload = JSON.stringify({
    v: 1,
    ephemeralPublicKey: 'a'.repeat(130),
    ciphertext: 'dGVzdC1jaXBoZXJ0ZXh0',
    iv: 'dGVzdC1pdg==',
    sig: `0x${'d'.repeat(130)}`,
    ts: Date.now(),
    nonce: 'b'.repeat(32),
  });

  describe('PATCH', () => {
    it('should return 400 for malformed JSON', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      const request = new NextRequest('http://localhost:3000/api/messages/edit', {
        method: 'PATCH',
        body: '{"messageId": "1"',
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON');
    });

    it('should return 400 for non-object body', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

      const request = new NextRequest('http://localhost:3000/api/messages/edit', {
        method: 'PATCH',
        body: JSON.stringify(['invalid']),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
    });

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
          newContent: encryptedPayload,
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
          newContent: encryptedPayload,
          userAddress: '0x1111111111111111111111111111111111111123',
        }),
      });

      const response = await PATCH(request);
      expect(response.status).toBe(401);
    });

    it('should return 401 for malformed authenticated address', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: 'bad-address' } });

      const request = new NextRequest('http://localhost:3000/api/messages/edit', {
        method: 'PATCH',
        body: JSON.stringify({
          messageId: '1',
          conversationId: '1',
          newContent: encryptedPayload,
          userAddress: '0x1111111111111111111111111111111111111123',
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should reject plaintext edited content', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1111111111111111111111111111111111111123' } });

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
          newContent: 'plaintext edit',
          userAddress: '0x1111111111111111111111111111111111111123',
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('encrypted payload');
      expect(mockClient.query).not.toHaveBeenCalledWith('BEGIN');
    });
  });
});
