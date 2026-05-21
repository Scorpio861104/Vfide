import { NextRequest } from 'next/server';
import { GET, PATCH, POST } from '@/app/api/messages/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
  requireOwnership: jest.fn(async () => ({ user: { sub: 'test', address: '0x0000000000000000000000000000000000000000' } })),
  requireAdmin: jest.fn(async () => ({ user: { sub: 'test', address: '0x0000000000000000000000000000000000000000' } })),
  verifyAuth: jest.fn(async () => ({ ok: true, user: { sub: 'test' } })),
  getRequestAuthToken: jest.fn(async () => null),
  optionalAuth: jest.fn(async () => null),
  isAdmin: jest.fn(() => false),
  verifyOnChainAdmin: jest.fn(async () => false),
  checkOwnership: jest.fn(() => true),
  withAuth: jest.fn((handler: any) => async (req: any, ctx?: any) => handler(req, { sub: 'test', address: '0x0000000000000000000000000000000000000000' }, ctx)),
  withOwnership: jest.fn((_extractor: any, handler: any) => async (req: any, ctx?: any) => handler(req, { sub: 'test', address: '0x0000000000000000000000000000000000000000' }, ctx)),
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
  parseAbi: jest.fn(() => []),
  parseAbiItem: jest.fn((sig: any) => ({ name: typeof sig === 'string' ? sig.split(' ')[1]?.split('(')[0] : '', type: 'function',
  formatUnits: jest.fn((v: any) => String(v)),
  parseUnits: jest.fn((v: any) => BigInt(v || 0)),
  formatEther: jest.fn((v: any) => String(v)),
  parseEther: jest.fn((v: any) => BigInt(v || 0)),
  getAddress: jest.fn((a: string) => a),
  encodeFunctionData: jest.fn(() => '0x'),
  decodeFunctionResult: jest.fn(() => undefined),
  encodeAbiParameters: jest.fn(() => '0x'),
  decodeAbiParameters: jest.fn(() => []),
  keccak256: jest.fn(() => '0x' + '0'.repeat(64)),
  toBytes: jest.fn(() => new Uint8Array()),
  toHex: jest.fn((v: any) => '0x' + (v ?? '').toString(16)),
  hexToString: jest.fn((h: any) => String(h)),
  padHex: jest.fn((h: any) => h),
  zeroAddress: '0x0000000000000000000000000000000000000000',
  stringToHex: jest.fn((s: any) => '0x' + Buffer.from(String(s)).toString('hex')),
  createPublicClient: jest.fn(() => ({ readContract: jest.fn(), getBlockNumber: jest.fn() })),
  createWalletClient: jest.fn(() => ({ writeContract: jest.fn() })),
  http: jest.fn(() => ({})),
  custom: jest.fn(() => ({})),
  erc20Abi: [],
  erc721Abi: [],
})),
  formatUnits: jest.fn((v: any) => String(v)),
  parseUnits: jest.fn((v: any) => BigInt(v || 0)),
  formatEther: jest.fn((v: any) => String(v)),
  parseEther: jest.fn((v: any) => BigInt(v || 0)),
  getAddress: jest.fn((a: string) => a),
  encodeFunctionData: jest.fn(() => '0x'),
  decodeFunctionResult: jest.fn(() => undefined),
  encodeAbiParameters: jest.fn(() => '0x'),
  decodeAbiParameters: jest.fn(() => []),
  keccak256: jest.fn(() => '0x' + '0'.repeat(64)),
  toBytes: jest.fn(() => new Uint8Array()),
  toHex: jest.fn((v: any) => '0x' + (v ?? '').toString(16)),
  hexToString: jest.fn((h: any) => String(h)),
  padHex: jest.fn((h: any) => h),
  zeroAddress: '0x0000000000000000000000000000000000000000',
  stringToHex: jest.fn((s: any) => '0x' + Buffer.from(String(s)).toString('hex')),
  createPublicClient: jest.fn(() => ({ readContract: jest.fn(), getBlockNumber: jest.fn() })),
  createWalletClient: jest.fn(() => ({ writeContract: jest.fn() })),
  http: jest.fn(() => ({})),
  custom: jest.fn(() => ({})),
  erc20Abi: [],
  erc721Abi: [],
}));

jest.mock('@/lib/server/websocketBridge', () => ({
  publishWebsocketEvent: jest.fn().mockResolvedValue(true),
}));

