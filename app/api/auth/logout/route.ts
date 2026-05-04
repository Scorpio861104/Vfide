import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/auth/cookieAuth';
import { revokeToken, hashToken } from '@/lib/auth/tokenRevocation';
import { getRequestAuthToken, withAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { clearActivityHistory } from '@/lib/security/anomalyDetection';
import { logger } from '@/lib/logger';

/**
 * POST /api/auth/logout
 * Logout user - revoke token and clear cookies
 * 
 * Security:
 * - Revokes JWT token (adds to blacklist)
 * - Clears HTTPOnly cookies
 * - Rate limited to prevent abuse
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  // Apply rate limiting
  const rateLimitResponse = await withRateLimit(request, 'auth');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const token = await getRequestAuthToken(request);
    const normalizedToken = typeof token === 'string' ? token.trim() : '';

    // Revoke the token if present
    if (normalizedToken.length > 0) {
      const tokenHash = await hashToken(normalizedToken);
      try {
        // Prefer JWT exp when available so revocation lifetime tracks actual token validity.
        const now = Math.floor(Date.now() / 1000);
        const fallbackExp = now + (60 * 60 * 24);
        const tokenExp = Number(user?.exp ?? 0);
        const expiresAt = Number.isFinite(tokenExp) && tokenExp > now
          ? tokenExp
          : fallbackExp;
        await revokeToken(tokenHash, expiresAt, 'logout');
      } catch (error) {
        // Log but don't fail - token might already be expired
        logger.warn('[Logout] Token revocation warning:', error);
      }
    } else if (token !== null && token !== undefined) {
      // Do not fail logout for malformed token shapes from upstream extraction.
      logger.warn('[Logout] Ignoring malformed token payload');
    }

    // Clear activity history so post-logout logins don't trigger false anomaly alerts
    const userAddress = typeof user?.address === 'string' ? user.address.trim() : '';
    if (userAddress) {
      clearActivityHistory(userAddress).catch((err) =>
        logger.warn('[Logout] clearActivityHistory failed:', err)
      );
    }

    // Clear cookies
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    await clearAuthCookies(response);

    return response;
  } catch (error) {
    logger.error('[Logout API] Error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
});
