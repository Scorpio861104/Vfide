import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { query } from '@/lib/db';
import { ReportType, ChartType, MetricType } from '@/config/reporting-analytics';
import { requireAdmin } from '@/lib/auth/middleware';

type Report = {
  id: string;
  title: string;
  description?: string;
  type: ReportType;
  metrics: Array<{
    id: string;
    label: string;
    value: number;
    change: number;
    trend: 'up' | 'down' | 'neutral';
    format: MetricType;
    unit?: string;
    status: 'healthy' | 'warning' | 'critical';
    lastUpdated: number;
  }>;
  charts: Array<{
    id: string;
    label: string;
    type: ChartType;
    data: Array<{ x: string | number; y: number }>; 
    unit?: string;
  }>;
  lastUpdated: number;
  createdAt: number;
};

const getRangeStart = (range: string | null) => {
  const now = Date.now();
  switch (range) {
    case 'last_hour':
      return new Date(now - 60 * 60 * 1000);
    case 'last_24h':
      return new Date(now - 24 * 60 * 60 * 1000);
    case 'last_7d':
      return new Date(now - 7 * 24 * 60 * 60 * 1000);
    case 'last_90d':
      return new Date(now - 90 * 24 * 60 * 60 * 1000);
    case 'last_year':
      return new Date(now - 365 * 24 * 60 * 60 * 1000);
    case 'last_30d':
    default:
      return new Date(now - 30 * 24 * 60 * 60 * 1000);
  }
};

