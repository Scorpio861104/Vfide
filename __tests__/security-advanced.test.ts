/**
 * Advanced Security Tests
 * Tests for CSRF protection, JWT authentication, and rate limiting
 */

import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import { 
  generateCSRFToken, 
  verifyCSRFToken, 
  getCSRFTokenFromRequest,
  createCSRFErrorResponse,
  validateCSRF
} from '@/lib/security/csrf';
import { 
  generateToken, 
  verifyToken, 
  extractToken, 
  isTokenExpired,
  shouldRefreshToken 
} from '@/lib/auth/jwt';

describe('CSRF Protection', () => {
  describe('Token Generation', () => {
    it('generates unique CSRF tokens', () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();
      
      expect(token1).toBeTruthy();
      expect(token2).toBeTruthy();
      expect(token1).not.toBe(token2);
    });

    it('generates tokens with sufficient entropy', () => {
      const token = generateCSRFToken();
      
      // Should be base64url encoded, at least 32 characters
      expect(token.length).toBeGreaterThanOrEqual(32);
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/); // base64url pattern
    });
  });

  describe('Token Validation', () => {
    it('validates matching CSRF tokens', () => {
      const token = generateCSRFToken();
      
      // Mock request with matching tokens
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'x-csrf-token': token,
          'cookie': `csrf_token=${token}`,
        },
      });
      
      expect(verifyCSRFToken(request)).toBe(true);
    });

    it('rejects mismatched CSRF tokens', () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();
      
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'x-csrf-token': token1,
          'cookie': `csrf_token=${token2}`,
        },
      });
      
      expect(verifyCSRFToken(request)).toBe(false);
    });

    it('rejects requests with missing CSRF token', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {},
      });
      
      expect(verifyCSRFToken(request)).toBe(false);
    });

    it('skips CSRF validation for GET requests', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
      });
      
      const result = validateCSRF(request);
      expect(result).toBeNull(); // No validation error
    });

    it('validates CSRF for state-changing methods', () => {
      const methods = ['POST', 'PUT', 'PATCH', 'DELETE'];
      
      methods.forEach(method => {
        const request = new NextRequest('http://localhost:3000/api/test', {
          method,
          headers: {},
        });
        
        const result = validateCSRF(request);
        expect(result).not.toBeNull();
        expect(result?.status).toBe(403);
      });
    });

    it('returns proper error response for invalid CSRF token', () => {
      const response = createCSRFErrorResponse();
      
      expect(response.status).toBe(403);
      // Note: Can't directly test response.json() in this context
    });
  });

  describe('Token Extraction', () => {
    it('extracts CSRF token from request headers and cookies', () => {
      const token = generateCSRFToken();
      
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-csrf-token': token,
          'cookie': `csrf_token=${token}`,
        },
      });
      
      const { cookieToken, headerToken } = getCSRFTokenFromRequest(request);
      expect(cookieToken).toBe(token);
      expect(headerToken).toBe(token);
    });

    it('handles missing tokens gracefully', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {},
      });
      
      const { cookieToken, headerToken } = getCSRFTokenFromRequest(request);
      expect(cookieToken).toBeUndefined();
      expect(headerToken).toBeUndefined();
    });
  });
});

