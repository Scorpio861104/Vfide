import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { checkRateLimit } from '@/lib/api-validation';
import { requireAuth } from '@/lib/auth-middleware';
import { apiLogger } from '@/lib/logger.service';

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = checkRateLimit(`analytics:${clientId}`, { maxRequests: 30, windowMs: 60000 });
    if (!rateLimit.success) {
      return rateLimit.errorResponse;
    }

    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get('eventType');
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '100');

    let sql = `SELECT * FROM analytics_events WHERE 1=1`;
    const params: (string | number)[] = [];

    if (eventType) {
      params.push(eventType);
      sql += ` AND event_type = $${params.length}`;
    }

    if (userId) {
      params.push(userId);
      sql += ` AND user_id = $${params.length}`;
    }

    params.push(limit);
    sql += ` ORDER BY timestamp DESC LIMIT $${params.length}`;

    const result = await query(sql, params);

    return NextResponse.json({ events: result.rows, total: result.rows.length });
  } catch (error) {
    apiLogger.error('Failed to fetch analytics', { error });
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = checkRateLimit(`analytics:post:${clientId}`, { maxRequests: 60, windowMs: 60000 });
    if (!rateLimit.success) {
      return rateLimit.errorResponse;
    }

    // Authentication (admin only - TODO: add admin check)
    const auth = await requireAuth(request);
    if (!auth.authenticated) {
      return auth.errorResponse;
    }

    const body = await request.json();
    const { userId, eventType, eventData } = body;

    if (!eventType) {
      return NextResponse.json({ error: 'eventType required' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO analytics_events (user_id, event_type, event_data, timestamp)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [userId, eventType, JSON.stringify(eventData || {})]
    );

    return NextResponse.json({ success: true, event: result.rows[0] });
  } catch (error) {
    apiLogger.error('Failed to log analytics event', { error });
    return NextResponse.json({ error: 'Failed to log event' }, { status: 500 });
  }
}
