/**
 * Authentication Middleware for API Routes
 * Provides secure authentication and authorization checks
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractToken, JWTPayload } from './jwt';
import { getAuthCookie } from './cookieAuth';

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

export interface AuthResult {
  authenticated: boolean;
  user: JWTPayload | null;
  error?: string;
}

/**
 * Resolve auth token from request using a consistent precedence:
 * Authorization header first, then HTTPOnly auth cookie.
 */
export async function getRequestAuthToken(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  const headerToken = extractToken(authHeader)?.trim() ?? '';
  if (headerToken.length > 0) {
    return headerToken;
  }

  const cookieToken = (await getAuthCookie(request))?.trim() ?? '';
  return cookieToken.length > 0 ? cookieToken : null;
}

/**
 * Verify authentication from request headers
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  const token = await getRequestAuthToken(request);

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
 * Admin addresses — populated exclusively from environment variables.
 * Set ADMIN_ADDRESS (single) or ADMIN_ADDRESSES (comma-separated) in your environment.
 * Never hard-code addresses here; doing so grants permanent admin access to that wallet.
 */
const ADMIN_ADDRESSES = new Set(
  [
    process.env.ADMIN_ADDRESS?.toLowerCase(),
    ...(process.env.ADMIN_ADDRESSES?.split(',').map(a => a.trim().toLowerCase()) ?? []),
  ].filter(Boolean) as string[]
);

/**
 * Check if user is an admin
 */
export function isAdmin(user: JWTPayload): boolean {
  return ADMIN_ADDRESSES.has(user.address.toLowerCase());
}

/**
 * F-19 FIX: On-chain admin verification for sensitive operations.
 * Cross-checks the authenticated address against the on-chain OCP owner.
 * Falls back gracefully if OCP_ADDRESS or RPC_URL is not configured.
 *
 * Usage: Call this in addition to requireAdmin() for high-impact admin endpoints.
 */
export async function verifyOnChainAdmin(address: string): Promise<boolean> {
  const ocpAddress = process.env.OCP_ADDRESS;
  const rpcUrl = process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL;
  if (!ocpAddress || !rpcUrl) {
    // On-chain verification not configured — fall back to env-var check only.
    return ADMIN_ADDRESSES.has(address.toLowerCase());
  }
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{ to: ocpAddress, data: '0x8da5cb5b' }, 'latest'], // owner() selector
        id: 1,
      }),
    });
    const json = await response.json();
    if (json.result) {
      const onChainOwner = ('0x' + json.result.slice(-40)).toLowerCase();
      return onChainOwner === address.toLowerCase();
    }
  } catch {
    // RPC failure — deny rather than grant on uncertainty
    return false;
  }
  return false;
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

type AuthenticatedHandler<T = Promise<NextResponse>> = (request: NextRequest, user: JWTPayload) => T;

/**
 * Wrap an API handler and require authentication before invoking it.
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    return handler(request, authResult.user);
  };
}
