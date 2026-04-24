/**
 * JWT Authentication Module
 * Secure token generation and verification using HMAC-SHA256
 *
 * Zero-downtime secret rotation:
 *   1. Generate a new secret: openssl rand -base64 32
 *   2. Set PREV_JWT_SECRET=<old value of JWT_SECRET> in your environment
 *   3. Set JWT_SECRET=<new secret>
 *   4. Deploy — new tokens use the new secret; existing tokens are still accepted
 *      via PREV_JWT_SECRET during the transition window (max 24 h until all
 *      old tokens expire naturally).
 *   5. After 24 h, remove PREV_JWT_SECRET from the environment.
 */

import jwt from 'jsonwebtoken';
import { isTokenRevoked, hashToken, isUserRevoked } from './tokenRevocation';
import { logger } from '@/lib/logger';

// JWT Configuration
// No fallback secret - fail fast if not set
function getJWTSecret(): string {
  const jwtSecret = process.env.JWT_SECRET;
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;

  // F-10 FIX: Fail if both secrets are set with different values to prevent
  // signing/verification inconsistency depending on module initialization order.
  if (jwtSecret && nextAuthSecret && jwtSecret !== nextAuthSecret) {
    throw new Error(
      'Both JWT_SECRET and NEXTAUTH_SECRET are set with different values. Use only one.'
    );
  }

  const secret = jwtSecret || nextAuthSecret;
  if (!secret) {
    throw new Error(
      'JWT_SECRET or NEXTAUTH_SECRET environment variable must be set. ' +
      'Please add it to your .env.local file for development or configure it in your deployment environment for production.'
    );
  }
  return secret;
}

/**
 * Return the previous (rotated-out) secret, if configured.
 * Only present during a rolling rotation window.
 */
function getPrevSecret(): string | null {
  return process.env.PREV_JWT_SECRET || null;
}

// Lazy-load JWT secret to avoid build-time errors
let _jwtSecret: string | null = null;
function getSecret(): string {
  if (!_jwtSecret) {
    _jwtSecret = getJWTSecret();
  }
  return _jwtSecret;
}

const JWT_EXPIRES_IN = '24h';
const JWT_ISSUER = 'vfide';
const JWT_AUDIENCE = 'vfide-app';

export interface JWTPayload {
  address: string;
  chainId?: number;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

export interface TokenResponse {
  token: string;
  expiresIn: number;
  address: string;
}

/**
 * Generate a secure JWT token for authenticated users.
 * Always signs with the current JWT_SECRET.
 */
export function generateToken(address: string, chainId?: number): TokenResponse {
  const envChainId = Number.parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '', 10);
  const resolvedChainId = chainId ?? (Number.isFinite(envChainId) ? envChainId : undefined);
  if (resolvedChainId === undefined) {
    throw new Error('chainId is required when generating JWT tokens');
  }

  const payload: JWTPayload = {
    address: address.toLowerCase(),
    chainId: resolvedChainId,
  };

  const token = jwt.sign(payload, getSecret(), {
    expiresIn: JWT_EXPIRES_IN,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });

  return {
    token,
    expiresIn: 86400, // 24 hours in seconds
    address: address.toLowerCase(),
  };
}

/**
 * Verify and decode a JWT token.
 * Tries the current secret first; falls back to PREV_JWT_SECRET during a
 * rotation window so that existing sessions are not invalidated immediately.
 * Also checks if the token has been explicitly revoked.
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  const verifyOptions = { issuer: JWT_ISSUER, audience: JWT_AUDIENCE };

  // Try the current secret first
  let decoded: JWTPayload | null = null;
  try {
    decoded = jwt.verify(token, getSecret(), verifyOptions) as JWTPayload;
  } catch (currentErr) {
    // If verification fails with the current secret, try the previous one
    // (present only during a rotation window)
    const prevSecret = getPrevSecret();
    if (prevSecret) {
      try {
        decoded = jwt.verify(token, prevSecret, verifyOptions) as JWTPayload;
      } catch (prevErr) {
        // Token is invalid against both secrets
        logger.error('[JWT] Token verification failed against both current and previous secrets:',
          prevErr instanceof Error ? prevErr.message : 'Unknown error');
      }
    } else {
      logger.error('[JWT] Token verification failed:',
        currentErr instanceof Error ? currentErr.message : 'Unknown error');
    }
  }

  if (!decoded) {
    return null;
  }

  // Check if token has been revoked.
  // In test environments without Redis configured, allow verification to proceed.
  try {
    const tokenHash = await hashToken(token);
    const revoked = await isTokenRevoked(tokenHash);

    if (revoked) {
      logger.warn('[JWT] Token has been revoked');
      return null;
    }

    // Enforce account-level revocation ("logout all sessions").
    const userRevocation = await isUserRevoked(decoded.address);
    if (userRevocation?.revoked) {
      const revokedAt = userRevocation.revokedAt ?? 0;
      const issuedAt = decoded.iat ?? 0;
      if (revokedAt > issuedAt) {
        logger.warn('[JWT] User-level token revocation is newer than token iat');
        return null;
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      throw error;
    }
    logger.warn('[JWT] Skipping token revocation check in test environment', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return decoded;
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
 * Refresh token if it's close to expiring (within 1 hour)
 */
export function shouldRefreshToken(payload: JWTPayload): boolean {
  if (!payload.exp) return true;
  const oneHourFromNow = Date.now() + 3600000;
  return payload.exp * 1000 < oneHourFromNow;
}
