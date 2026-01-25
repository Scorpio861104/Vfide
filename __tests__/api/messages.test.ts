import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/messages/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/validation', () => ({
  validateBody: jest.fn(),
  sendMessageSchema: {},
}));

jest.mock('viem', () => ({
  isAddress: jest.fn(),
}));

describe('/api/messages', () => {
  const { query, getClient } = require('@/lib/db');
  const { requireAuth } = require('@/lib/auth/middleware');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { validateBody } = require('@/lib/auth/validation');
  const { isAddress } = require('viem');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    const mockUserAddress = '0x1234567890123456789012345678901234567890';
    const mockOtherAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

    it('should return messages for a conversation', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue(true);
      isAddress.mockReturnValue(true);

      const mockMessages = [
        {
          id: 1,
          content: 'Hello',
          sender_address: mockUserAddress,
          recipient_address: mockOtherAddress,
          created_at: new Date().toISOString(),
          is_read: false,
        },
      ];

      query.mockResolvedValue({ rows: mockMessages });

      const request = new NextRequest(
        `http://localhost:3000/api/messages?userAddress=${mockUserAddress}&conversationWith=${mockOtherAddress}`
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.messages).toBeDefined();
    });

    it('should return 429 for rate limit exceeded', async () => {
      const rateLimitResponse = new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429 }
      );
      withRateLimit.mockResolvedValue(rateLimitResponse);

      const request = new NextRequest('http://localhost:3000/api/messages');
      const response = await GET(request);

      expect(response.status).toBe(429);
    });

    it('should return 401 for unauthorized users', async () => {
      withRateLimit.mockResolvedValue(null);
      const unauthorizedResponse = new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
      requireAuth.mockReturnValue(unauthorizedResponse);

      const request = new NextRequest('http://localhost:3000/api/messages');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid limit parameter', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue(true);

      const request = new NextRequest(
        `http://localhost:3000/api/messages?limit=invalid&userAddress=${mockUserAddress}&conversationWith=${mockOtherAddress}`
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid');
    });

    it('should default to limit 50 when not specified', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue(true);
      isAddress.mockReturnValue(true);
      query.mockResolvedValue({ rows: [] });

      const request = new NextRequest(
        `http://localhost:3000/api/messages?userAddress=${mockUserAddress}&conversationWith=${mockOtherAddress}`
      );
      await GET(request);

      // Should use default limit of 50
      expect(query).toHaveBeenCalled();
    });
  });

  describe('POST', () => {
    const mockUserAddress = '0x1234567890123456789012345678901234567890';
    const mockRecipientAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

    it('should send a message successfully', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue(true);
      validateBody.mockResolvedValue({
        success: true,
        data: {
          senderAddress: mockUserAddress,
          recipientAddress: mockRecipientAddress,
          content: 'Hello!',
          isEncrypted: false,
        },
      });

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // sender
          .mockResolvedValueOnce({ rows: [{ id: 2 }] }) // recipient
          .mockResolvedValueOnce({ rows: [{ id: 1, content: 'Hello!' }] }), // insert message
        release: jest.fn(),
      };
      getClient.mockResolvedValue(mockClient);

      const request = new NextRequest('http://localhost:3000/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          senderAddress: mockUserAddress,
          recipientAddress: mockRecipientAddress,
          content: 'Hello!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBeDefined();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return 429 for rate limit exceeded', async () => {
      const rateLimitResponse = new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429 }
      );
      withRateLimit.mockResolvedValue(rateLimitResponse);

      const request = new NextRequest('http://localhost:3000/api/messages', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(429);
    });

    it('should return 401 for unauthorized users', async () => {
      withRateLimit.mockResolvedValue(null);
      const unauthorizedResponse = new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
      requireAuth.mockReturnValue(unauthorizedResponse);

      const request = new NextRequest('http://localhost:3000/api/messages', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid request body', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue(true);
      validateBody.mockResolvedValue({
        success: false,
        error: 'Invalid request body',
        details: ['content is required'],
      });

      const request = new NextRequest('http://localhost:3000/api/messages', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
    });

    it('should return 500 for database errors', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue(true);
      validateBody.mockResolvedValue({
        success: true,
        data: {
          senderAddress: mockUserAddress,
          recipientAddress: mockRecipientAddress,
          content: 'Hello!',
        },
      });

      const mockClient = {
        query: jest.fn().mockRejectedValue(new Error('Database error')),
        release: jest.fn(),
      };
      getClient.mockResolvedValue(mockClient);

      const request = new NextRequest('http://localhost:3000/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          senderAddress: mockUserAddress,
          recipientAddress: mockRecipientAddress,
          content: 'Hello!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
