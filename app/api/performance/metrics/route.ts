import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';

export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;

  try {
    const { searchParams } = new URL(request.url);
    const metric = searchParams.get('metric');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100); // Cap at 100, default to 50

    // Validate parsed number
    if (isNaN(limit) || limit < 1) {
      return NextResponse.json(
        { error: 'Invalid limit parameter' },
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

  try {
    const body = await request.json();
    const { metricName, value, metadata } = body;

    const result = await query(
      `INSERT INTO performance_metrics (metric_name, value, metadata, timestamp)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [metricName, value, JSON.stringify(metadata || {})]
    );

    return NextResponse.json({ success: true, metric: result.rows[0] });
  } catch (error) {
    console.error('[Performance Metrics POST] Error:', error);
    return NextResponse.json({ error: 'Failed to log metric' }, { status: 500 });
  }
}
