import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/auth/route';

jest.mock('viem', () => ({
  verifyMessage: jest.fn(),
}));

jest.mock('@/lib/auth/jwt', () => ({
  generateToken: jest.fn(),
  verifyToken: jest.fn(),
  extractToken: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/validation', () => ({
  validateBody: jest.fn(),
  authSchema: {},
}));

jest.mock('@/lib/auth/cookieAuth', () => ({
  setAuthCookie: jest.fn(),
  getAuthCookie: jest.fn(),
  clearAuthCookies: jest.fn(),
}));

jest.mock('@/lib/security/siweChallenge', () => ({
  consumeAndValidateSiweChallenge: jest.fn(() => ({ ok: true })),
  getRequestIp: jest.fn(() => '127.0.0.1'),
}));

jest.mock('@/lib/security/accountProtection', () => ({
  clearAuthFailureSignals: jest.fn(),
  getAccountLock: jest.fn(() => null),
  recordSecurityEvent: jest.fn(),
}));

describe('/api/auth', () => {
  const { verifyMessage } = require('viem');
  const { generateToken, verifyToken, extractToken } = require('@/lib/auth/jwt');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { validateBody } = require('@/lib/auth/validation');
  const { setAuthCookie, getAuthCookie } = require('@/lib/auth/cookieAuth');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST - Authentication', () => {
    const mockAddress = '0x1234567890123456789012345678901234567890';
    const mockSignature = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab';
    const mockMessage = `Sign in to VFIDE\n\nChain ID: 8453\nTimestamp: ${Date.now()}`;

    it('should authenticate user with valid signature', async () => {
      withRateLimit.mockResolvedValue(null);
      validateBody.mockResolvedValue({
        success: true,
        data: {
          address: mockAddress,
          message: mockMessage,
          signature: mockSignature,
        },
      });
      verifyMessage.mockResolvedValue(true);
      generateToken.mockReturnValue({
        token: 'mock-jwt-token',
        address: mockAddress,
        expiresIn: 86400,
      });

      const request = new NextRequest('http://localhost:3000/api/auth', {
        method: 'POST',
        body: JSON.stringify({
          address: mockAddress,
          message: mockMessage,
          signature: mockSignature,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        address: mockAddress,
        expiresIn: 86400,
      });
      expect(setAuthCookie).toHaveBeenCalledWith('mock-jwt-token', expect.any(Object));
    });

    it('should return 400 for invalid request body', async () => {
      withRateLimit.mockResolvedValue(null);
      validateBody.mockResolvedValue({
        success: false,
        error: 'Invalid request body',
        details: ['address is required'],
      });

      const request = new NextRequest('http://localhost:3000/api/auth', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
    });

    it('should return 400 for missing chain ID in SIWE message', async () => {
      withRateLimit.mockResolvedValue(null);
      validateBody.mockResolvedValue({
        success: true,
        data: {
          address: mockAddress,
          message: 'Invalid message without prefix',
          signature: mockSignature,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/auth', {
        method: 'POST',
        body: JSON.stringify({
          address: mockAddress,
          message: 'Invalid message without prefix',
          signature: mockSignature,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('SIWE message must include a valid Chain ID');
    });

    it('should return 400 for expired message', async () => {
      const expiredTimestamp = Date.now() - (10 * 60 * 1000); // 10 minutes ago
      const expiredMessage = `Sign in to VFIDE\n\nChain ID: 8453\nTimestamp: ${expiredTimestamp}`;

      withRateLimit.mockResolvedValue(null);
      validateBody.mockResolvedValue({
        success: true,
        data: {
          address: mockAddress,
          message: expiredMessage,
          signature: mockSignature,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/auth', {
        method: 'POST',
        body: JSON.stringify({
          address: mockAddress,
          message: expiredMessage,
          signature: mockSignature,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Message expired. Please sign a new message.');
    });

    it('should return 400 for message missing timestamp', async () => {
      const noTimestampMessage = 'Sign in to VFIDE\n\nChain ID: 8453\nAddress: 0x1234';

      withRateLimit.mockResolvedValue(null);
      validateBody.mockResolvedValue({
        success: true,
        data: {
          address: mockAddress,
          message: noTimestampMessage,
          signature: mockSignature,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/auth', {
        method: 'POST',
        body: JSON.stringify({
          address: mockAddress,
          message: noTimestampMessage,
          signature: mockSignature,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Message must contain a timestamp');
    });

    it('should authenticate when SIWE message uses Issued At instead of Timestamp', async () => {
      const issuedAtMessage = [
        'vfide.io wants you to sign in with your Ethereum account:',
        mockAddress,
        '',
        'Sign in to VFIDE',
        '',
        'URI: https://vfide.io',
        'Version: 1',
        'Chain ID: 8453',
        'Nonce: abc123',
        `Issued At: ${new Date(Date.now() - 60_000).toISOString()}`,
      ].join('\n');

      withRateLimit.mockResolvedValue(null);
      validateBody.mockResolvedValue({
        success: true,
        data: {
          address: mockAddress,
          message: issuedAtMessage,
          signature: mockSignature,
        },
      });
      verifyMessage.mockResolvedValue(true);
      generateToken.mockReturnValue({
        token: 'mock-jwt-token',
        address: mockAddress,
        expiresIn: 86400,
      });

      const request = new NextRequest('http://localhost:3000/api/auth', {
        method: 'POST',
        body: JSON.stringify({
          address: mockAddress,
          message: issuedAtMessage,
          signature: mockSignature,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('should return 400 for non-numeric timestamp in message', async () => {
      const invalidMessage = 'Sign in to VFIDE\n\nChain ID: 8453\nTimestamp: NaN';

      withRateLimit.mockResolvedValue(null);
      validateBody.mockResolvedValue({
        success: true,
        data: {
          address: mockAddress,
          message: invalidMessage,
          signature: mockSignature,
        },
      });
      const request = new NextRequest('http://localhost:3000/api/auth', {
        method: 'POST',
        body: JSON.stringify({
          address: mockAddress,
          message: invalidMessage,
          signature: mockSignature,
        }),
      });

      const response = await POST(request);
      // 'Timestamp: NaN' does not match /Timestamp: (\d+)/ so fails timestamp presence check
      expect(response.status).toBe(400);
    });

    it('should return 400 for mixed-format timestamp in message', async () => {
      const invalidMessage = 'Sign in to VFIDE\n\nChain ID: 8453\nTimestamp: 123abc';

      withRateLimit.mockResolvedValue(null);
      validateBody.mockResolvedValue({
        success: true,
        data: {
          address: mockAddress,
          message: invalidMessage,
          signature: mockSignature,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/auth', {
        method: 'POST',
        body: JSON.stringify({
          address: mockAddress,
          message: invalidMessage,
          signature: mockSignature,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Message must contain a timestamp');
    });

    it('should return 400 for unsafe integer timestamp in message', async () => {
      const unsafeTimestampMessage = 'Sign in to VFIDE\n\nChain ID: 8453\nTimestamp: 9007199254740993';

      withRateLimit.mockResolvedValue(null);
      validateBody.mockResolvedValue({
        success: true,
        data: {
          address: mockAddress,
          message: unsafeTimestampMessage,
          signature: mockSignature,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/auth', {
        method: 'POST',
        body: JSON.stringify({
          address: mockAddress,
          message: unsafeTimestampMessage,
          signature: mockSignature,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Message must contain a timestamp');
    });

    it('should return 401 for invalid signature', async () => {
      withRateLimit.mockResolvedValue(null);
      validateBody.mockResolvedValue({
        success: true,
        data: {
          address: mockAddress,
          message: mockMessage,
          signature: mockSignature,
        },
      });
      verifyMessage.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/auth', {
        method: 'POST',
        body: JSON.stringify({
          address: mockAddress,
          message: mockMessage,
          signature: mockSignature,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid signature');
    });

    it('should return 429 for rate limit exceeded', async () => {
      const rateLimitResponse = new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429 }
      );
      withRateLimit.mockResolvedValue(rateLimitResponse);

      const request = new NextRequest('http://localhost:3000/api/auth', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(429);
    });

    it('should return 500 for unexpected errors', async () => {
      withRateLimit.mockResolvedValue(null);
      validateBody.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/auth', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Authentication failed');
    });
  });

  describe('GET - Verify Session', () => {
    const mockAddress = '0x1234567890123456789012345678901234567890';
    const mockToken = 'mock-jwt-token';

    it('should verify valid token from Authorization header', async () => {
      extractToken.mockReturnValue(mockToken);
      verifyToken.mockReturnValue({
        address: mockAddress,
        chainId: 84532,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400,
      });

      const request = new NextRequest('http://localhost:3000/api/auth', {
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        valid: true,
        address: mockAddress,
        chainId: 84532,
        issuedAt: expect.any(Number),
        expiresAt: expect.any(Number),
      });
    });

    it('should verify valid token from HTTPOnly cookie', async () => {
      extractToken.mockReturnValue(null);
      getAuthCookie.mockResolvedValue(mockToken);
      verifyToken.mockReturnValue({
        address: mockAddress,
        chainId: 84532,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400,
      });

      const request = new NextRequest('http://localhost:3000/api/auth');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.valid).toBe(true);
    });

    it('should return 401 when no token provided', async () => {
      extractToken.mockReturnValue(null);
      getAuthCookie.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/auth');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('No token provided');
    });

    it('should return 401 for invalid token', async () => {
      extractToken.mockReturnValue(mockToken);
      verifyToken.mockReturnValue(null);

      const request = new NextRequest('http://localhost:3000/api/auth', {
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid or expired token');
    });

    it('should return 401 when token verification throws error', async () => {
      extractToken.mockReturnValue(mockToken);
      verifyToken.mockImplementation(() => {
        throw new Error('Token verification error');
      });

      const request = new NextRequest('http://localhost:3000/api/auth', {
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Token verification failed');
    });
  });
});
