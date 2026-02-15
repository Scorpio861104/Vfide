import { NextRequest, NextResponse } from 'next/server';
import { verifyMessage } from 'viem';
import { z } from 'zod';
import { generateToken, verifyToken, extractToken } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { validateBody, authSchema } from '@/lib/auth/validation';
import { setAuthCookie, setRefreshCookie, getAuthCookie } from '@/lib/auth/cookieAuth';

/**
 * POST /api/auth
 * Authenticate user with wallet signature
 * 
 * Security:
 * - Rate limited (10 requests/minute) to prevent brute force
 * - Validates wallet signature cryptographically
 * - Returns secure JWT token (not Base64)
 */
export async function POST(request: NextRequest) {
  // Apply rate limiting for auth endpoints
  const rateLimitResponse = await withRateLimit(request, 'auth');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Validate request body
    const validation = await validateBody(request, authSchema);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.details },
        { status: 400 }
      );
    }

    // TypeScript narrowing: validation.success is true, data is properly typed
    const { address, message, signature } = validation.data as z.infer<typeof authSchema>;

    // Verify the message contains expected content (prevent replay attacks)
    const expectedPrefix = 'Sign this message to authenticate with VFIDE';
    if (!message.includes(expectedPrefix)) {
      return NextResponse.json(
        { error: 'Invalid message format' },
        { status: 400 }
      );
    }

    // VULN-03 Fix: Timestamp is mandatory -- reject messages without timestamps
    const timestampMatch = message.match(/Timestamp: (\d+)/);
    if (!timestampMatch || !timestampMatch[1]) {
      return NextResponse.json(
        { error: 'Message must include a timestamp' },
        { status: 400 }
      );
    }

    const messageTimestamp = parseInt(timestampMatch[1], 10);

    // Validate parsed timestamp
    if (isNaN(messageTimestamp) || !isFinite(messageTimestamp)) {
      return NextResponse.json(
        { error: 'Invalid timestamp in message' },
        { status: 400 }
      );
    }

    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (Math.abs(now - messageTimestamp) > fiveMinutes) {
      return NextResponse.json(
        { error: 'Message expired. Please sign a new message.' },
        { status: 400 }
      );
    }

    // Verify the cryptographic signature
    const isValid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Generate secure JWT access + refresh tokens
    const tokenResponse = generateToken(address);

    // Create response — tokens are ONLY set in HTTPOnly cookies, never in body
    const response = NextResponse.json({
      success: true,
      address: tokenResponse.address,
      expiresIn: tokenResponse.expiresIn,
    });

    // Set HTTPOnly cookies (XSS protection)
    await setAuthCookie(tokenResponse.token, response);
    await setRefreshCookie(tokenResponse.refreshToken, response);

    return response;
  } catch (error) {
    console.error('[Auth API] Error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth
 * Verify session token and return user info
 * 
 * Security:
 * - Validates JWT signature
 * - Checks token expiration
 */
export async function GET(request: NextRequest) {
  try {
    // Check Authorization header first, then fall back to HTTPOnly cookie
    const authHeader = request.headers.get('authorization');
    let token = extractToken(authHeader);

    // Fall back to HTTPOnly cookie if no header token
    if (!token) {
      token = await getAuthCookie(request);
    }

    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    // Verify JWT token
    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      valid: true,
      address: payload.address,
      chainId: payload.chainId,
      issuedAt: payload.iat,
      expiresAt: payload.exp,
    });
  } catch (error) {
    console.error('[Auth Verify API] Error:', error);
    return NextResponse.json(
      { error: 'Token verification failed' },
      { status: 401 }
    );
  }
}
