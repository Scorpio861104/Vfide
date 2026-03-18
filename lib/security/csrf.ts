/**
 * CSRF (Cross-Site Request Forgery) Protection
 * 
 * Implements the Double Submit Cookie pattern:
 * 1. Generate a random CSRF token
 * 2. Store it in a secure, httpOnly cookie
 * 3. Require the token to be sent in a custom header for state-changing requests
 * 4. Verify both match before processing the request
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { timingSafeEqual } from 'crypto';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_MAX_AGE = 60 * 60 * 24; // 24 hours

/**
 * Generate a cryptographically secure random token
 */
export function generateCSRFToken(): string {
  const buffer = new Uint8Array(CSRF_TOKEN_LENGTH);
  crypto.getRandomValues(buffer);
  return Buffer.from(buffer).toString('base64url');
}

/**
 * Set CSRF token in a secure cookie
 */
export function setCSRFTokenCookie(response: NextResponse, token: string): void {
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: CSRF_TOKEN_MAX_AGE,
    path: '/',
  });
}

/**
 * Get CSRF token from request
 */
export function getCSRFTokenFromRequest(request: NextRequest): {
  cookieToken: string | undefined;
  headerToken: string | undefined;
} {
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME) || undefined;
  
  return {
    cookieToken,
    headerToken,
  };
}

/**
 * Verify CSRF token for state-changing operations
 */
export function verifyCSRFToken(request: NextRequest): boolean {
  const { cookieToken, headerToken } = getCSRFTokenFromRequest(request);
  
  // Both tokens must be present
  if (!cookieToken || !headerToken) {
    return false;
  }
  
  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);

  // Reject on length mismatch first to avoid timingSafeEqual throw.
  if (cookieBuffer.length !== headerBuffer.length) {
    return false;
  }

  // Tokens must match in constant time.
  return timingSafeEqual(cookieBuffer, headerBuffer);
}

/**
 * Create CSRF error response
 */
export function createCSRFErrorResponse(): NextResponse {
  return NextResponse.json(
    {
      error: 'CSRF token validation failed',
      message: 'Invalid or missing CSRF token. Please refresh the page and try again.',
      code: 'CSRF_TOKEN_INVALID',
    },
    { status: 403 }
  );
}

/**
 * Middleware to validate CSRF tokens on state-changing requests
 * Should be called for POST, PUT, PATCH, DELETE requests
 */
export function validateCSRF(request: NextRequest): NextResponse | null {
  // Only check state-changing methods
  const stateChangingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!stateChangingMethods.includes(request.method)) {
    return null; // Not a state-changing request, no validation needed
  }
  
  // Skip CSRF check for authentication endpoints (use other security measures)
  const pathname = new URL(request.url).pathname;
  const skipPaths = ['/api/auth/', '/api/health'];
  if (skipPaths.some(path => pathname.startsWith(path))) {
    return null;
  }
  
  // Verify CSRF token
  if (!verifyCSRFToken(request)) {
    return createCSRFErrorResponse();
  }
  
  return null; // Validation passed
}

/**
 * API helper to get CSRF token for client-side use
 * This should be called from a GET endpoint to provide the token to the client
 */
export async function getCSRFTokenForClient(): Promise<string> {
  const cookieStore = await cookies();
  let token = cookieStore.get(CSRF_COOKIE_NAME)?.value;
  
  // Generate new token if none exists
  if (!token) {
    token = generateCSRFToken();
  }
  
  return token;
}
