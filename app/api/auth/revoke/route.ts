import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuthToken, requireAuth } from '@/lib/auth/middleware';
import { revokeToken, revokeUserTokens, hashToken } from '@/lib/auth/tokenRevocation';
import { withRateLimit } from '@/lib/auth/rateLimit';

const MAX_REVOKE_REASON_LENGTH = 200;

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * POST /api/auth/revoke
 * Revoke the current authentication token
 */
export async function POST(request: NextRequest) {
  // Rate limiting for revocation operations
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  // Require authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    if (!isObjectRecord(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { revokeAll, reason } = body;

    if (revokeAll !== undefined && typeof revokeAll !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid revokeAll flag. Must be a boolean if provided.' },
        { status: 400 }
      );
    }

    if (
      reason !== undefined &&
      (typeof reason !== 'string' || reason.trim().length === 0 || reason.length > MAX_REVOKE_REASON_LENGTH)
    ) {
      return NextResponse.json(
        { error: `Invalid reason. Must be a non-empty string up to ${MAX_REVOKE_REASON_LENGTH} characters.` },
        { status: 400 }
      );
    }

    const normalizedReason = typeof reason === 'string' ? reason.trim() : 'user_requested';

    // Get the current token from the request
    const token = await getRequestAuthToken(request);

    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 400 }
      );
    }

    if (revokeAll === true) {
      // Revoke all tokens for this user
      await revokeUserTokens(
        authResult.user.address,
        normalizedReason
      );

      return NextResponse.json({
        success: true,
        message: 'All tokens for your account have been revoked',
      });
    } else {
      // Revoke only the current token
      const tokenHash = await hashToken(token);
      const expiresAt = authResult.user.exp || Math.floor(Date.now() / 1000) + 86400;

      await revokeToken(
        tokenHash,
        expiresAt,
        normalizedReason
      );

      return NextResponse.json({
        success: true,
        message: 'Token has been revoked successfully',
      });
    }
  } catch (error) {
    console.error('[Token Revocation API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to revoke token' },
      { status: 500 }
    );
  }
}
