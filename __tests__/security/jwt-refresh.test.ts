/**
 * Tests for JWT refresh token audit fix
 * Verifies: short access tokens, refresh flow, token type separation
 */

import jwt from 'jsonwebtoken';

// Set JWT secret before importing
process.env.JWT_SECRET = 'test-secret-key-32-chars-minimum!';

import {
  generateToken,
  verifyToken,
  refreshAccessToken,
  shouldRefreshToken,
  isTokenExpired,
} from '@/lib/auth/jwt';
import type { JWTPayload, TokenResponse } from '@/lib/auth/jwt';

describe('JWT Refresh Token - Audit Fixes', () => {
  const testAddress = '0x1234567890abcdef1234567890abcdef12345678';
  const testChainId = 8453;

  describe('generateToken', () => {
    it('should return both access and refresh tokens', () => {
      const result: TokenResponse = generateToken(testAddress, testChainId);

      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.token).not.toBe(result.refreshToken);
      expect(result.address).toBe(testAddress.toLowerCase());
      expect(result.expiresIn).toBe(3600); // 1 hour, not 24h
    });

    it('should generate access token with type=access', () => {
      const result = generateToken(testAddress);
      const decoded = jwt.decode(result.token) as JWTPayload;

      expect(decoded.type).toBe('access');
      expect(decoded.address).toBe(testAddress.toLowerCase());
    });

    it('should generate refresh token with type=refresh', () => {
      const result = generateToken(testAddress);
      const decoded = jwt.decode(result.refreshToken) as JWTPayload;

      expect(decoded.type).toBe('refresh');
      expect(decoded.address).toBe(testAddress.toLowerCase());
    });

    it('should set access token expiry to 1 hour', () => {
      const result = generateToken(testAddress);
      const decoded = jwt.decode(result.token) as JWTPayload;

      const expectedExpiry = Math.floor(Date.now() / 1000) + 3600;
      // Allow 5 second tolerance
      expect(decoded.exp).toBeGreaterThan(expectedExpiry - 5);
      expect(decoded.exp).toBeLessThan(expectedExpiry + 5);
    });

    it('should set refresh token expiry to 7 days', () => {
      const result = generateToken(testAddress);
      const decoded = jwt.decode(result.refreshToken) as JWTPayload;

      const expectedExpiry = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;
      // Allow 5 second tolerance
      expect(decoded.exp).toBeGreaterThan(expectedExpiry - 5);
      expect(decoded.exp).toBeLessThan(expectedExpiry + 5);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid access token', async () => {
      const result = generateToken(testAddress, testChainId);
      const payload = await verifyToken(result.token);

      expect(payload).not.toBeNull();
      expect(payload!.address).toBe(testAddress.toLowerCase());
      expect(payload!.type).toBe('access');
    });

    it('should reject an expired token', async () => {
      const expiredToken = jwt.sign(
        { address: testAddress, type: 'access' },
        process.env.JWT_SECRET!,
        { expiresIn: '0s', issuer: 'vfide', audience: 'vfide-app' }
      );

      // Wait a moment for expiry
      await new Promise(r => setTimeout(r, 100));
      const payload = await verifyToken(expiredToken);
      expect(payload).toBeNull();
    });

    it('should reject a token with wrong secret', async () => {
      const badToken = jwt.sign(
        { address: testAddress, type: 'access' },
        'wrong-secret',
        { expiresIn: '1h', issuer: 'vfide', audience: 'vfide-app' }
      );

      const payload = await verifyToken(badToken);
      expect(payload).toBeNull();
    });
  });

  describe('refreshAccessToken', () => {
    it('should issue new tokens from a valid refresh token', async () => {
      const original = generateToken(testAddress, testChainId);
      const refreshed = await refreshAccessToken(original.refreshToken);

      expect(refreshed).not.toBeNull();
      expect(refreshed!.token).toBeDefined();
      expect(refreshed!.refreshToken).toBeDefined();
      expect(refreshed!.address).toBe(testAddress.toLowerCase());
      expect(refreshed!.expiresIn).toBe(3600);

      // Verify the new access token is valid and has correct type
      const decoded = jwt.decode(refreshed!.token) as JWTPayload;
      expect(decoded.type).toBe('access');
      expect(decoded.address).toBe(testAddress.toLowerCase());
    });

    it('should reject an access token used as refresh token', async () => {
      const result = generateToken(testAddress);
      const refreshed = await refreshAccessToken(result.token);

      expect(refreshed).toBeNull();
    });

    it('should reject an invalid refresh token', async () => {
      const refreshed = await refreshAccessToken('invalid-token');
      expect(refreshed).toBeNull();
    });

    it('should reject a refresh token with wrong audience', async () => {
      const badRefresh = jwt.sign(
        { address: testAddress, type: 'refresh' },
        process.env.JWT_SECRET!,
        { expiresIn: '7d', issuer: 'vfide', audience: 'wrong-audience' }
      );

      const refreshed = await refreshAccessToken(badRefresh);
      expect(refreshed).toBeNull();
    });
  });

  describe('shouldRefreshToken', () => {
    it('should return true when token expires within 10 minutes', () => {
      const payload: JWTPayload = {
        address: testAddress,
        exp: Math.floor(Date.now() / 1000) + 5 * 60, // 5 min from now
      };
      expect(shouldRefreshToken(payload)).toBe(true);
    });

    it('should return false when token has more than 10 minutes left', () => {
      const payload: JWTPayload = {
        address: testAddress,
        exp: Math.floor(Date.now() / 1000) + 30 * 60, // 30 min from now
      };
      expect(shouldRefreshToken(payload)).toBe(false);
    });

    it('should return true when no exp is set', () => {
      const payload: JWTPayload = { address: testAddress };
      expect(shouldRefreshToken(payload)).toBe(true);
    });
  });

  describe('isTokenExpired', () => {
    it('should return true for expired tokens', () => {
      const payload: JWTPayload = {
        address: testAddress,
        exp: Math.floor(Date.now() / 1000) - 60, // 1 min ago
      };
      expect(isTokenExpired(payload)).toBe(true);
    });

    it('should return false for valid tokens', () => {
      const payload: JWTPayload = {
        address: testAddress,
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      expect(isTokenExpired(payload)).toBe(false);
    });
  });
});
