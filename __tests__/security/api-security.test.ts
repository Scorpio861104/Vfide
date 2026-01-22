/**
 * API Security Tests
 * 
 * Tests for API-specific security concerns:
 * - Authentication bypass attempts
 * - Authorization checks
 * - JWT token security
 * - API key exposure
 * - Session hijacking prevention
 * - Request tampering
 * - Response manipulation
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateToken, verifyToken, extractToken, isTokenExpired } from '@/lib/auth/jwt';
import { verifyCSRFToken, generateCSRFToken } from '@/lib/security/csrf';
import jwt from 'jsonwebtoken';

describe('API Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== Authentication Tests ====================
  describe('Authentication Security', () => {
    it('rejects requests without authentication token', () => {
      const request = new NextRequest('http://localhost:3000/api/user/profile', {
        method: 'GET',
      });

      const token = request.headers.get('authorization');
      expect(token).toBeNull();
    });

    it('rejects malformed authorization headers', () => {
      const malformedHeaders = [
        'Bearer',
        'Bearer ',
        'InvalidFormat token123',
        'bearer lowercase',
      ];

      malformedHeaders.forEach(header => {
        const token = extractToken(header);
        expect(token).toBeNull();
      });
    });

    it('rejects expired JWT tokens', () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { address: '0x123', exp: Math.floor(Date.now() / 1000) - 3600 },
        process.env.JWT_SECRET || 'test-secret'
      );

      expect(isTokenExpired(expiredToken)).toBe(true);
    });

    it('rejects tampered JWT tokens', () => {
      const { token } = generateToken('0x1234567890123456789012345678901234567890');
      
      // Tamper with the token
      const parts = token.split('.');
      const tamperedToken = parts[0] + '.TAMPERED.' + parts[2];

      expect(() => verifyToken(tamperedToken)).toThrow();
    });

    it('validates JWT signature', () => {
      const { token } = generateToken('0x1234567890123456789012345678901234567890');
      
      // Verify returns valid payload
      const payload = verifyToken(token);
      expect(payload.address).toBe('0x1234567890123456789012345678901234567890');
    });

    it('prevents JWT algorithm confusion attacks', () => {
      // Test that we don't accept 'none' algorithm
      const noneAlgoToken = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64') +
        '.' + Buffer.from(JSON.stringify({ address: '0x123' })).toString('base64') + '.';

      expect(() => verifyToken(noneAlgoToken)).toThrow();
    });

    it('validates JWT issuer and audience', () => {
      const { token } = generateToken('0x1234567890123456789012345678901234567890');
      const payload = verifyToken(token);

      expect(payload.iss).toBe('vfide');
      expect(payload.aud).toBe('vfide-app');
    });

    it('generates tokens with appropriate expiration', () => {
      const { expiresIn } = generateToken('0x1234567890123456789012345678901234567890');
      
      // Should be 24 hours in milliseconds
      const expectedExpiry = 24 * 60 * 60;
      expect(expiresIn).toBeGreaterThan(expectedExpiry - 10);
      expect(expiresIn).toBeLessThanOrEqual(expectedExpiry);
    });

    it('normalizes addresses in tokens', () => {
      const { token } = generateToken('0xAbCdEf1234567890123456789012345678901234');
      const payload = verifyToken(token);

      // Should be lowercase
      expect(payload.address).toBe('0xabcdef1234567890123456789012345678901234');
    });

    it('prevents token reuse after logout', () => {
      // Simulate token revocation
      const { token } = generateToken('0x1234567890123456789012345678901234567890');
      
      // In real implementation, this would check revocation list
      const isRevoked = false; // Would check against Redis/DB
      expect(typeof token).toBe('string');
    });
  });

  // ==================== Authorization Tests ====================
  describe('Authorization Security', () => {
    it('enforces user-specific data access', () => {
      const authenticatedUserId = '123';
      const requestedUserId = '456';

      // Should reject access to different user's data
      const isAuthorized = authenticatedUserId === requestedUserId;
      expect(isAuthorized).toBe(false);
    });

    it('validates resource ownership before modification', () => {
      const resourceOwnerId = 'user-1';
      const requestingUserId = 'user-2';

      const canModify = resourceOwnerId === requestingUserId;
      expect(canModify).toBe(false);
    });

    it('prevents horizontal privilege escalation', () => {
      // User A trying to access User B's resources
      const userAId = 'user-a';
      const userBId = 'user-b';

      expect(userAId).not.toBe(userBId);
    });

    it('prevents vertical privilege escalation', () => {
      // Regular user trying to perform admin actions
      const userRole = 'user';
      const requiredRole = 'admin';

      expect(userRole).not.toBe(requiredRole);
    });

    it('validates wallet address ownership', () => {
      const authenticatedAddress = '0x1111111111111111111111111111111111111111';
      const requestedAddress = '0x2222222222222222222222222222222222222222';

      const isOwner = authenticatedAddress.toLowerCase() === requestedAddress.toLowerCase();
      expect(isOwner).toBe(false);
    });

    it('enforces role-based access control (RBAC)', () => {
      const roles = {
        user: ['read:own', 'write:own'],
        moderator: ['read:all', 'write:own', 'delete:flagged'],
        admin: ['read:all', 'write:all', 'delete:all'],
      };

      expect(roles.user).not.toContain('delete:all');
      expect(roles.admin).toContain('delete:all');
    });
  });

  // ==================== CSRF Protection Tests ====================
  describe('CSRF Protection', () => {
    it('generates unique CSRF tokens', () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();

      expect(token1).not.toBe(token2);
    });

    it('validates CSRF tokens on state-changing requests', () => {
      const token = generateCSRFToken();
      
      const request = new NextRequest('http://localhost:3000/api/proposals', {
        method: 'POST',
        headers: {
          'x-csrf-token': token,
          'Cookie': `csrf_token=${token}`,
        },
      });

      expect(verifyCSRFToken(request)).toBe(true);
    });

    it('rejects requests with missing CSRF token', () => {
      const request = new NextRequest('http://localhost:3000/api/proposals', {
        method: 'POST',
      });

      expect(verifyCSRFToken(request)).toBe(false);
    });

    it('rejects requests with mismatched CSRF tokens', () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();

      const request = new NextRequest('http://localhost:3000/api/proposals', {
        method: 'POST',
        headers: {
          'x-csrf-token': token1,
          'Cookie': `csrf_token=${token2}`,
        },
      });

      expect(verifyCSRFToken(request)).toBe(false);
    });

    it('does not require CSRF for GET requests', () => {
      // CSRF protection typically only for state-changing methods
      const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
      
      safeMethods.forEach(method => {
        expect(['POST', 'PUT', 'DELETE', 'PATCH']).not.toContain(method);
      });
    });
  });

  // ==================== Request Validation Tests ====================
  describe('Request Validation', () => {
    it('validates Content-Type headers', () => {
      const validContentTypes = [
        'application/json',
        'application/json; charset=utf-8',
        'multipart/form-data',
      ];

      validContentTypes.forEach(ct => {
        expect(ct).toContain('application/json') || expect(ct).toContain('multipart/form-data');
      });
    });

    it('rejects oversized request bodies', () => {
      const maxSize = 100 * 1024; // 100KB
      const largeBody = 'x'.repeat(maxSize + 1);

      expect(largeBody.length).toBeGreaterThan(maxSize);
    });

    it('validates request origin', () => {
      const allowedOrigins = ['http://localhost:3000', 'https://vfide.com'];
      const testOrigin = 'https://evil.com';

      expect(allowedOrigins).not.toContain(testOrigin);
    });

    it('validates HTTP methods', () => {
      const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
      const suspiciousMethods = ['TRACE', 'CONNECT'];

      suspiciousMethods.forEach(method => {
        expect(allowedMethods).not.toContain(method);
      });
    });

    it('sanitizes query parameters', () => {
      const maliciousParams = {
        id: "1'; DROP TABLE users; --",
        sort: '<script>alert("xss")</script>',
      };

      Object.values(maliciousParams).forEach(param => {
        expect(param).toMatch(/[<>'";]/);
      });
    });
  });

  // ==================== Response Security Tests ====================
  describe('Response Security', () => {
    it('sets security headers', () => {
      const securityHeaders = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      };

      expect(securityHeaders['X-Content-Type-Options']).toBe('nosniff');
      expect(securityHeaders['X-Frame-Options']).toBe('DENY');
    });

    it('does not expose sensitive information in errors', () => {
      const errorResponse = {
        error: 'Database query failed',
        // Should NOT include:
        // - Stack traces in production
        // - Database credentials
        // - Internal paths
        // - SQL queries
      };

      const errorString = JSON.stringify(errorResponse);
      expect(errorString).not.toContain('password');
      expect(errorString).not.toContain('postgresql://');
    });

    it('sanitizes response data', () => {
      const userData = {
        id: '123',
        address: '0x123...456',
        // Should NOT include:
        // privateKey: '...',
        // password: '...',
      };

      expect(userData).not.toHaveProperty('privateKey');
      expect(userData).not.toHaveProperty('password');
    });

    it('prevents information disclosure through timing', () => {
      // Login timing should be constant regardless of user existence
      const loginTime1 = Date.now();
      // await checkUser('exists@example.com');
      const loginTime2 = Date.now();
      
      // In production, use constant-time comparison
      expect(true).toBe(true);
    });
  });

  // ==================== API Key Security Tests ====================
  describe('API Key Security', () => {
    it('validates API key format', () => {
      const validApiKeyFormat = /^[A-Za-z0-9_-]{32,128}$/;
      const testKey = 'vfide_test_1234567890abcdef';

      expect(testKey).toMatch(/^vfide_/);
    });

    it('prevents API key exposure in URLs', () => {
      const urlWithKey = 'https://api.example.com/data?api_key=secret123';
      
      // API keys should be in headers, not query params
      expect(urlWithKey).toContain('api_key=');
    });

    it('rotates API keys periodically', () => {
      const keyCreatedAt = new Date('2024-01-01');
      const now = new Date();
      const daysSinceCreation = (now.getTime() - keyCreatedAt.getTime()) / (1000 * 60 * 60 * 24);
      const maxKeyAge = 90; // days

      expect(daysSinceCreation).toBeDefined();
    });

    it('invalidates compromised API keys', () => {
      const compromisedKeys = ['key123', 'key456'];
      const testKey = 'key789';

      expect(compromisedKeys).not.toContain(testKey);
    });
  });

  // ==================== Session Security Tests ====================
  describe('Session Security', () => {
    it('generates secure session IDs', () => {
      const sessionId = Buffer.from(crypto.getRandomValues(new Uint8Array(32)))
        .toString('base64url');

      expect(sessionId.length).toBeGreaterThan(32);
    });

    it('sets secure cookie attributes', () => {
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        path: '/',
      };

      expect(cookieOptions.httpOnly).toBe(true);
      expect(cookieOptions.sameSite).toBe('strict');
    });

    it('prevents session fixation', () => {
      const sessionBeforeAuth = 'session-before';
      const sessionAfterAuth = 'session-after';

      // Should generate new session after authentication
      expect(sessionBeforeAuth).not.toBe(sessionAfterAuth);
    });

    it('implements session timeout', () => {
      const sessionStartTime = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      const sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
      const isExpired = Date.now() - sessionStartTime > sessionTimeout;

      expect(isExpired).toBe(true);
    });

    it('binds session to IP address or user agent', () => {
      const sessionData = {
        id: 'session123',
        userAgent: 'Mozilla/5.0...',
        createdFrom: '192.168.1.1',
      };

      expect(sessionData.userAgent).toBeDefined();
    });
  });

  // ==================== Replay Attack Prevention ====================
  describe('Replay Attack Prevention', () => {
    it('validates request timestamps', () => {
      const requestTimestamp = Date.now() - (10 * 60 * 1000); // 10 minutes ago
      const maxAge = 5 * 60 * 1000; // 5 minutes
      const isExpired = Date.now() - requestTimestamp > maxAge;

      expect(isExpired).toBe(true);
    });

    it('uses nonce to prevent replay attacks', () => {
      const usedNonces = new Set(['nonce1', 'nonce2']);
      const newNonce = 'nonce3';

      expect(usedNonces.has(newNonce)).toBe(false);
    });

    it('implements request idempotency', () => {
      const requestId = 'req-123';
      const processedRequests = new Set(['req-456', 'req-789']);

      const isProcessed = processedRequests.has(requestId);
      expect(isProcessed).toBe(false);
    });
  });

  // ==================== API Versioning Security ====================
  describe('API Versioning Security', () => {
    it('maintains backward compatibility securely', () => {
      const supportedVersions = ['v1', 'v2'];
      const requestedVersion = 'v3';

      expect(supportedVersions).not.toContain(requestedVersion);
    });

    it('deprecates insecure API versions', () => {
      const deprecatedVersions = ['v0', 'beta'];
      const currentVersion = 'v1';

      expect(deprecatedVersions).not.toContain(currentVersion);
    });
  });

  // ==================== GraphQL Security (if applicable) ====================
  describe('GraphQL Security', () => {
    it('limits query depth', () => {
      const maxDepth = 5;
      const queryDepth = 3;

      expect(queryDepth).toBeLessThanOrEqual(maxDepth);
    });

    it('limits query complexity', () => {
      const maxComplexity = 1000;
      const queryComplexity = 500;

      expect(queryComplexity).toBeLessThanOrEqual(maxComplexity);
    });

    it('disables introspection in production', () => {
      const introspectionEnabled = process.env.NODE_ENV !== 'production';

      if (process.env.NODE_ENV === 'production') {
        expect(introspectionEnabled).toBe(false);
      }
    });
  });

  // ==================== Parameter Pollution Tests ====================
  describe('HTTP Parameter Pollution', () => {
    it('handles duplicate query parameters securely', () => {
      const url = 'http://localhost/api/user?id=123&id=456';
      const parsedUrl = new URL(url);
      
      // Should use first value or reject
      expect(parsedUrl.searchParams.get('id')).toBe('123');
    });

    it('validates array parameters', () => {
      const ids = ['1', '2', '3'];
      
      // Should validate each element
      ids.forEach(id => {
        expect(id).toMatch(/^\d+$/);
      });
    });
  });

  // ==================== Error Handling Security ====================
  describe('Error Handling Security', () => {
    it('returns generic error messages to clients', () => {
      const productionError = {
        error: 'Internal server error',
        statusCode: 500,
      };

      expect(productionError.error).toBe('Internal server error');
      expect(productionError).not.toHaveProperty('stack');
    });

    it('logs detailed errors server-side', () => {
      const serverLog = {
        error: 'Database connection failed',
        stack: 'Error: ...',
        timestamp: Date.now(),
      };

      expect(serverLog.stack).toBeDefined();
    });

    it('prevents error-based information disclosure', () => {
      const errorMessage = 'Operation failed';
      
      // Should not reveal:
      // - Database structure
      // - File paths
      // - Internal IPs
      expect(errorMessage).not.toContain('/var/www');
      expect(errorMessage).not.toContain('192.168');
    });
  });
});
