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

// API-PERF-1 FIX: Browser RUM emitter (lib/performance.ts) sends:
//   { metric: { name, value, rating, delta, id, navigationType }, timestamp, url }
// Previous schema expected { metricName, value, metadata } AND required admin auth,
// so the route was non-functional end-to-end (every client POST returned 401).
// Reconciled here:
//   - GET stays admin-only (reads aggregated metrics for ops dashboard)
//   - POST accepts the browser emitter shape, no auth required (diagnostic write)
//   - POST is rate-limited (write tier: 30/min) and origin-validated by proxy.ts CORS
//   - POST is exempt from CSRF (browser emits via keepalive without cookies); add to
//     CSRF_EXEMPT_API_PATHS if not already covered. This route is now in the
//     write-only-from-same-origin diagnostic class.
const browserMetricSchema = z.object({
  metric: z.object({
    name: z.string().trim().min(1).max(MAX_METRIC_NAME_LENGTH),
    value: z.number().finite(),
    rating: z.enum(['good', 'needs-improvement', 'poor']).optional(),
    delta: z.number().finite().optional(),
    id: z.string().max(200).optional(),
    navigationType: z.string().max(50).optional(),
  }),
  timestamp: z.number().int().nonnegative().optional(),
  url: z.string().url().max(2048).optional(),
});

const performanceMetricSchema = z.object({
  metricName: z.string().trim().min(1).max(MAX_METRIC_NAME_LENGTH),
  value: z.number().finite(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

function byteLength(value: string): number {
  return Buffer.byteLength(value, 'utf8');
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
  // Rate limiting (write tier: 30/min — adequate for browser RUM emissions)
  const rateLimit = await withRateLimit(request, 'write');
  if (rateLimit) return rateLimit;

  // API-PERF-1 FIX: NO admin auth here. This is a diagnostic write endpoint that
  // accepts browser RUM emissions (web-vitals, lib/performance.ts). proxy.ts already
  // enforces same-origin via getAllowedOrigin() for /api/ routes, so cross-origin
  // emissions are blocked at the edge. CSRF is bypassed because keepalive POST from
  // unload handlers cannot include cookies; the route is write-only with strict
  // schema validation.

  try {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch (error) {
      logger.debug('[Performance Metrics POST] Invalid JSON payload', error);
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    // Try browser RUM shape first (the actual production emitter), then fall back to
    // legacy admin shape for any callers still using { metricName, value, metadata }.
    const browserParsed = browserMetricSchema.safeParse(rawBody);
    let metricName: string;
    let value: number;
    let metadata: Record<string, unknown>;

    if (browserParsed.success) {
      const { metric, timestamp, url } = browserParsed.data;
      metricName = metric.name;
      value = metric.value;
      metadata = {
        rating: metric.rating ?? null,
        delta: metric.delta ?? null,
        id: metric.id ?? null,
        navigationType: metric.navigationType ?? null,
        timestamp: timestamp ?? Date.now(),
        url: url ?? null,
      };
    } else {
      const legacyParsed = performanceMetricSchema.safeParse(rawBody);
      if (!legacyParsed.success) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
      }
      metricName = legacyParsed.data.metricName.trim();
      value = legacyParsed.data.value;
      metadata = legacyParsed.data.metadata ?? {};
    }

    const serializedMetadata = JSON.stringify(metadata);
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
