import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/auth/cookieAuth';
import { revokeToken, hashToken } from '@/lib/auth/tokenRevocation';
import { getRequestAuthToken } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';

/**
 * POST /api/auth/logout
 * Logout user - revoke token and clear cookies
 * 
 * Security:
 * - Revokes JWT token (adds to blacklist)
 * - Clears HTTPOnly cookies
 * - Rate limited to prevent abuse
 */
export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await withRateLimit(request, 'auth');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const token = await getRequestAuthToken(request);

    // Revoke the token if present
    if (token) {
      const tokenHash = await hashToken(token);
      try {
        // expiresAt is Unix timestamp 24h from now, reason is 'logout'
        const expiresAt = Math.floor(Date.now() / 1000) + (60 * 60 * 24);
        await revokeToken(tokenHash, expiresAt, 'logout');
      } catch (error) {
        // Log but don't fail - token might already be expired
        console.warn('[Logout] Token revocation warning:', error);
      }
    }

    // Clear cookies
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    await clearAuthCookies(response);

    return response;
  } catch (error) {
    console.error('[Logout API] Error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}
