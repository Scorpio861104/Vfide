/**
 * /api/analytics/platform
 * GET — return platform-level aggregate stats.
 *       Testnet: returns zeroed stats with correct shape.
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(_request: NextRequest) {
  return NextResponse.json({
    totalTransactions: 0,
    totalVolume: '0',
    activeUsers: 0,
    merchantCount: 0,
    period: '7d',
  });
}