export async function GET(request: NextRequest) {
  const rateLimit = await withRateLimit(request, 'read');
  if (rateLimit) return rateLimit;

  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const rangeParam = request.nextUrl.searchParams.get('range');
    const startDate = getRangeStart(rangeParam);
    const startIso = startDate.toISOString();
    const now = Date.now();

    const [
      userCountResult,
      newUsersResult,
      transactionsResult,
      transactionSumResult,
      proposalsResult,
      analyticsResult,
      performanceResult,
      securityResult,
      txSeriesResult,
    ] = await Promise.all([
      query<{ count: string }>('SELECT COUNT(*) AS count FROM users'),
      query<{ count: string }>('SELECT COUNT(*) AS count FROM users WHERE created_at >= $1', [startIso]),
      query<{ count: string }>('SELECT COUNT(*) AS count FROM transactions WHERE timestamp >= $1', [startIso]),
      query<{ total: string }>('SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE timestamp >= $1', [startIso]),
      query<{ count: string }>('SELECT COUNT(*) AS count FROM proposals WHERE created_at >= $1', [startIso]),
      query<{ count: string }>('SELECT COUNT(*) AS count FROM analytics_events WHERE timestamp >= $1', [startIso]),
      query<{ count: string }>('SELECT COUNT(*) AS count FROM performance_metrics WHERE timestamp >= $1', [startIso]),
      query<{ count: string }>('SELECT COUNT(*) AS count FROM security_violations WHERE detected_at >= $1', [startIso]),
      query<{ day: string; count: string }>(
        "SELECT DATE_TRUNC('day', timestamp) AS day, COUNT(*) AS count FROM transactions WHERE timestamp >= $1 GROUP BY day ORDER BY day ASC",
        [startIso]
      ),
    ]);

    const totalUsers = Number(userCountResult.rows[0]?.count ?? 0);
    const newUsers = Number(newUsersResult.rows[0]?.count ?? 0);
    const totalTransactions = Number(transactionsResult.rows[0]?.count ?? 0);
    const totalVolume = Number(transactionSumResult.rows[0]?.total ?? 0);
    const totalProposals = Number(proposalsResult.rows[0]?.count ?? 0);
    const analyticsEvents = Number(analyticsResult.rows[0]?.count ?? 0);
    const performanceMetrics = Number(performanceResult.rows[0]?.count ?? 0);
    const securityAlerts = Number(securityResult.rows[0]?.count ?? 0);

    const txSeries = txSeriesResult.rows.map((row) => ({
      x: new Date(row.day).toISOString().slice(0, 10),
      y: Number(row.count ?? 0),
    }));

    const reports: Report[] = [
      {
        id: 'users-report',
        title: 'User Growth',
        description: 'New and total users over the selected period',
        type: ReportType.USERS,
        metrics: [
          {
            id: 'total-users',
            label: 'Total Users',
            value: totalUsers,
            change: 0,
            trend: 'neutral',
            format: MetricType.NUMBER,
            status: 'healthy',
            lastUpdated: now,
          },
          {
            id: 'new-users',
            label: 'New Users',
            value: newUsers,
            change: 0,
            trend: 'neutral',
            format: MetricType.NUMBER,
            status: 'healthy',
            lastUpdated: now,
          },
        ],
        charts: [],
        lastUpdated: now,
        createdAt: now,
      },
      {
        id: 'transactions-report',
        title: 'Transactions Overview',
        description: 'Transaction volume and activity',
        type: ReportType.TRANSACTIONS,
        metrics: [
          {
            id: 'total-transactions',
            label: 'Transactions',
            value: totalTransactions,
            change: 0,
            trend: 'neutral',
            format: MetricType.NUMBER,
            status: 'healthy',
            lastUpdated: now,
          },
          {
            id: 'total-volume',
            label: 'Total Volume',
            value: totalVolume,
            change: 0,
            trend: 'neutral',
            format: MetricType.CURRENCY,
            unit: '$',
            status: 'healthy',
            lastUpdated: now,
          },
        ],
        charts: [
          {
            id: 'tx-series',
            label: 'Transactions per day',
            type: ChartType.LINE,
            data: txSeries,
            unit: 'tx',
          },
        ],
        lastUpdated: now,
        createdAt: now,
      },
      {
        id: 'performance-report',
        title: 'Performance Metrics',
        description: 'Captured performance signals from the system',
        type: ReportType.PERFORMANCE,
        metrics: [
          {
            id: 'performance-metrics',
            label: 'Metrics Logged',
            value: performanceMetrics,
            change: 0,
            trend: 'neutral',
            format: MetricType.NUMBER,
            status: 'healthy',
            lastUpdated: now,
          },
        ],
        charts: [],
        lastUpdated: now,
        createdAt: now,
      },
      {
        id: 'security-report',
        title: 'Security Events',
        description: 'Security alerts and violations',
        type: ReportType.SECURITY,
        metrics: [
          {
            id: 'security-alerts',
            label: 'Alerts',
            value: securityAlerts,
            change: 0,
            trend: 'neutral',
            format: MetricType.NUMBER,
            status: securityAlerts > 0 ? 'warning' : 'healthy',
            lastUpdated: now,
          },
          {
            id: 'governance-proposals',
            label: 'Governance Proposals',
            value: totalProposals,
            change: 0,
            trend: 'neutral',
            format: MetricType.NUMBER,
            status: 'healthy',
            lastUpdated: now,
          },
        ],
        charts: [],
        lastUpdated: now,
        createdAt: now,
      },
      {
        id: 'analytics-report',
        title: 'Analytics Activity',
        description: 'Tracked analytics events',
        type: ReportType.CUSTOM,
        metrics: [
          {
            id: 'analytics-events',
            label: 'Events',
            value: analyticsEvents,
            change: 0,
            trend: 'neutral',
            format: MetricType.NUMBER,
            status: 'healthy',
            lastUpdated: now,
          },
        ],
        charts: [],
        lastUpdated: now,
        createdAt: now,
      },
    ];

    return NextResponse.json({
      reports,
      dashboards: [],
      rangeStart: startIso,
      generatedAt: now,
    });
  } catch (error) {
    console.error('[Reporting Summary GET] Error:', error);
    return NextResponse.json({ error: 'Failed to load reporting summary' }, { status: 500 });
  }
}