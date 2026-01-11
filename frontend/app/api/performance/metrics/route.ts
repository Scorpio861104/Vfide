import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const metric = searchParams.get('metric');
    const limit = parseInt(searchParams.get('limit') || '100');

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
