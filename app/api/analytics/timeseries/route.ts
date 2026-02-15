import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { requireAdmin } from '@/lib/auth/middleware';

const VALID_RANGES = new Set(['1h', '24h', '7d', '30d', '1y', 'all']);

type TimeSeriesPoint = { timestamp: number; value: number };

function getRangeBounds(range: string): { start: Date; end: Date } {
  const end = new Date();
  let start = new Date(end);

  switch (range) {
    case '1h':
      start = new Date(end.getTime() - 60 * 60 * 1000);
      break;
    case '24h':
      start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '1y':
      start = new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    case 'all':
    default:
      start = new Date(0);
      break;
  }

  return { start, end };
}

function getIntervalMs(range: string): number {
  switch (range) {
    case '1h':
      return 5 * 60 * 1000;
    case '24h':
      return 60 * 60 * 1000;
    case '7d':
      return 6 * 60 * 60 * 1000;
    case '30d':
      return 24 * 60 * 60 * 1000;
    case '1y':
      return 7 * 24 * 60 * 60 * 1000;
    case 'all':
    default:
      return 7 * 24 * 60 * 60 * 1000;
  }
}

export async function GET(request: NextRequest) {
  const rateLimit = await withRateLimit(request, 'read');
  if (rateLimit) return rateLimit;

  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const range = searchParams.get('range') || '24h';

    if (!type) {
      return NextResponse.json({ error: 'Missing type parameter' }, { status: 400 });
    }

    if (!VALID_RANGES.has(range)) {
      return NextResponse.json({ error: 'Invalid range parameter' }, { status: 400 });
    }

    const { start, end } = getRangeBounds(range);
    const intervalMs = getIntervalMs(range);

    const result = await query<{ timestamp: string }>(
      'SELECT timestamp FROM analytics_events WHERE event_type = $1 AND timestamp BETWEEN $2 AND $3 ORDER BY timestamp ASC',
      [type, start.toISOString(), end.toISOString()]
    );

    const buckets = new Map<number, number>();
    const startMs = start.getTime();
    const endMs = end.getTime();
    const bucketCount = Math.ceil((endMs - startMs) / intervalMs);

    for (let i = 0; i < bucketCount; i++) {
      buckets.set(startMs + i * intervalMs, 0);
    }

    for (const row of result.rows) {
      const timestamp = new Date(row.timestamp).getTime();
      const bucketIndex = Math.floor((timestamp - startMs) / intervalMs);
      const bucketStart = startMs + bucketIndex * intervalMs;
      buckets.set(bucketStart, (buckets.get(bucketStart) || 0) + 1);
    }

    const data: TimeSeriesPoint[] = Array.from(buckets.entries())
      .map(([timestamp, value]) => ({ timestamp, value }))
      .sort((a, b) => a.timestamp - b.timestamp);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[Analytics Timeseries] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch time series data' }, { status: 500 });
  }
}
