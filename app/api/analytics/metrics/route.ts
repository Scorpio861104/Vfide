import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { requireAdmin } from '@/lib/auth/middleware';

const VALID_RANGES = new Set(['1h', '24h', '7d', '30d', '1y', 'all']);

type TrendResult = { trend: 'up' | 'down' | 'stable'; percentChange: number };

type MetricsSummary = {
  type: string;
  count: number;
  uniqueUsers: number;
  trend: TrendResult['trend'];
  percentChange: number;
};

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

function calculateTrend(firstCount: number, secondCount: number): TrendResult {
  if (firstCount === 0) {
    return { trend: 'stable', percentChange: 0 };
  }

  const percentChange = ((secondCount - firstCount) / firstCount) * 100;
  let trend: TrendResult['trend'] = 'stable';

  if (percentChange > 5) trend = 'up';
  else if (percentChange < -5) trend = 'down';

  return { trend, percentChange };
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
    const midpoint = new Date(start.getTime() + (end.getTime() - start.getTime()) / 2);

    const [{ rows: totalRows }, { rows: uniqueRows }, { rows: firstRows }, { rows: secondRows }] = await Promise.all([
      query<{ count: string }>(
        'SELECT COUNT(*) AS count FROM analytics_events WHERE event_type = $1 AND timestamp BETWEEN $2 AND $3',
        [type, start.toISOString(), end.toISOString()]
      ),
      query<{ count: string }>(
        'SELECT COUNT(DISTINCT user_id) AS count FROM analytics_events WHERE event_type = $1 AND timestamp BETWEEN $2 AND $3',
        [type, start.toISOString(), end.toISOString()]
      ),
      query<{ count: string }>(
        'SELECT COUNT(*) AS count FROM analytics_events WHERE event_type = $1 AND timestamp BETWEEN $2 AND $3',
        [type, start.toISOString(), midpoint.toISOString()]
      ),
      query<{ count: string }>(
        'SELECT COUNT(*) AS count FROM analytics_events WHERE event_type = $1 AND timestamp BETWEEN $2 AND $3',
        [type, midpoint.toISOString(), end.toISOString()]
      ),
    ]);

    const totalCount = Number(totalRows[0]?.count || 0);
    const uniqueUsers = Number(uniqueRows[0]?.count || 0);
    const firstCount = Number(firstRows[0]?.count || 0);
    const secondCount = Number(secondRows[0]?.count || 0);

    const { trend, percentChange } = calculateTrend(firstCount, secondCount);

    const summary: MetricsSummary = {
      type,
      count: totalCount,
      uniqueUsers,
      trend,
      percentChange,
    };

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error('[Analytics Metrics] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}
