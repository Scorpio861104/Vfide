import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';

const DEFAULT_LOOKBACK_DAYS = 30;
const MAX_LOOKBACK_DAYS = 180;

function parseDays(raw: string | null): number | null {
  if (raw === null) return DEFAULT_LOOKBACK_DAYS;
  if (!/^\d+$/.test(raw.trim())) return null;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return null;
  return Math.min(parsed, MAX_LOOKBACK_DAYS);
}

export async function POST(request: NextRequest) {
  const rateLimit = await withRateLimit(request, 'write');
  if (rateLimit) return rateLimit;

  const adminResult = await requireAdmin(request);
  if (adminResult instanceof NextResponse) return adminResult;

  try {
    const { searchParams } = new URL(request.url);
    const lookbackDays = parseDays(searchParams.get('days'));

    if (lookbackDays === null) {
      return NextResponse.json(
        { error: 'Invalid days parameter. Must be a positive integer.' },
        { status: 400 }
      );
    }

    const result = await query<{
      start_date: string;
      end_date: string;
      rows_updated: number;
    }>(
      `
      WITH bounds AS (
        SELECT
          (CURRENT_DATE - ($1::int - 1))::date AS start_date,
          CURRENT_DATE::date AS end_date
      ),
      refresh AS (
        SELECT refresh_seer_analytics_rollup(start_date, end_date)
        FROM bounds
      )
      SELECT
        b.start_date::text AS start_date,
        b.end_date::text AS end_date,
        (
          SELECT COUNT(*)::int
          FROM seer_analytics_daily_rollup s
          WHERE s.day BETWEEN b.start_date AND b.end_date
        ) AS rows_updated
      FROM bounds b
      CROSS JOIN refresh r
      `,
      [lookbackDays]
    );

    const row = result.rows[0];

    return NextResponse.json({
      success: true,
      lookbackDays,
      window: {
        startDate: row?.start_date ?? null,
        endDate: row?.end_date ?? null,
      },
      rowsUpdated: row?.rows_updated ?? 0,
    });
  } catch (error) {
    console.error('[Seer Analytics Rollup] Error:', error);
    return NextResponse.json({ error: 'Failed to refresh Seer analytics rollup' }, { status: 500 });
  }
}
