import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logging';
import { requireAuth } from '@/lib/auth/middleware';
import { revokeToken, revokeUserTokens, hashToken } from '@/lib/auth/tokenRevocation';
import { extractToken } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';

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
    const body = await request.json();
    const { revokeAll, reason } = body;

    // Get the current token from the request
    const authHeader = request.headers.get('authorization');
    const token = extractToken(authHeader);

    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 400 }
      );
    }

    if (revokeAll) {
      // Revoke all tokens for this user
      await revokeUserTokens(
        authResult.user.address,
        reason || 'user_requested'
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
        reason || 'user_requested'
      );

      return NextResponse.json({
        success: true,
        message: 'Token has been revoked successfully',
      });
    }
  } catch (error) {
    log.error('[Token Revocation API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to revoke token' },
      { status: 500 }
    );
  }
}
