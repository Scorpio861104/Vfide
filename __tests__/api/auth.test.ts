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
    const mockMessage = `Sign in to VFIDE\n\nTimestamp: ${Date.now()}`;

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
        token: 'mock-jwt-token',
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

    it('should return 400 for invalid message format', async () => {
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
      expect(data.error).toBe('Invalid message format');
    });

    it('should return 400 for expired message', async () => {
      const expiredTimestamp = Date.now() - (10 * 60 * 1000); // 10 minutes ago
      const expiredMessage = `Sign in to VFIDE\n\nTimestamp: ${expiredTimestamp}`;

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

    it('should return 400 for invalid timestamp in message', async () => {
      const invalidMessage = 'Sign in to VFIDE\n\nTimestamp: NaN';

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
      expect(data.error).toBe('Invalid timestamp in message');
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
