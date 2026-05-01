import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import type { JWTPayload } from '@/lib/auth/jwt';

import { logger } from '@/lib/logger';

const DEFAULT_WINDOW_HOURS = 24 * 7;
const MAX_WINDOW_HOURS = 24 * 90;
const MIN_WINDOW_HOURS = 1;

function isDatabaseUnavailableError(error: unknown): boolean {
  const stack: unknown[] = [error];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    const asRecord = typeof current === 'object' ? current as Record<string, unknown> : null;
    const message = current instanceof Error
      ? current.message.toLowerCase()
      : String(current).toLowerCase();
    const code = typeof asRecord?.code === 'string' ? asRecord.code.toLowerCase() : '';

    if (
      code === 'econnrefused' ||
      code === '57p01' ||
      code === '28p01' ||
      code === '42p01' ||
      code === '42703' ||
      message.includes('econnrefused') ||
      message.includes('database query failed') ||
      message.includes('password authentication failed') ||
      message.includes('connect') ||
      message.includes('connection terminated') ||
      message.includes('timeout expired') ||
      message.includes('does not exist')
    ) {
      return true;
    }

    const cause = asRecord?.cause;
    if (cause) stack.push(cause);

    const errors = asRecord?.errors;
    if (Array.isArray(errors)) {
      for (const nested of errors) stack.push(nested);
    }
  }

  return false;
}

function parseWindowHours(raw: string | null): number | null {
  if (raw === null) return DEFAULT_WINDOW_HOURS;
  if (!/^\d+$/.test(raw.trim())) return null;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < MIN_WINDOW_HOURS) return null;

  return Math.min(parsed, MAX_WINDOW_HOURS);
}