describe('/api/messages', () => {
  const { query, getClient } = require('@/lib/db');
  const { requireAuth } = require('@/lib/auth/middleware');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { validateBody } = require('@/lib/auth/validation');
  const { isAddress } = require('viem');
  const { publishWebsocketEvent } = require('@/lib/server/websocketBridge');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    const mockUserAddress = '0x1234567890123456789012345678901234567890';
    const mockOtherAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

    it('should return messages for a conversation', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: mockUserAddress } });
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
      const { NextResponse } = require('next/server');
      const unauthorizedResponse = NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
      requireAuth.mockReturnValue(unauthorizedResponse);

      const request = new NextRequest('http://localhost:3000/api/messages');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid limit parameter', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: mockUserAddress } });

      const request = new NextRequest(
        `http://localhost:3000/api/messages?limit=invalid&userAddress=${mockUserAddress}&conversationWith=${mockOtherAddress}`
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid');
    });

    it('should return 400 for invalid userAddress format', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: mockUserAddress } });
      isAddress.mockReturnValue(false);

      const request = new NextRequest(
        'http://localhost:3000/api/messages?userAddress=invalid&conversationWith=0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
    });

    it('should default to limit 50 when not specified', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: mockUserAddress } });
      isAddress.mockReturnValue(true);
      query.mockResolvedValue({ rows: [] });

      const request = new NextRequest(
        `http://localhost:3000/api/messages?userAddress=${mockUserAddress}&conversationWith=${mockOtherAddress}`
      );
      await GET(request);

      // Should use default limit of 50
      expect(query).toHaveBeenCalled();
    });

    it('should clamp oversized limit to 200', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: mockUserAddress } });
      isAddress.mockReturnValue(true);

      query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const request = new NextRequest(
        `http://localhost:3000/api/messages?userAddress=${mockUserAddress}&conversationWith=${mockOtherAddress}&limit=9999`
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.limit).toBe(200);
      expect(query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('LIMIT $3 OFFSET $4'),
        [mockUserAddress.toLowerCase(), mockOtherAddress.toLowerCase(), 200, 0]
      );
    });

    it('should clamp oversized offset to 10000', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: mockUserAddress } });
      isAddress.mockReturnValue(true);

      query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const request = new NextRequest(
        `http://localhost:3000/api/messages?userAddress=${mockUserAddress}&conversationWith=${mockOtherAddress}&limit=50&offset=999999`
      );

      const response = await GET(request);
      expect(response.status).toBe(200);
      expect(query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('LIMIT $3 OFFSET $4'),
        [mockUserAddress.toLowerCase(), mockOtherAddress.toLowerCase(), 50, 10000]
      );
    });
  });

  describe('POST', () => {
    const mockUserAddress = '0x1234567890123456789012345678901234567890';
    const mockRecipientAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
    const encryptedPayload = JSON.stringify({
      v: 1,
      ephemeralPublicKey: 'a'.repeat(130),
      ciphertext: 'dGVzdC1jaXBoZXJ0ZXh0',
      iv: 'dGVzdC1pdg==',
      sig: `0x${'d'.repeat(130)}`,
      ts: Date.now(),
      nonce: 'b'.repeat(32),
    });

    it('should send a message successfully', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: mockUserAddress } });
      validateBody.mockResolvedValue({
        success: true,
        data: {
          from: mockUserAddress,
          to: mockRecipientAddress,
          content: encryptedPayload,
        },
      });

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // sender
          .mockResolvedValueOnce({ rows: [{ id: 2 }] }) // recipient
          .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // rate check
          .mockResolvedValueOnce({ rows: [] }) // replay check
          .mockResolvedValueOnce({ rows: [{ id: 1, content: encryptedPayload }] }) // insert message
          .mockResolvedValueOnce({}) // insert notification
          .mockResolvedValueOnce({}), // COMMIT
        release: jest.fn(),
      };
      getClient.mockResolvedValue(mockClient);

      const request = new NextRequest('http://localhost:3000/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          from: mockUserAddress,
          to: mockRecipientAddress,
          content: encryptedPayload,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.message).toBeDefined();
      expect(publishWebsocketEvent).toHaveBeenCalledTimes(2);
      expect(publishWebsocketEvent).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          type: 'message',
          payload: expect.objectContaining({
            topic: `chat.${mockRecipientAddress.toLowerCase()}_${mockUserAddress.toLowerCase()}`,
            from: mockUserAddress.toLowerCase(),
            to: mockRecipientAddress.toLowerCase(),
          }),
        })
      );
      expect(publishWebsocketEvent).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          type: 'notification',
          payload: expect.objectContaining({
            topic: 'notifications',
            category: 'message',
            recipient: mockRecipientAddress.toLowerCase(),
            sender: mockUserAddress.toLowerCase(),
          }),
        })
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should reject plaintext message content', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: mockUserAddress } });
      validateBody.mockResolvedValue({
        success: true,
        data: {
          from: mockUserAddress,
          to: mockRecipientAddress,
          content: 'Hello!',
        },
      });

      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      getClient.mockResolvedValue(mockClient);

      const request = new NextRequest('http://localhost:3000/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          from: mockUserAddress,
          to: mockRecipientAddress,
          content: 'Hello!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('encrypted payload');
      expect(mockClient.query).not.toHaveBeenCalledWith('BEGIN');
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
      const { NextResponse } = require('next/server');
      const unauthorizedResponse = NextResponse.json(
        { error: 'Unauthorized' },
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
      requireAuth.mockReturnValue({ user: { address: mockUserAddress } });
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
      requireAuth.mockReturnValue({ user: { address: mockUserAddress } });
      validateBody.mockResolvedValue({
        success: true,
        data: {
          from: mockUserAddress,
          to: mockRecipientAddress,
          content: encryptedPayload,
        },
      });

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockRejectedValueOnce(new Error('Database error')), // fail on sender query
        release: jest.fn(),
      };
      getClient.mockResolvedValue(mockClient);

      const request = new NextRequest('http://localhost:3000/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          from: mockUserAddress,
          to: mockRecipientAddress,
          content: encryptedPayload,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Database error');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return 429 when sender exceeds per-conversation minute burst limit', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: mockUserAddress } });
      validateBody.mockResolvedValue({
        success: true,
        data: {
          from: mockUserAddress,
          to: mockRecipientAddress,
          content: encryptedPayload,
        },
      });

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // sender
          .mockResolvedValueOnce({ rows: [{ id: 2 }] }) // recipient
          .mockResolvedValueOnce({ rows: [{ count: '30' }] }) // rate check limit reached
          .mockResolvedValueOnce({}), // ROLLBACK
        release: jest.fn(),
      };
      getClient.mockResolvedValue(mockClient);

      const request = new NextRequest('http://localhost:3000/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          from: mockUserAddress,
          to: mockRecipientAddress,
          content: encryptedPayload,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('rate limit exceeded');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return 409 on duplicate encrypted payload replay', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: mockUserAddress } });
      validateBody.mockResolvedValue({
        success: true,
        data: {
          from: mockUserAddress,
          to: mockRecipientAddress,
          content: encryptedPayload,
        },
      });

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // sender
          .mockResolvedValueOnce({ rows: [{ id: 2 }] }) // recipient
          .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // rate check
          .mockResolvedValueOnce({ rows: [{ id: 999 }] }) // replay hit
          .mockResolvedValueOnce({}), // ROLLBACK
        release: jest.fn(),
      };
      getClient.mockResolvedValue(mockClient);

      const request = new NextRequest('http://localhost:3000/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          from: mockUserAddress,
          to: mockRecipientAddress,
          content: encryptedPayload,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('replay');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('PATCH', () => {
    it('should return 400 for malformed JSON', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1234567890123456789012345678901234567890' } });

      const request = new NextRequest('http://localhost:3000/api/messages', {
        method: 'PATCH',
        body: '{"messageIds":[1,2]'
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON');
    });

    it('should return 400 for non-object body', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1234567890123456789012345678901234567890' } });

      const request = new NextRequest('http://localhost:3000/api/messages', {
        method: 'PATCH',
        body: JSON.stringify(['invalid']),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid request body');
    });

    it('should reject oversized messageIds arrays', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1234567890123456789012345678901234567890' } });

      const messageIds = Array.from({ length: 501 }, (_, index) => index + 1);

      const request = new NextRequest('http://localhost:3000/api/messages', {
        method: 'PATCH',
        body: JSON.stringify({
          messageIds,
          userAddress: '0x1234567890123456789012345678901234567890',
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid request body');
    });

    it('should reject invalid messageIds element types', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1234567890123456789012345678901234567890' } });

      const request = new NextRequest('http://localhost:3000/api/messages', {
        method: 'PATCH',
        body: JSON.stringify({
          messageIds: [1, '2', -3],
          userAddress: '0x1234567890123456789012345678901234567890',
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid request body');
      expect(query).not.toHaveBeenCalled();
    });

    it('should reject invalid userAddress format for conversation read update', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockReturnValue({ user: { address: '0x1234567890123456789012345678901234567890' } });
      isAddress.mockImplementation((value: string) => value === '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd');

      const request = new NextRequest('http://localhost:3000/api/messages', {
        method: 'PATCH',
        body: JSON.stringify({
          conversationWith: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          userAddress: 'invalid',
        }),
      });

      const response = await PATCH(request);
      expect(response.status).toBe(400);
    });
  });
});
