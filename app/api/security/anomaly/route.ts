import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getAnomalyStats, recordActivity, getClientIP, getUserAgent } from '@/lib/security/anomalyDetection';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{3,64}$/;

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase();
}

function isAddressLike(value: string): boolean {
  return ADDRESS_PATTERN.test(value);
}

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

  const authAddress = typeof authResult.user?.address === 'string'
    ? normalizeAddress(authResult.user.address)
    : '';
  if (!authAddress || !isAddressLike(authAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const stats = await getAnomalyStats(authAddress);
    
    // Record this activity (best effort only)
    try {
      await recordActivity(authAddress, {
        timestamp: Date.now(),
        ipAddress: getClientIP(request),
        userAgent: getUserAgent(request),
        action: 'api_call',
        endpoint: '/api/security/anomaly',
      });
    } catch (recordingError) {
      logger.error('[Anomaly API] Failed to record activity:', recordingError);
    }

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error('[Anomaly API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch anomaly statistics' },
      { status: 500 }
    );
  }
}
