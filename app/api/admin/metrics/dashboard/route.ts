/**
 * /api/admin/metrics/dashboard
 *
 * Returns real-time platform metrics for the admin monitoring panel.
 * Admin-only endpoint — returns placeholder/aggregated data in testnet context.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  // Restrict to admin users
  const authResult = requireAuth(request);
  if (authResult && 'status' in (authResult as object) && !('user' in (authResult as object))) {
    return authResult as unknown as NextResponse;
  }

  // In production, these would be aggregated from real telemetry.
  // For testnet this returns safe zero-state values so the UI renders without errors.
  const now = Date.now();
  const metrics = {
    activeUsers: 0,
    requestsPerMinute: 0,
    errorRate: 0,
    avgResponseTime: 0,
    activeUsersTrend: 0,
    requestsTrend: 0,
    errorRateTrend: 0,
    responseTimeTrend: 0,
    timestamp: now,
  };

  return NextResponse.json(metrics);
}