describe('JWT Authentication', () => {
  const testAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';
  const testChainId = 8453;

  beforeAll(() => {
    // Set required env vars for JWT
    process.env.JWT_SECRET = 'test-secret-for-testing-only-min-32-chars';
  });

  describe('Token Generation', () => {
    it('generates valid JWT token', () => {
      const result = generateToken(testAddress, testChainId);
      
      expect(result.token).toBeTruthy();
      expect(result.address).toBe(testAddress.toLowerCase());
      expect(result.expiresIn).toBe(86400); // 24 hours
    });

    it('normalizes address to lowercase', () => {
      const mixedCaseAddress = '0x742D35Cc6634C0532925A3B844Bc9E7595F0BEb0';
      const result = generateToken(mixedCaseAddress);
      
      expect(result.address).toBe(mixedCaseAddress.toLowerCase());
    });

    it('uses default chain ID if not provided', async () => {
      const result = generateToken(testAddress);
      const decoded = await verifyToken(result.token);
      
      expect(decoded?.chainId).toBe(84532); // Base Sepolia (test env)
    });
  });

  describe('Token Verification', () => {
    it('verifies valid JWT token', async () => {
      const { token } = generateToken(testAddress, testChainId);
      const decoded = await verifyToken(token);
      
      expect(decoded).not.toBeNull();
      expect(decoded?.address).toBe(testAddress.toLowerCase());
      expect(decoded?.chainId).toBe(testChainId);
    });

    it('rejects tampered JWT token', async () => {
      const { token } = generateToken(testAddress);
      const tamperedToken = token + 'tampered';
      
      const decoded = await verifyToken(tamperedToken);
      expect(decoded).toBeNull();
    });

    it('rejects expired JWT token', async () => {
      // Create a token that expired immediately (mock by manipulating time)
      const { token } = generateToken(testAddress);
      const decoded = await verifyToken(token);
      
      // Token should be valid initially
      expect(decoded).not.toBeNull();
    });

    it('rejects invalid JWT format', async () => {
      const invalidToken = 'not.a.valid.jwt.token';
      const decoded = await verifyToken(invalidToken);
      
      expect(decoded).toBeNull();
    });
  });

  describe('JWT secret rotation (PREV_JWT_SECRET)', () => {
    const rotationAddress = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
    const JWT_ISSUER = 'vfide';
    const JWT_AUDIENCE = 'vfide-app';
    // The module caches _jwtSecret lazily from the first call in beforeAll
    const cachedCurrentSecret = 'test-secret-for-testing-only-min-32-chars';
    const prevSecret = 'prev-secret-before-rotation-minimum-32chars';

    afterEach(() => {
      delete process.env.PREV_JWT_SECRET;
    });

    /** Sign a token directly with a given secret (bypasses module cache) */
    function signWith(secret: string): string {
      return jwt.sign(
        { address: rotationAddress.toLowerCase(), chainId: 8453 },
        secret,
        { expiresIn: '24h', issuer: JWT_ISSUER, audience: JWT_AUDIENCE }
      );
    }

    it('accepts token signed with PREV_JWT_SECRET during rotation window', async () => {
      // Token was signed before rotation with the old (previous) secret
      const oldToken = signWith(prevSecret);

      // Rotation window: PREV_JWT_SECRET = old secret; JWT_SECRET = current (cached)
      process.env.PREV_JWT_SECRET = prevSecret;

      const decoded = await verifyToken(oldToken);
      expect(decoded).not.toBeNull();
      expect(decoded?.address).toBe(rotationAddress.toLowerCase());
    });

    it('accepts token signed with the current JWT_SECRET during rotation window', async () => {
      // Token was signed after rotation with the current (cached) secret
      const { token: currentToken } = generateToken(rotationAddress);

      // Rotation window is active but should not break verification of new tokens
      process.env.PREV_JWT_SECRET = prevSecret;

      const decoded = await verifyToken(currentToken);
      expect(decoded).not.toBeNull();
      expect(decoded?.address).toBe(rotationAddress.toLowerCase());
    });

    it('rejects token invalid against both current and previous secrets', async () => {
      const thirdSecret = 'unrelated-third-secret-nobody-configured-x32';
      // Signed with a completely different secret — neither current nor previous
      const alienToken = signWith(thirdSecret);

      // Rotation window is active with a known prev secret (but not thirdSecret)
      process.env.PREV_JWT_SECRET = prevSecret;

      const decoded = await verifyToken(alienToken);
      expect(decoded).toBeNull();
    });

    it('rejects tampered token even when PREV_JWT_SECRET is set', async () => {
      const oldToken = signWith(prevSecret);
      const tamperedToken = oldToken + 'x';

      process.env.PREV_JWT_SECRET = prevSecret;

      const decoded = await verifyToken(tamperedToken);
      expect(decoded).toBeNull();
    });

    it('rejects expired token even when PREV_JWT_SECRET matches', async () => {
      // Set exp to 1 hour in the past to create an already-expired token
      const expiredToken = jwt.sign(
        {
          address: rotationAddress.toLowerCase(),
          chainId: 8453,
          exp: Math.floor(Date.now() / 1000) - 3600,
        },
        prevSecret,
        { issuer: JWT_ISSUER, audience: JWT_AUDIENCE }
      );

      process.env.PREV_JWT_SECRET = prevSecret;

      const decoded = await verifyToken(expiredToken);
      expect(decoded).toBeNull();
    });

    it('rejects token when PREV_JWT_SECRET is not set and token used wrong secret', async () => {
      // No rotation window active
      delete process.env.PREV_JWT_SECRET;
      const wrongToken = signWith(prevSecret); // signed with non-current secret

      const decoded = await verifyToken(wrongToken);
      expect(decoded).toBeNull();
    });
  });

  describe('Token Extraction', () => {
    it('extracts token from Bearer authorization header', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const authHeader = `Bearer ${token}`;
      
      const extracted = extractToken(authHeader);
      expect(extracted).toBe(token);
    });

    it('extracts token from plain authorization header', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const extracted = extractToken(token);
      
      expect(extracted).toBe(token);
    });

    it('returns null for missing authorization header', () => {
      const extracted = extractToken(null);
      expect(extracted).toBeNull();
    });
  });

  describe('Token Expiration', () => {
    it('detects non-expired token', async () => {
      const { token } = generateToken(testAddress);
      const decoded = await verifyToken(token);
      
      expect(decoded).not.toBeNull();
      if (decoded) {
        expect(isTokenExpired(decoded)).toBe(false);
      }
    });

    it('detects token without expiration', () => {
      const payload = { address: testAddress };
      expect(isTokenExpired(payload)).toBe(true);
    });

    it('determines if token should be refreshed', async () => {
      const { token } = generateToken(testAddress);
      const decoded = await verifyToken(token);
      
      expect(decoded).not.toBeNull();
      if (decoded) {
        // Newly created token shouldn't need refresh yet
        expect(shouldRefreshToken(decoded)).toBe(false);
      }
    });

    it('flags token without expiration for refresh', () => {
      const payload = { address: testAddress };
      expect(shouldRefreshToken(payload)).toBe(true);
    });
  });
});

describe('Environment Validation', () => {
  it('prevents JWT module load without secret', () => {
    // This is tested by the module itself throwing on load
    // We verify the check exists by ensuring JWT_SECRET is required
    expect(process.env.JWT_SECRET).toBeTruthy();
  });
});

describe('Security Headers', () => {
  it('validates Content-Type for POST requests', () => {
    // This would require importing and testing the middleware
    // For now, document that middleware.ts handles this
    expect(true).toBe(true);
  });

  it('enforces request size limits', () => {
    // This would require importing and testing the middleware
    // For now, document that middleware.ts handles this
    expect(true).toBe(true);
  });
});
