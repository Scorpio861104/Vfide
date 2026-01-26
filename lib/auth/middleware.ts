/**
 * Authentication Middleware for API Routes
 * Provides secure authentication and authorization checks
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractToken, JWTPayload } from './jwt';

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

export interface AuthResult {
  authenticated: boolean;
  user: JWTPayload | null;
  error?: string;
}

/**
 * Verify authentication from request headers
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization');
  const token = extractToken(authHeader);

  if (!token) {
    return {
      authenticated: false,
      user: null,
      error: 'No authentication token provided',
    };
  }

  const payload = await verifyToken(token);

  if (!payload) {
    return {
      authenticated: false,
      user: null,
      error: 'Invalid or expired token',
    };
  }

  return {
    authenticated: true,
    user: payload,
  };
}

/**
 * Require authentication - returns error response if not authenticated
 */
export async function requireAuth(request: NextRequest): Promise<{ user: JWTPayload } | NextResponse> {
  const result = await verifyAuth(request);

  if (!result.authenticated || !result.user) {
    return NextResponse.json(
      { error: result.error || 'Authentication required' },
      { status: 401 }
    );
  }

  return { user: result.user };
}

/**
 * Check if the authenticated user matches the requested address
 */
export function checkOwnership(
  user: JWTPayload,
  targetAddress: string
): boolean {
  return user.address.toLowerCase() === targetAddress.toLowerCase();
}

/**
 * Require the user to be the owner of the resource
 */
export async function requireOwnership(
  request: NextRequest,
  targetAddress: string
): Promise<{ user: JWTPayload } | NextResponse> {
  const authResult = await requireAuth(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  if (!checkOwnership(authResult.user, targetAddress)) {
    return NextResponse.json(
      { error: 'You do not have permission to access this resource' },
      { status: 403 }
    );
  }

  return authResult;
}

/**
 * Admin addresses - in production, store in database
 */
const ADMIN_ADDRESSES = new Set([
  '0x1234567890abcdef1234567890abcdef12345678', // Example admin
  process.env.ADMIN_ADDRESS?.toLowerCase(),
].filter(Boolean));

/**
 * Check if user is an admin
 */
export function isAdmin(user: JWTPayload): boolean {
  return ADMIN_ADDRESSES.has(user.address.toLowerCase());
}

/**
 * Require admin role
 */
export async function requireAdmin(request: NextRequest): Promise<{ user: JWTPayload } | NextResponse> {
  const authResult = await requireAuth(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  if (!isAdmin(authResult.user)) {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }

  return authResult;
}

/**
 * Optional authentication - returns user if authenticated, null otherwise
 */
export async function optionalAuth(request: NextRequest): Promise<JWTPayload | null> {
  const result = await verifyAuth(request);
  return result.user;
}
