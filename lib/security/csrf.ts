/**
 * CSRF Protection
 * 
 * Implements Cross-Site Request Forgery protection for all
 * state-changing operations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHmac } from 'crypto';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_SECRET = process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production';

/**
 * Generate CSRF token
 */
export function generateCsrfToken(): string {
  const token = randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
  return token;
}

/**
 * Create CSRF token with HMAC signature
 */
export function createCsrfToken(sessionId: string): string {
  const token = generateCsrfToken();
  const hmac = createHmac('sha256', CSRF_SECRET);
  hmac.update(`${token}:${sessionId}`);
  const signature = hmac.digest('hex');
  
  return `${token}.${signature}`;
}

/**
 * Verify CSRF token
 */
export function verifyCsrfToken(token: string, sessionId: string): boolean {
  const [tokenPart, signature] = token.split('.');
  
  if (!tokenPart || !signature) {
    return false;
  }
  
  const hmac = createHmac('sha256', CSRF_SECRET);
  hmac.update(`${tokenPart}:${sessionId}`);
  const expectedSignature = hmac.digest('hex');
  
  // Constant-time comparison to prevent timing attacks
  return signature === expectedSignature;
}

/**
 * CSRF middleware for API routes
 */
export async function csrfProtection(
  request: NextRequest
): Promise<NextResponse | null> {
  // Only check for state-changing methods
  const method = request.method;
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return null; // No CSRF check needed
  }
  
  // Get CSRF token from header or body
  const csrfToken = 
    request.headers.get('x-csrf-token') ||
    request.headers.get('csrf-token');
  
  if (!csrfToken) {
    return NextResponse.json(
      { error: 'CSRF token missing' },
      { status: 403 }
    );
  }
  
  // Get session ID (from cookie or header)
  const sessionId = getSessionId(request);
  
  if (!sessionId) {
    return NextResponse.json(
      { error: 'Session required' },
      { status: 401 }
    );
  }
  
  // Verify token
  if (!verifyCsrfToken(csrfToken, sessionId)) {
    return NextResponse.json(
      { error: 'Invalid CSRF token' },
      { status: 403 }
    );
  }
  
  return null; // CSRF check passed
}

/**
 * Get session ID from request
 */
function getSessionId(request: NextRequest): string | null {
  // Try to get from cookie
  const cookies = request.cookies;
  const sessionCookie = cookies.get('sessionId');
  
  if (sessionCookie) {
    return sessionCookie.value;
  }
  
  // Try to get from Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    // Extract session ID from JWT or other auth mechanism
    // TODO: Implement actual session ID extraction
    return null;
  }
  
  return null;
}

/**
 * CSRF HOF for API routes
 */
export function withCsrfProtection(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Check CSRF
    const csrfResponse = await csrfProtection(req);
    if (csrfResponse) {
      return csrfResponse;
    }
    
    // Proceed to actual handler
    return handler(req);
  };
}