export const GET = withAuth(async (request: NextRequest, user: JWTPayload) => {
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;
  try {
    const { searchParams } = new URL(request.url);
    const windowHours = parseWindowHours(searchParams.get('windowHours'));

    if (windowHours === null) {
      return NextResponse.json(
        { error: `Invalid windowHours. Must be an integer >= ${MIN_WINDOW_HOURS}.` },
        { status: 400 }
      );
    }

    const summarySqlRollup = `
      WITH bounds AS (
        SELECT
          NOW() - ($1::int * INTERVAL '1 hour') AS window_start,
          NOW() AS window_end,
          DATE_TRUNC('day', NOW())::date AS today,
          DATE_TRUNC('day', NOW() - ($1::int * INTERVAL '1 hour'))::date AS start_day
      ),
      rollup_part AS (
        SELECT
          COALESCE(SUM(r.total_events), 0)::int AS total_events,
          COALESCE(SUM(r.allowed_events), 0)::int AS allowed_events,
          COALESCE(SUM(r.warned_events), 0)::int AS warned_events,
          COALESCE(SUM(r.delayed_events), 0)::int AS delayed_events,
          COALESCE(SUM(r.blocked_events), 0)::int AS blocked_events,
          COALESCE(SUM(r.score_set_events), 0)::int AS score_set_events,
          COALESCE(SUM(r.appeals_opened), 0)::int AS appeals_opened,
          COALESCE(SUM(r.appeals_resolved), 0)::int AS appeals_resolved,
          COALESCE(SUM(r.unique_subjects), 0)::int AS unique_subjects,
          COALESCE(AVG(r.avg_score_delta_abs), 0)::float8 AS avg_score_delta_abs,
          COALESCE(AVG(r.avg_confidence), 0)::float8 AS avg_confidence
        FROM seer_analytics_daily_rollup r
        JOIN bounds b ON r.day >= b.start_day AND r.day < b.today
      ),
      raw_part AS (
        SELECT
          COUNT(*)::int AS total_events,
          COUNT(*) FILTER (WHERE event_type = 'seer_action_allowed')::int AS allowed_events,
          COUNT(*) FILTER (WHERE event_type = 'seer_action_warned')::int AS warned_events,
          COUNT(*) FILTER (WHERE event_type = 'seer_action_delayed')::int AS delayed_events,
          COUNT(*) FILTER (WHERE event_type = 'seer_action_blocked')::int AS blocked_events,
          COUNT(*) FILTER (WHERE event_type = 'seer_score_set')::int AS score_set_events,
          COUNT(*) FILTER (WHERE event_type = 'seer_appeal_opened')::int AS appeals_opened,
          COUNT(*) FILTER (WHERE event_type = 'seer_appeal_resolved')::int AS appeals_resolved,
          COUNT(DISTINCT user_id)::int AS unique_subjects,
          COALESCE(
            AVG(
              CASE
                WHEN (event_data ->> 'score_delta') ~ '^-?[0-9]+(\\.[0-9]+)?$'
                THEN ABS((event_data ->> 'score_delta')::numeric)
              END
            ),
            0
          )::float8 AS avg_score_delta_abs,
          COALESCE(
            AVG(
              CASE
                WHEN (event_data ->> 'confidence') ~ '^[0-9]+(\\.[0-9]+)?$'
                THEN (event_data ->> 'confidence')::numeric
              END
            ),
            0
          )::float8 AS avg_confidence
        FROM analytics_events, bounds b
        WHERE event_type LIKE 'seer_%'
          AND timestamp >= GREATEST(b.window_start, b.today::timestamp)
          AND timestamp <= b.window_end
      )
      SELECT
        (r.total_events + p.total_events)::int AS total_events,
        (r.allowed_events + p.allowed_events)::int AS allowed_events,
        (r.warned_events + p.warned_events)::int AS warned_events,
        (r.delayed_events + p.delayed_events)::int AS delayed_events,
        (r.blocked_events + p.blocked_events)::int AS blocked_events,
        (r.score_set_events + p.score_set_events)::int AS score_set_events,
        (r.appeals_opened + p.appeals_opened)::int AS appeals_opened,
        (r.appeals_resolved + p.appeals_resolved)::int AS appeals_resolved,
        (r.unique_subjects + p.unique_subjects)::int AS unique_subjects,
        CASE
          WHEN r.total_events + p.total_events > 0
            THEN ((r.avg_score_delta_abs * NULLIF(r.total_events, 0)) + (p.avg_score_delta_abs * NULLIF(p.total_events, 0))) / NULLIF((r.total_events + p.total_events), 0)
          ELSE 0
        END::float8 AS avg_score_delta_abs,
        CASE
          WHEN r.total_events + p.total_events > 0
            THEN ((r.avg_confidence * NULLIF(r.total_events, 0)) + (p.avg_confidence * NULLIF(p.total_events, 0))) / NULLIF((r.total_events + p.total_events), 0)
          ELSE 0
        END::float8 AS avg_confidence
      FROM rollup_part r
      CROSS JOIN raw_part p;
    `;

    const trendSqlRollup = `
      WITH bounds AS (
        SELECT
          NOW() - ($1::int * INTERVAL '1 hour') AS window_start,
          NOW() AS window_end,
          DATE_TRUNC('day', NOW())::date AS today,
          DATE_TRUNC('day', NOW() - ($1::int * INTERVAL '1 hour'))::date AS start_day
      ),
      rollup_rows AS (
        SELECT
          r.day::timestamp AS day,
          r.total_events,
          r.blocked_events,
          r.delayed_events,
          r.allowed_events
        FROM seer_analytics_daily_rollup r
        JOIN bounds b ON r.day >= b.start_day AND r.day < b.today
      ),
      raw_rows AS (
        SELECT
          DATE_TRUNC('day', timestamp) AS day,
          COUNT(*)::int AS total_events,
          COUNT(*) FILTER (WHERE event_type = 'seer_action_blocked')::int AS blocked_events,
          COUNT(*) FILTER (WHERE event_type = 'seer_action_delayed')::int AS delayed_events,
          COUNT(*) FILTER (WHERE event_type = 'seer_action_allowed')::int AS allowed_events
        FROM analytics_events, bounds b
        WHERE event_type LIKE 'seer_%'
          AND timestamp >= GREATEST(b.window_start, b.today::timestamp)
          AND timestamp <= b.window_end
        GROUP BY DATE_TRUNC('day', timestamp)
      ),
      merged AS (
        SELECT * FROM rollup_rows
        UNION ALL
        SELECT * FROM raw_rows
      )
      SELECT
        day,
        SUM(total_events)::int AS total_events,
        SUM(blocked_events)::int AS blocked_events,
        SUM(delayed_events)::int AS delayed_events,
        SUM(allowed_events)::int AS allowed_events
      FROM merged
      GROUP BY day
      ORDER BY day DESC
      LIMIT 14;
    `;

    const reasonCodeSqlRollup = `
      WITH bounds AS (
        SELECT
          NOW() - ($1::int * INTERVAL '1 hour') AS window_start,
          NOW() AS window_end,
          DATE_TRUNC('day', NOW())::date AS today,
          DATE_TRUNC('day', NOW() - ($1::int * INTERVAL '1 hour'))::date AS start_day
      ),
      rollup_part AS (
        SELECT
          reason_code,
          SUM(count)::int AS count
        FROM seer_reason_code_daily_rollup rr
        JOIN bounds b ON rr.day >= b.start_day AND rr.day < b.today
        GROUP BY reason_code
      ),
      raw_part AS (
        SELECT
          COALESCE(event_data ->> 'reasonCode', event_data ->> 'reason_code') AS reason_code,
          COUNT(*)::int AS count
        FROM analytics_events, bounds b
        WHERE event_type IN ('seer_reason_code', 'seer_action_blocked', 'seer_action_delayed', 'seer_action_warned')
          AND timestamp >= GREATEST(b.window_start, b.today::timestamp)
          AND timestamp <= b.window_end
          AND COALESCE(event_data ->> 'reasonCode', event_data ->> 'reason_code') IS NOT NULL
        GROUP BY COALESCE(event_data ->> 'reasonCode', event_data ->> 'reason_code')
      ),
      merged AS (
        SELECT reason_code, count FROM rollup_part
        UNION ALL
        SELECT reason_code, count FROM raw_part
      )
      SELECT reason_code, SUM(count)::int AS count
      FROM merged
      GROUP BY reason_code
      ORDER BY count DESC
      LIMIT 5;
    `;

    const summarySqlRawFallback = `
      WITH filtered AS (
        SELECT event_type, event_data, user_id
        FROM analytics_events
        WHERE event_type LIKE 'seer_%'
          AND timestamp >= NOW() - ($1::int * INTERVAL '1 hour')
      )
      SELECT
        COUNT(*)::int AS total_events,
        COUNT(*) FILTER (WHERE event_type = 'seer_action_allowed')::int AS allowed_events,
        COUNT(*) FILTER (WHERE event_type = 'seer_action_warned')::int AS warned_events,
        COUNT(*) FILTER (WHERE event_type = 'seer_action_delayed')::int AS delayed_events,
        COUNT(*) FILTER (WHERE event_type = 'seer_action_blocked')::int AS blocked_events,
        COUNT(*) FILTER (WHERE event_type = 'seer_score_set')::int AS score_set_events,
        COUNT(*) FILTER (WHERE event_type = 'seer_appeal_opened')::int AS appeals_opened,
        COUNT(*) FILTER (WHERE event_type = 'seer_appeal_resolved')::int AS appeals_resolved,
        COUNT(DISTINCT user_id)::int AS unique_subjects,
        COALESCE(
          AVG(
            CASE
              WHEN (event_data ->> 'score_delta') ~ '^-?[0-9]+(\\.[0-9]+)?$'
              THEN ABS((event_data ->> 'score_delta')::numeric)
            END
          ),
          0
        )::float8 AS avg_score_delta_abs,
        COALESCE(
          AVG(
            CASE
              WHEN (event_data ->> 'confidence') ~ '^[0-9]+(\\.[0-9]+)?$'
              THEN (event_data ->> 'confidence')::numeric
            END
          ),
          0
        )::float8 AS avg_confidence
      FROM filtered;
    `;

    const trendSqlRawFallback = `
      WITH filtered AS (
        SELECT event_type, timestamp
        FROM analytics_events
        WHERE event_type LIKE 'seer_%'
          AND timestamp >= NOW() - ($1::int * INTERVAL '1 hour')
      )
      SELECT
        DATE_TRUNC('day', timestamp) AS day,
        COUNT(*)::int AS total_events,
        COUNT(*) FILTER (WHERE event_type = 'seer_action_blocked')::int AS blocked_events,
        COUNT(*) FILTER (WHERE event_type = 'seer_action_delayed')::int AS delayed_events,
        COUNT(*) FILTER (WHERE event_type = 'seer_action_allowed')::int AS allowed_events
      FROM filtered
      GROUP BY DATE_TRUNC('day', timestamp)
      ORDER BY day DESC
      LIMIT 14;
    `;

    const reasonCodeSqlRawFallback = `
      WITH filtered AS (
        SELECT event_data
        FROM analytics_events
        WHERE event_type IN ('seer_reason_code', 'seer_action_blocked', 'seer_action_delayed', 'seer_action_warned')
          AND timestamp >= NOW() - ($1::int * INTERVAL '1 hour')
      )
      SELECT
        COALESCE(event_data ->> 'reasonCode', event_data ->> 'reason_code') AS reason_code,
        COUNT(*)::int AS count
      FROM filtered
      WHERE COALESCE(event_data ->> 'reasonCode', event_data ->> 'reason_code') IS NOT NULL
      GROUP BY COALESCE(event_data ->> 'reasonCode', event_data ->> 'reason_code')
      ORDER BY count DESC
      LIMIT 5;
    `;

    let summaryResult;
    let trendResult;
    let reasonCodeResult;

    try {
      [summaryResult, trendResult, reasonCodeResult] = await Promise.all([
        query(summarySqlRollup, [windowHours]),
        query(trendSqlRollup, [windowHours]),
        query(reasonCodeSqlRollup, [windowHours]),
      ]);
    } catch (error) {
      logger.debug('[Seer Analytics] Falling back to raw analytics query set', error);
      [summaryResult, trendResult, reasonCodeResult] = await Promise.all([
        query(summarySqlRawFallback, [windowHours]),
        query(trendSqlRawFallback, [windowHours]),
        query(reasonCodeSqlRawFallback, [windowHours]),
      ]);
    }

    const summary = summaryResult.rows[0] ?? {
      total_events: 0,
      allowed_events: 0,
      warned_events: 0,
      delayed_events: 0,
      blocked_events: 0,
      score_set_events: 0,
      appeals_opened: 0,
      appeals_resolved: 0,
      unique_subjects: 0,
      avg_score_delta_abs: 0,
      avg_confidence: 0,
    };

    const guardedActions = Number(summary.allowed_events) + Number(summary.warned_events) + Number(summary.delayed_events) + Number(summary.blocked_events);
    const blockedRate = guardedActions > 0 ? Number(summary.blocked_events) / guardedActions : 0;
    const delayedRate = guardedActions > 0 ? Number(summary.delayed_events) / guardedActions : 0;
    const appealResolutionRate = Number(summary.appeals_opened) > 0
      ? Number(summary.appeals_resolved) / Number(summary.appeals_opened)
      : 0;

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      windowHours,
      summary: {
        totalEvents: Number(summary.total_events) || 0,
        allowedEvents: Number(summary.allowed_events) || 0,
        warnedEvents: Number(summary.warned_events) || 0,
        delayedEvents: Number(summary.delayed_events) || 0,
        blockedEvents: Number(summary.blocked_events) || 0,
        scoreSetEvents: Number(summary.score_set_events) || 0,
        appealsOpened: Number(summary.appeals_opened) || 0,
        appealsResolved: Number(summary.appeals_resolved) || 0,
        uniqueSubjects: Number(summary.unique_subjects) || 0,
        avgScoreDeltaAbs: Number(summary.avg_score_delta_abs) || 0,
        avgConfidence: Number(summary.avg_confidence) || 0,
        blockedRate,
        delayedRate,
        appealResolutionRate,
      },
      trends: trendResult.rows
        .map((row) => ({
          day: row.day instanceof Date ? row.day.toISOString() : String(row.day),
          totalEvents: Number(row.total_events) || 0,
          blockedEvents: Number(row.blocked_events) || 0,
          delayedEvents: Number(row.delayed_events) || 0,
          allowedEvents: Number(row.allowed_events) || 0,
        }))
        .reverse(),
      topReasonCodes: reasonCodeResult.rows.map((row) => ({
        code: String(row.reason_code || 'unknown'),
        count: Number(row.count) || 0,
      })),
    });
  } catch (error) {
    logger.error('[Seer Analytics] Error:', error);

    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json({
        generatedAt: new Date().toISOString(),
        windowHours: DEFAULT_WINDOW_HOURS,
        summary: {
          totalEvents: 0,
          allowedEvents: 0,
          warnedEvents: 0,
          delayedEvents: 0,
          blockedEvents: 0,
          scoreSetEvents: 0,
          appealsOpened: 0,
          appealsResolved: 0,
          uniqueSubjects: 0,
          avgScoreDeltaAbs: 0,
          avgConfidence: 0,
          blockedRate: 0,
          delayedRate: 0,
          appealResolutionRate: 0,
        },
        trends: [],
        topReasonCodes: [],
        degraded: true,
      });
    }

    return NextResponse.json({ error: 'Failed to fetch Seer analytics aggregates' }, { status: 500 });
  }
});
