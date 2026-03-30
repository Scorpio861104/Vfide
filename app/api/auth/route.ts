import { NextRequest, NextResponse } from 'next/server';
import { verifyMessage } from 'viem';
import { generateToken, verifyToken, extractToken } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { validateBody, authSchema } from '@/lib/auth/validation';
import { setAuthCookie, getAuthCookie } from '@/lib/auth/cookieAuth';
import {
  consumeAndValidateSiweChallenge,
  getRequestIp,
} from '@/lib/security/siweChallenge';
import {
  clearAuthFailureSignals,
  getAccountLock,
  recordSecurityEvent,
} from '@/lib/security/accountProtection';
import { logger } from '@/lib/logger';

function parseMessageTimestamp(message: string): number | null {
  const timestampMatch = message.match(/^Timestamp:\s*(\d+)\s*$/m);
  if (timestampMatch && timestampMatch[1]) {
    const parsed = Number.parseInt(timestampMatch[1], 10);
    if (Number.isSafeInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  // Backward-compatible support for SIWE-standard "Issued At" lines.
  const issuedAtMatch = message.match(/^Issued At:\s*(.+)\s*$/m);
  if (!issuedAtMatch || !issuedAtMatch[1]) {
    return null;
  }

  const issuedAtMs = Date.parse(issuedAtMatch[1]);
  if (Number.isNaN(issuedAtMs) || issuedAtMs <= 0) {
    return null;
  }

  return issuedAtMs;
}

function parseChainId(message: string): number | null {
  const chainMatch = message.match(/^Chain ID:\s*(\d+)\s*$/m);
  if (!chainMatch || !chainMatch[1]) return null;
  const parsed = Number.parseInt(chainMatch[1], 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * POST /api/auth
 * Authenticate user with wallet signature
 * 
 * Security:
 * - Rate limited (10 requests/minute) to prevent brute force
 * - Validates wallet signature cryptographically
 * - Sets secure JWT in HTTPOnly cookie (token is not returned in JSON)
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

    const { address, message, signature } = validation.data;
    const normalizedAddress = address.toLowerCase();
    const ip = getRequestIp(request.headers);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const lock = await getAccountLock(normalizedAddress);

    if (lock) {
      return NextResponse.json(
        { error: `Account temporarily locked due to security signals: ${lock.reason}` },
        { status: 423 }
      );
    }

    // Verify SIWE structure and challenge-binding (nonce/domain/chain/expiry).
    const chainId = parseChainId(message);
    if (!chainId) {
      return NextResponse.json(
        { error: 'SIWE message must include a valid Chain ID' },
        { status: 400 }
      );
    }

    const domain = (request.headers.get('host') || 'vfide.io').split(':')[0] || 'vfide.io';
    const challengeValidation = await consumeAndValidateSiweChallenge({
      address: normalizedAddress,
      message,
      domain,
      chainId,
      ip,
      userAgent,
    });
    if (!challengeValidation.ok) {
      await recordSecurityEvent(normalizedAddress, { ts: Date.now(), ip, type: 'auth_fail' });
      return NextResponse.json({ error: challengeValidation.error }, { status: 400 });
    }

    // Check message timestamp to prevent replay attacks (within 5 minutes)
    // Reject messages that don't include a timestamp — they are not replayable otherwise
    const messageTimestamp = parseMessageTimestamp(message);
    if (messageTimestamp === null) {
      return NextResponse.json(
        { error: 'Message must contain a timestamp' },
        { status: 400 }
      );
    }

    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (Math.abs(now - messageTimestamp) > fiveMinutes) {
      await recordSecurityEvent(normalizedAddress, { ts: Date.now(), ip, type: 'auth_fail' });
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
      await recordSecurityEvent(normalizedAddress, { ts: Date.now(), ip, type: 'auth_fail' });
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    await recordSecurityEvent(normalizedAddress, { ts: Date.now(), ip, type: 'auth_success' });
    await clearAuthFailureSignals(normalizedAddress);

    // Generate secure JWT token
    const tokenResponse = generateToken(normalizedAddress, chainId);

    // Create response with HTTPOnly cookie for enhanced security
    const response = NextResponse.json({
      success: true,
      address: tokenResponse.address,
      expiresIn: tokenResponse.expiresIn,
    });

    // Set HTTPOnly cookie (XSS protection)
    await setAuthCookie(tokenResponse.token, response);

    return response;
  } catch (error) {
    logger.error('[Auth API] Error:', error);
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
    logger.error('[Auth Verify API] Error:', error);
    return NextResponse.json(
      { error: 'Token verification failed' },
      { status: 401 }
    );
  }
}
