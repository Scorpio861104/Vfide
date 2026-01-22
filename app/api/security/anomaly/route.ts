import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getAnomalyStats, recordActivity, getClientIP, getUserAgent } from '@/lib/security/anomalyDetection';
import { withRateLimit } from '@/lib/auth/rateLimit';

/**
 * GET /api/security/anomaly
 * Get anomaly detection statistics for the authenticated user
 */
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  // Require authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const stats = await getAnomalyStats(authResult.user.address);
    
    // Record this activity
    await recordActivity(authResult.user.address, {
      timestamp: Date.now(),
      ipAddress: getClientIP(request),
      userAgent: getUserAgent(request),
      action: 'api_call',
      endpoint: '/api/security/anomaly',
    });

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('[Anomaly API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch anomaly statistics' },
      { status: 500 }
    );
  }
}
