import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { checkRateLimit } from '@/lib/api-validation';
import { requireAuth } from '@/lib/auth-middleware';
import { apiLogger } from '@/lib/logger.service';

export async function GET(request: NextRequest) {
  const clientId = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimit = checkRateLimit(`performance-metrics:${clientId}`, { maxRequests: 30, windowMs: 60000 });
  if (!rateLimit.success) return rateLimit.errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const metric = searchParams.get('metric');
    const limit = parseInt(searchParams.get('limit') || '100');

    if (limit < 1 || limit > 1000) {
      return NextResponse.json({ error: 'Limit must be between 1 and 1000' }, { status: 400 });
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
    apiLogger.error('Failed to fetch performance metrics', { error });
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const clientId = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimit = checkRateLimit(`performance-metrics-post:${clientId}`, { maxRequests: 60, windowMs: 60000 });
  if (!rateLimit.success) return rateLimit.errorResponse;

  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.errorResponse;

  try {
    const body = await request.json();
    const { metricName, value, metadata } = body;

    if (!metricName || value === undefined) {
      return NextResponse.json({ error: 'metricName and value required' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO performance_metrics (metric_name, value, metadata, timestamp)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [metricName, value, JSON.stringify(metadata || {})]
    );

    return NextResponse.json({ success: true, metric: result.rows[0] });
  } catch (error) {
    apiLogger.error('Failed to log performance metric', { error });
    return NextResponse.json({ error: 'Failed to log metric' }, { status: 500 });
  }
}
