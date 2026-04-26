import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuthToken, requireAuth } from '@/lib/auth/middleware';
import { revokeToken, revokeUserTokens, hashToken } from '@/lib/auth/tokenRevocation';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { extractToken } from '@/lib/auth/jwt';
import { z } from 'zod4';

const MAX_REVOKE_REASON_LENGTH = 200;
const revokeSchema = z.object({
  revokeAll: z.boolean().optional(),
  reason: z.string().trim().min(1).max(MAX_REVOKE_REASON_LENGTH).optional(),
});

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

  const authAddress = typeof authResult.user?.address === 'string'
    ? authResult.user.address.trim()
    : '';
  if (!authAddress) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let body: z.infer<typeof revokeSchema>;
    try {
      const rawBody = await request.json();
      const parsed = revokeSchema.safeParse(rawBody);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
      }
      body = parsed.data;
    } catch (error) {
      logger.debug('[Token Revocation API] Invalid JSON payload', error);
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const { revokeAll, reason } = body;

    const normalizedReason = typeof reason === 'string' ? reason.trim() : 'user_requested';

    const headerToken = extractToken(request.headers.get('authorization'));
    const cookieToken = request.cookies.get('vfide_auth_token')?.value?.trim() || null;
    if (headerToken && cookieToken && headerToken !== cookieToken) {
      return NextResponse.json(
        { error: 'Provide only one auth token source when revoking a single token' },
        { status: 400 }
      );
    }

    // Get the current token from the request
    const token = await getRequestAuthToken(request);

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 400 }
      );
    }

    if (revokeAll === true) {
      // Revoke all tokens for this user
      await revokeUserTokens(
        authAddress,
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
    logger.error('[Token Revocation API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to revoke token' },
      { status: 500 }
    );
  }
}
