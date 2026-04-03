import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { requireAdmin } from '@/lib/auth/middleware';
import { logger } from '@/lib/logger';
import { z } from 'zod4';

const MAX_METRIC_NAME_LENGTH = 100;
const MAX_METADATA_BYTES = 10_000;
const DEFAULT_METRICS_GET_LIMIT = 50;
const MAX_METRICS_GET_LIMIT = 100;

const performanceMetricSchema = z.object({
  metricName: z.string().trim().min(1).max(MAX_METRIC_NAME_LENGTH),
  value: z.number().finite(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

function byteLength(value: string): number {
  return Buffer.byteLength(value, 'utf8');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;

  // Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const rawMetric = searchParams.get('metric');
    const rawLimit = parseInt(searchParams.get('limit') || String(DEFAULT_METRICS_GET_LIMIT), 10);

    // Validate and bound parsed limit
    if (isNaN(rawLimit) || rawLimit <= 0) {
      return NextResponse.json(
        { error: 'Invalid limit parameter' },
        { status: 400 }
      );
    }

    const limit = Math.min(rawLimit, MAX_METRICS_GET_LIMIT);

    const metric = rawMetric?.trim() || null;

    if (metric && metric.length > MAX_METRIC_NAME_LENGTH) {
      return NextResponse.json(
        { error: `Invalid metric filter. Maximum ${MAX_METRIC_NAME_LENGTH} characters.` },
        { status: 400 }
      );
    }

    let sql = `SELECT * FROM performance_metrics`;
    const params: (string | number)[] = [];

    if (metric) {
      sql += ` WHERE metric_name = $1`;
      params.push(metric);
    }

    sql += ` ORDER BY timestamp DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await query(sql, params);

    return NextResponse.json({ metrics: result.rows });
  } catch (error) {
    logger.error('[Performance Metrics] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'write');
  if (rateLimit) return rateLimit;

  // Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    let body: z.infer<typeof performanceMetricSchema>;
    try {
      const rawBody = await request.json();
      if (!isRecord(rawBody)) {
        return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 });
      }

      const parsed = performanceMetricSchema.safeParse(rawBody);
      if (!parsed.success) {
        const issues = parsed.error.issues.map((issue) => String(issue.path[0] || ''));

        if (issues.includes('metricName')) {
          return NextResponse.json(
            { error: `Invalid metricName. Must be 1-${MAX_METRIC_NAME_LENGTH} characters.` },
            { status: 400 }
          );
        }

        if (issues.includes('value')) {
          return NextResponse.json(
            { error: 'Invalid value. Must be a finite number.' },
            { status: 400 }
          );
        }

        if (issues.includes('metadata')) {
          return NextResponse.json(
            { error: 'Invalid metadata. Must be a JSON object.' },
            { status: 400 }
          );
        }

        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
      }
      body = parsed.data;
    } catch (error) {
      logger.debug('[Performance Metrics POST] Invalid JSON payload', error);
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const { metricName: rawMetricName, value, metadata } = body;

    const metricName = rawMetricName.trim();

    const serializedMetadata = JSON.stringify(metadata || {});
    if (byteLength(serializedMetadata) > MAX_METADATA_BYTES) {
      return NextResponse.json(
        { error: `Metadata too large. Maximum ${MAX_METADATA_BYTES} bytes allowed.` },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO performance_metrics (metric_name, value, metadata, timestamp)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [metricName, value, serializedMetadata]
    );

    return NextResponse.json({ success: true, metric: result.rows[0] });
  } catch (error) {
    logger.error('[Performance Metrics POST] Error:', error);
    return NextResponse.json({ error: 'Failed to log metric' }, { status: 500 });
  }
}
