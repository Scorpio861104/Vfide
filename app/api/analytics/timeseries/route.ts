/**
 * /api/analytics/timeseries
 * GET — return timeseries data for dashboard charts.
 *       Query params: type, range
 *       Testnet: returns empty dataset with correct shape.
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') ?? 'volume';
  const range = searchParams.get('range') ?? '7d';

  return NextResponse.json({
    type, range,
    data: [],
    labels: [],
  });
}
