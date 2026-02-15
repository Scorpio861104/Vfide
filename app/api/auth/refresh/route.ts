import { NextRequest, NextResponse } from 'next/server';
import { refreshAccessToken } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { getRefreshCookie, setAuthCookie, setRefreshCookie } from '@/lib/auth/cookieAuth';

/**
 * POST /api/auth/refresh
 * Exchange a valid refresh token for a new access + refresh token pair
 *
 * Security:
 * - Rate limited to prevent abuse
 * - Refresh token read from HTTPOnly cookie only
 * - Issues new token pair (rotating refresh token)
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'auth');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const refreshToken = await getRefreshCookie(request);

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token' },
        { status: 401 }
      );
    }

    const tokenResponse = await refreshAccessToken(refreshToken);

    if (!tokenResponse) {
      return NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      address: tokenResponse.address,
      expiresIn: tokenResponse.expiresIn,
    });

    await setAuthCookie(tokenResponse.token, response);
    await setRefreshCookie(tokenResponse.refreshToken, response);

    return response;
  } catch (error) {
    console.error('[Auth Refresh] Error:', error);
    return NextResponse.json(
      { error: 'Token refresh failed' },
      { status: 500 }
    );
  }
}
