import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { requireAdmin } from '@/lib/auth/middleware';

const MAX_METRIC_NAME_LENGTH = 100;
const MAX_METADATA_BYTES = 10_000;
const DEFAULT_METRICS_GET_LIMIT = 50;
const MAX_METRICS_GET_LIMIT = 100;

function isObjectRecord(value: unknown): value is Record<string, unknown> {
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
    const metric = searchParams.get('metric');
    const rawLimit = parseInt(searchParams.get('limit') || String(DEFAULT_METRICS_GET_LIMIT), 10);

    // Validate and bound parsed limit
    if (isNaN(rawLimit) || rawLimit <= 0) {
      return NextResponse.json(
        { error: 'Invalid limit parameter' },
        { status: 400 }
      );
    }

    const limit = Math.min(rawLimit, MAX_METRICS_GET_LIMIT);

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
    console.error('[Performance Metrics] Error:', error);
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
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    if (!isObjectRecord(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { metricName, value, metadata } = body;

    if (typeof metricName !== 'string' || metricName.trim().length === 0 || metricName.length > MAX_METRIC_NAME_LENGTH) {
      return NextResponse.json(
        { error: `Invalid metricName. Must be a non-empty string up to ${MAX_METRIC_NAME_LENGTH} characters.` },
        { status: 400 }
      );
    }

    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return NextResponse.json(
        { error: 'Invalid value. Must be a finite number.' },
        { status: 400 }
      );
    }

    if (metadata !== undefined && !isObjectRecord(metadata)) {
      return NextResponse.json(
        { error: 'Invalid metadata. Must be an object if provided.' },
        { status: 400 }
      );
    }

    const serializedMetadata = JSON.stringify(metadata || {});
    if (serializedMetadata.length > MAX_METADATA_BYTES) {
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
    console.error('[Performance Metrics POST] Error:', error);
    return NextResponse.json({ error: 'Failed to log metric' }, { status: 500 });
  }
}
