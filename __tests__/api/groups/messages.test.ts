import { NextRequest } from 'next/server';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/validation', () => ({
  validateBody: jest.fn(),
  sendGroupMessageSchema: {},
}));

jest.mock('viem', () => ({
  isAddress: jest.fn(() => true),
  verifyMessage: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/security/requestContext', () => ({
  getRequestCorrelationContext: jest.fn(() => ({
    requestId: 'test-request-id',
    ipHash: 'abc123hash',
    ipSource: 'x-forwarded-for',
  })),
}));

describe('/api/groups/messages', () => {
  const strictGetEnv = 'VFIDE_STRICT_GROUP_MESSAGE_GET';
  const originalNodeEnv = process.env.NODE_ENV;
  const setNodeEnv = (value: string | undefined) => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value,
      configurable: true,
      enumerable: true,
      writable: true,
    });
  };
  const { GET, POST } = require('@/app/api/groups/messages/route');
  const { query } = require('@/lib/db');
  const { requireAuth } = require('@/lib/auth/middleware');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { validateBody } = require('@/lib/auth/validation');
  const { verifyMessage } = require('viem');
  const { logger } = require('@/lib/logger');

  const authAddress = '0x1234567890123456789012345678901234567890';
  const getEncryptedPayload = JSON.stringify({
    v: 2,
    groupId: '1',
    ts: Date.now(),
    groupSig: `0x${'e'.repeat(130)}`,
    members: ['a'.repeat(130)],
    encryptedForMembers: {
      ["a".repeat(130)]: JSON.stringify({
        v: 1,
        ephemeralPublicKey: 'b'.repeat(130),
        ciphertext: 'dGVzdC1jaXBoZXJ0ZXh0',
        iv: 'dGVzdC1pdg==',
        sig: `0x${'d'.repeat(130)}`,
        ts: Date.now(),
        nonce: 'c'.repeat(32),
      }),
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env[strictGetEnv];
    setNodeEnv(originalNodeEnv);
    withRateLimit.mockResolvedValue(null);
    requireAuth.mockResolvedValue({ user: { address: authAddress } });
    verifyMessage.mockResolvedValue(true);
  });

  afterAll(() => {
    setNodeEnv(originalNodeEnv);
  });

  describe('GET', () => {
    it('returns 400 when groupId is invalid', async () => {
      const request = new NextRequest('http://localhost:3000/api/groups/messages?groupId=abc');
      const response = await GET(request);
      expect(response.status).toBe(400);
    });

    it('returns 403 when requester is not a member', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const request = new NextRequest('http://localhost:3000/api/groups/messages?groupId=1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('not a member');
    });

    it('returns encrypted group messages for members', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ role: 'member' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 10,
              group_id: 1,
              sender_id: 2,
              content: getEncryptedPayload,
              is_encrypted: true,
              is_deleted: false,
              sender_address: authAddress,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const request = new NextRequest('http://localhost:3000/api/groups/messages?groupId=1&limit=20&offset=0');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.messages).toHaveLength(1);
      expect(data.messages[0].signature_valid).toBe(true);
      expect(data.droppedUnauthenticated).toBe(0);
      expect(data.total).toBe(1);
    });

    it('filters out unauthenticated payloads on GET', async () => {
      verifyMessage.mockResolvedValueOnce(false);
      query
        .mockResolvedValueOnce({ rows: [{ role: 'member' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 10,
              group_id: 1,
              sender_id: 2,
              content: getEncryptedPayload,
              is_encrypted: true,
              is_deleted: false,
              sender_address: authAddress,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const request = new NextRequest('http://localhost:3000/api/groups/messages?groupId=1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.messages).toHaveLength(0);
      expect(data.droppedUnauthenticated).toBe(1);
      expect(logger.warn).toHaveBeenCalledWith(
        'security.group_payload_tamper_detected',
        expect.objectContaining({
          groupId: 1,
          requester: authAddress,
          droppedUnauthenticated: 1,
          strictMode: false,
          blocked: false,
          requestId: 'test-request-id',
          ipHash: 'abc123hash',
          ipSource: 'x-forwarded-for',
          securityEvent: 'group_payload_tamper_detected',
        })
      );
    });

    it('returns 409 in strict mode when unauthenticated payloads are detected', async () => {
      process.env[strictGetEnv] = 'true';
      verifyMessage.mockResolvedValueOnce(false);
      query
        .mockResolvedValueOnce({ rows: [{ role: 'member' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 10,
              group_id: 1,
              sender_id: 2,
              content: getEncryptedPayload,
              is_encrypted: true,
              is_deleted: false,
              sender_address: authAddress,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const request = new NextRequest('http://localhost:3000/api/groups/messages?groupId=1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('strict mode');
      expect(data.droppedUnauthenticated).toBe(1);
      expect(logger.warn).toHaveBeenCalledWith(
        'security.group_payload_tamper_detected',
        expect.objectContaining({
          groupId: 1,
          requester: authAddress,
          droppedUnauthenticated: 1,
          strictMode: true,
          blocked: true,
          requestId: 'test-request-id',
          ipHash: 'abc123hash',
          ipSource: 'x-forwarded-for',
          securityEvent: 'group_payload_tamper_detected',
        })
      );
    });

    it('defaults to strict mode in production when override is unset', async () => {
      setNodeEnv('production');
      verifyMessage.mockResolvedValueOnce(false);
      query
        .mockResolvedValueOnce({ rows: [{ role: 'member' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 10,
              group_id: 1,
              sender_id: 2,
              content: getEncryptedPayload,
              is_encrypted: true,
              is_deleted: false,
              sender_address: authAddress,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const request = new NextRequest('http://localhost:3000/api/groups/messages?groupId=1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('strict mode');
      expect(data.droppedUnauthenticated).toBe(1);
    });

    it('allows explicit strict-mode disable in production', async () => {
      setNodeEnv('production');
      process.env[strictGetEnv] = 'false';
      verifyMessage.mockResolvedValueOnce(false);
      query
        .mockResolvedValueOnce({ rows: [{ role: 'member' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 10,
              group_id: 1,
              sender_id: 2,
              content: getEncryptedPayload,
              is_encrypted: true,
              is_deleted: false,
              sender_address: authAddress,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const request = new NextRequest('http://localhost:3000/api/groups/messages?groupId=1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.messages).toHaveLength(0);
      expect(data.droppedUnauthenticated).toBe(1);
    });

    it('returns 503 when group_messages table is missing', async () => {
      query.mockResolvedValueOnce({ rows: [{ role: 'member' }] });
      query.mockRejectedValueOnce(new Error('relation "group_messages" does not exist'));

      const request = new NextRequest('http://localhost:3000/api/groups/messages?groupId=1');
      const response = await GET(request);

      expect(response.status).toBe(503);
    });
  });

  describe('POST', () => {
    const encryptedPayload = JSON.stringify({
      v: 2,
      groupId: '1',
      ts: Date.now(),
      groupSig: `0x${'e'.repeat(130)}`,
      members: ['a'.repeat(130)],
      encryptedForMembers: {
        ["a".repeat(130)]: JSON.stringify({
          v: 1,
          ephemeralPublicKey: 'b'.repeat(130),
          ciphertext: 'dGVzdC1jaXBoZXJ0ZXh0',
          iv: 'dGVzdC1pdg==',
          sig: `0x${'d'.repeat(130)}`,
          ts: Date.now(),
          nonce: 'c'.repeat(32),
        }),
      },
    });

    it('returns 400 for invalid body', async () => {
      validateBody.mockResolvedValue({ success: false, error: 'Validation failed', details: [] });

      const request = new NextRequest('http://localhost:3000/api/groups/messages', {
        method: 'POST',
        body: JSON.stringify({ groupId: 1 }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('returns 400 for plaintext payloads', async () => {
      validateBody.mockResolvedValue({ success: true, data: { groupId: 1, content: 'hello' } });

      const request = new NextRequest('http://localhost:3000/api/groups/messages', {
        method: 'POST',
        body: JSON.stringify({ groupId: 1, content: 'hello' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('encrypted group payload');
    });

    it('returns 400 when payload groupId does not match route groupId', async () => {
      const mismatchedPayload = JSON.stringify({
        ...JSON.parse(encryptedPayload),
        groupId: '2',
      });

      validateBody.mockResolvedValue({ success: true, data: { groupId: 1, content: mismatchedPayload } });

      const request = new NextRequest('http://localhost:3000/api/groups/messages', {
        method: 'POST',
        body: JSON.stringify({ groupId: 1, content: mismatchedPayload }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('returns 400 when payload timestamp is outside allowed replay window', async () => {
      const stalePayload = JSON.stringify({
        ...JSON.parse(encryptedPayload),
        ts: Date.now() - (11 * 60 * 1000),
      });

      validateBody.mockResolvedValue({ success: true, data: { groupId: 1, content: stalePayload } });

      const request = new NextRequest('http://localhost:3000/api/groups/messages', {
        method: 'POST',
        body: JSON.stringify({ groupId: 1, content: stalePayload }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('returns 400 when payload has duplicate member entries', async () => {
      const parsed = JSON.parse(encryptedPayload);
      const memberKey = parsed.members[0];
      const duplicateMembersPayload = JSON.stringify({
        ...parsed,
        members: [memberKey, memberKey],
      });

      validateBody.mockResolvedValue({ success: true, data: { groupId: 1, content: duplicateMembersPayload } });

      const request = new NextRequest('http://localhost:3000/api/groups/messages', {
        method: 'POST',
        body: JSON.stringify({ groupId: 1, content: duplicateMembersPayload }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('returns 403 when sender is not group member', async () => {
      validateBody.mockResolvedValue({ success: true, data: { groupId: 1, content: encryptedPayload } });
      query
        .mockResolvedValueOnce({ rows: [{ id: 7 }] })
        .mockResolvedValueOnce({ rows: [] });

      const request = new NextRequest('http://localhost:3000/api/groups/messages', {
        method: 'POST',
        body: JSON.stringify({ groupId: 1, content: encryptedPayload }),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it('stores encrypted group message for members', async () => {
      validateBody.mockResolvedValue({ success: true, data: { groupId: 1, content: encryptedPayload } });
      query
        .mockResolvedValueOnce({ rows: [{ id: 7 }] })
        .mockResolvedValueOnce({ rows: [{ role: 'member' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 11,
              group_id: 1,
              sender_id: 7,
              content: encryptedPayload,
              is_encrypted: true,
              is_deleted: false,
            },
          ],
        });

      const request = new NextRequest('http://localhost:3000/api/groups/messages', {
        method: 'POST',
        body: JSON.stringify({ groupId: 1, content: encryptedPayload }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.message.is_encrypted).toBe(true);
    });

    it('returns 429 when group sender exceeds per-minute burst limit', async () => {
      validateBody.mockResolvedValue({ success: true, data: { groupId: 1, content: encryptedPayload } });
      query
        .mockResolvedValueOnce({ rows: [{ id: 7 }] })
        .mockResolvedValueOnce({ rows: [{ role: 'member' }] })
        .mockResolvedValueOnce({ rows: [{ count: '30' }] });

      const request = new NextRequest('http://localhost:3000/api/groups/messages', {
        method: 'POST',
        body: JSON.stringify({ groupId: 1, content: encryptedPayload }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('rate limit exceeded');
    });

    it('returns 409 for duplicate encrypted group payload replay', async () => {
      validateBody.mockResolvedValue({ success: true, data: { groupId: 1, content: encryptedPayload } });
      query
        .mockResolvedValueOnce({ rows: [{ id: 7 }] })
        .mockResolvedValueOnce({ rows: [{ role: 'member' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ id: 99 }] });

      const request = new NextRequest('http://localhost:3000/api/groups/messages', {
        method: 'POST',
        body: JSON.stringify({ groupId: 1, content: encryptedPayload }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('replay');
    });

    it('returns 400 when group payload signature verification fails', async () => {
      verifyMessage.mockResolvedValueOnce(false);
      validateBody.mockResolvedValue({ success: true, data: { groupId: 1, content: encryptedPayload } });

      const request = new NextRequest('http://localhost:3000/api/groups/messages', {
        method: 'POST',
        body: JSON.stringify({ groupId: 1, content: encryptedPayload }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('authenticated group payload signature');
    });

    it('returns 503 when group_messages table is missing', async () => {
      validateBody.mockResolvedValue({ success: true, data: { groupId: 1, content: encryptedPayload } });
      query.mockRejectedValueOnce(new Error('relation "group_messages" does not exist'));

      const request = new NextRequest('http://localhost:3000/api/groups/messages', {
        method: 'POST',
        body: JSON.stringify({ groupId: 1, content: encryptedPayload }),
      });

      const response = await POST(request);
      expect(response.status).toBe(503);
    });
  });
});
