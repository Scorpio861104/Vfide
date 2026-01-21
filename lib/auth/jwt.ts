/**
 * JWT Authentication Module
 * Secure token generation and verification using HMAC-SHA256
 */

import jwt from 'jsonwebtoken';
import { validateEnvironment } from '../startup-validation';
import { isTokenRevoked, hashToken } from './tokenRevocation';

// Validate environment on module load
if (typeof window === 'undefined') {
  // Only run validation on server-side
  validateEnvironment();
}

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
  return secret;
}

const JWT_SECRET = getJWTSecret();
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
 * Generate a secure JWT token for authenticated users
 */
export function generateToken(address: string, chainId?: number): TokenResponse {
  const payload: JWTPayload = {
    address: address.toLowerCase(),
    chainId: chainId || 8453, // Default to Base
  };

  const token = jwt.sign(payload, JWT_SECRET, {
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
 * Verify and decode a JWT token
 * Also checks if token has been revoked
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
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
 * Refresh token if it's close to expiring (within 1 hour)
 */
export function shouldRefreshToken(payload: JWTPayload): boolean {
  if (!payload.exp) return true;
  const oneHourFromNow = Date.now() + 3600000;
  return payload.exp * 1000 < oneHourFromNow;
}
