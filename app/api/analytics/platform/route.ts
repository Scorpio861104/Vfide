import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { requireAdmin } from '@/lib/auth/middleware';

const VALID_RANGES = new Set(['1h', '24h', '7d', '30d', '1y', 'all']);

type PlatformAnalytics = {
  totalUsers: number;
  activeUsers: number;
  totalMessages: number;
  totalGroups: number;
  totalBadges: number;
  averageSessionDuration: number;
  peakHours: number[];
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

export async function GET(request: NextRequest) {
  const rateLimit = await withRateLimit(request, 'read');
  if (rateLimit) return rateLimit;

  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '24h';

    if (!VALID_RANGES.has(range)) {
      return NextResponse.json({ error: 'Invalid range parameter' }, { status: 400 });
    }

    const { start, end } = getRangeBounds(range);
    const activeThreshold = new Date(end.getTime() - 30 * 60 * 1000);

    const [
      totalUsersResult,
      activeUsersResult,
      messagesResult,
      groupsResult,
      badgesResult,
      durationResult,
      peakResult,
    ] = await Promise.all([
      query<{ count: string }>(
        'SELECT COUNT(DISTINCT user_id) AS count FROM analytics_events WHERE timestamp BETWEEN $1 AND $2',
        [start.toISOString(), end.toISOString()]
      ),
      query<{ count: string }>(
        'SELECT COUNT(DISTINCT user_id) AS count FROM analytics_events WHERE timestamp BETWEEN $1 AND $2',
        [activeThreshold.toISOString(), end.toISOString()]
      ),
      query<{ count: string }>(
        "SELECT COUNT(*) AS count FROM analytics_events WHERE event_type = 'message_sent' AND timestamp BETWEEN $1 AND $2",
        [start.toISOString(), end.toISOString()]
      ),
      query<{ count: string }>(
        "SELECT COUNT(*) AS count FROM analytics_events WHERE event_type = 'group_created' AND timestamp BETWEEN $1 AND $2",
        [start.toISOString(), end.toISOString()]
      ),
      query<{ count: string }>(
        "SELECT COUNT(*) AS count FROM analytics_events WHERE event_type = 'badge_earned' AND timestamp BETWEEN $1 AND $2",
        [start.toISOString(), end.toISOString()]
      ),
      query<{ avg: string }>(
        "SELECT AVG((event_data->>'duration')::numeric) AS avg FROM analytics_events WHERE event_data ? 'duration' AND timestamp BETWEEN $1 AND $2",
        [start.toISOString(), end.toISOString()]
      ),
      query<{ hour: string; count: string }>(
        'SELECT EXTRACT(HOUR FROM timestamp) AS hour, COUNT(*) AS count FROM analytics_events WHERE timestamp BETWEEN $1 AND $2 GROUP BY hour ORDER BY count DESC',
        [start.toISOString(), end.toISOString()]
      ),
    ]);

    const peakCounts = peakResult.rows || [];
    const maxCount = Math.max(0, ...peakCounts.map((row) => Number(row.count)));
    const peakHours = peakCounts
      .filter((row) => Number(row.count) === maxCount)
      .map((row) => Number(row.hour));

    const analytics: PlatformAnalytics = {
      totalUsers: Number(totalUsersResult.rows[0]?.count || 0),
      activeUsers: Number(activeUsersResult.rows[0]?.count || 0),
      totalMessages: Number(messagesResult.rows[0]?.count || 0),
      totalGroups: Number(groupsResult.rows[0]?.count || 0),
      totalBadges: Number(badgesResult.rows[0]?.count || 0),
      averageSessionDuration: Number(durationResult.rows[0]?.avg || 0),
      peakHours,
    };

    return NextResponse.json({ success: true, analytics });
  } catch (error) {
    console.error('[Analytics Platform] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch platform analytics' }, { status: 500 });
  }
}
