/**
 * Authentication Middleware for API Routes
 * 
 * Provides JWT verification and user authentication for protected endpoints.
 * Use this to secure API routes that require user authentication.
 * 
 * Usage:
 * ```typescript
 * import { requireAuth } from '@/lib/auth-middleware';
 * 
 * export async function GET(request: NextRequest) {
 *   const authResult = await requireAuth(request);
 *   if (!authResult.authenticated) {
 *     return authResult.errorResponse;
 *   }
 *   const { address, user } = authResult;
 *   // Use authenticated user data
 * }
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { AUTH_CONFIG } from './config.constants';
import { authLogger } from './logger.service';

export interface AuthenticatedUser {
  address: string;
  timestamp: number;
}

export type AuthResult =
  | {
      authenticated: true;
      address: string;
      user: AuthenticatedUser;
    }
  | {
      authenticated: false;
      errorResponse: NextResponse;
    };

/**
 * Get secure session secret
 */
function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  
  if (process.env.NODE_ENV === 'production' && (!secret || secret.length < 32)) {
    throw new Error('SESSION_SECRET must be set in production with at least 32 characters');
  }
  
  if (!secret && process.env.NODE_ENV === 'development') {
    return 'dev-secret-change-this-in-production-min-32-chars';
  }
  
  return secret || 'dev-secret-change-this-in-production-min-32-chars';
}

/**
 * Verify HMAC token
 */
function verifyToken(token: string): AuthenticatedUser | null {
  try {
    // Decode base64
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const parts = decoded.split(':');
    
    if (parts.length !== 4) {
      return null;
    }
    
    const [address, timestamp, randomSalt, signature] = parts;
    
    // Check if token is expired
    const tokenAge = Date.now() - parseInt(timestamp || '0');
    if (tokenAge > AUTH_CONFIG.SESSION_EXPIRY_MS || tokenAge < 0) {
      return null;
    }
    
    // Verify HMAC signature
    const secret = getSessionSecret();
    const hmac = createHmac('sha256', secret);
    hmac.update(`${address}:${timestamp}:${randomSalt}`);
    const expectedSignature = hmac.digest('hex');
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    return {
      address: address.toLowerCase(),
      timestamp: parseInt(timestamp),
    };
  } catch (error) {
    authLogger.error('Token verification failed', { error });
    return null;
  }
}

/**
 * Extract token from request headers
 */
function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader) {
    return null;
  }
  
  // Support both "Bearer TOKEN" and just "TOKEN" formats
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return authHeader;
}

/**
 * Require authentication for an API route
 * Returns authenticated user data or error response
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  const token = extractToken(request);
  
  if (!token) {
    return {
      authenticated: false,
      errorResponse: NextResponse.json(
        { error: 'Authentication required', code: 'NO_TOKEN' },
        { status: 401 }
      ),
    };
  }
  
  const user = verifyToken(token);
  
  if (!user) {
    return {
      authenticated: false,
      errorResponse: NextResponse.json(
        { error: 'Invalid or expired token', code: 'INVALID_TOKEN' },
        { status: 401 }
      ),
    };
  }
  
  return {
    authenticated: true,
    address: user.address,
    user,
  };
}

/**
 * Optional authentication - returns user if authenticated, null otherwise
 * Does not return error response
 */
export async function optionalAuth(request: NextRequest): Promise<AuthenticatedUser | null> {
  const token = extractToken(request);
  
  if (!token) {
    return null;
  }
  
  return verifyToken(token);
}

/**
 * Require admin/owner authentication
 * Checks if authenticated user matches owner address
 */
export async function requireOwner(
  request: NextRequest,
  ownerAddress: string
): Promise<AuthResult> {
  const authResult = await requireAuth(request);
  
  if (!authResult.authenticated) {
    return authResult;
  }
  
  if (authResult.address.toLowerCase() !== ownerAddress.toLowerCase()) {
    return {
      authenticated: false,
      errorResponse: NextResponse.json(
        { error: 'Owner access required', code: 'FORBIDDEN' },
        { status: 403 }
      ),
    };
  }
  
  return authResult;
}

/**
 * Require specific address authentication
 * Ensures authenticated user matches the required address
 */
export async function requireAddress(
  request: NextRequest,
  requiredAddress: string
): Promise<AuthResult> {
  const authResult = await requireAuth(request);
  
  if (!authResult.authenticated) {
    return authResult;
  }
  
  if (authResult.address.toLowerCase() !== requiredAddress.toLowerCase()) {
    return {
      authenticated: false,
      errorResponse: NextResponse.json(
        { error: 'Access denied', code: 'WRONG_ADDRESS' },
        { status: 403 }
      ),
    };
  }
  
  return authResult;
}
