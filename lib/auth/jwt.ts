/**
 * JWT Authentication Module
 * Secure token generation and verification using HMAC-SHA256
 */

import jwt from 'jsonwebtoken';
import { isTokenRevoked, hashToken, isUserRevoked, revokeToken } from './tokenRevocation';

// JWT Configuration
// No fallback secret - fail fast if not set
function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error(
      'JWT_SECRET or NEXTAUTH_SECRET environment variable must be set. ' +
      'Please add it to your .env.local file for development or configure it in your deployment environment for production.'
    );
  }

  // Enforce minimum secret strength
  if (secret.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'JWT_SECRET must be at least 32 characters long for adequate security. ' +
        'Current length: ' + secret.length
      );
    } else {
      console.warn(
        '[JWT] WARNING: JWT_SECRET is shorter than 32 characters (' + secret.length + ' chars). ' +
        'This is insecure and will be rejected in production.'
      );
    }
  }

  return secret;
}

// Lazy-load JWT secret to avoid build-time errors
let _jwtSecret: string | null = null;
function getSecret(): string {
  if (!_jwtSecret) {
    _jwtSecret = getJWTSecret();
  }
  return _jwtSecret;
}

const JWT_ACCESS_EXPIRES_IN = '1h';
const JWT_REFRESH_EXPIRES_IN = '7d';
const JWT_ISSUER = 'vfide';
const JWT_AUDIENCE = 'vfide-app';

export interface JWTPayload {
  address: string;
  chainId?: number;
  type?: 'access' | 'refresh';
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

export interface TokenResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
  address: string;
}

/**
 * Generate access + refresh token pair for authenticated users
 */
export function generateToken(address: string, chainId?: number): TokenResponse {
  const basePayload = {
    address: address.toLowerCase(),
    chainId: chainId || 8453,
  };

  const token = jwt.sign({ ...basePayload, type: 'access' }, getSecret(), {
    expiresIn: JWT_ACCESS_EXPIRES_IN,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });

  const refreshToken = jwt.sign({ ...basePayload, type: 'refresh' }, getSecret(), {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });

  return {
    token,
    refreshToken,
    expiresIn: 3600, // 1 hour in seconds
    address: address.toLowerCase(),
  };
}

/**
 * Refresh an access token using a valid refresh token
 */
export async function refreshAccessToken(refreshTokenStr: string): Promise<TokenResponse | null> {
  try {
    const decoded = jwt.verify(refreshTokenStr, getSecret(), {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as JWTPayload;

    if (decoded.type !== 'refresh') {
      return null;
    }

    // Check revocation
    const tokenHash = await hashToken(refreshTokenStr);
    if (await isTokenRevoked(tokenHash)) {
      return null;
    }
    const userRevocation = await isUserRevoked(decoded.address);
    if (userRevocation?.revoked) {
      return null;
    }

    // Issue new token pair
    const newTokens = generateToken(decoded.address, decoded.chainId);

    // Revoke the old refresh token to prevent reuse (token rotation)
    await revokeToken(tokenHash, decoded.exp || 0, 'token_rotation');

    return newTokens;
  } catch {
    return null;
  }
}

/**
 * Verify and decode a JWT token
 * Also checks if token has been revoked
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const decoded = jwt.verify(token, getSecret(), {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as JWTPayload;

    // Check if token has been revoked
    const tokenHash = await hashToken(token);
    const revoked = await isTokenRevoked(tokenHash);
    
    if (revoked) {
      console.warn('[JWT] Token has been revoked');
      return null;
    }

    const userRevocation = await isUserRevoked(decoded.address);
    if (userRevocation?.revoked) {
      console.warn('[JWT] User tokens have been revoked');
      return null;
    }

    return decoded;
  } catch (error) {
    console.error('[JWT] Token verification failed:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  
  // Support both "Bearer <token>" and just "<token>"
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  
  return authHeader;
}

/**
 * Check if token is expired
 */
export function isTokenExpired(payload: JWTPayload): boolean {
  if (!payload.exp) return true;
  return Date.now() >= payload.exp * 1000;
}

/**
 * Refresh token if it's close to expiring (within 10 minutes of 1h access token)
 */
export function shouldRefreshToken(payload: JWTPayload): boolean {
  if (!payload.exp) return true;
  const tenMinutesFromNow = Date.now() + 600000;
  return payload.exp * 1000 < tenMinutesFromNow;
}
