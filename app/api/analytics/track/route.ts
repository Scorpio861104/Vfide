import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';

/**
 * POST /api/analytics/track
 * Track an analytics event
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, userId, metadata } = body;

    if (!type) {
      return NextResponse.json(
        { error: 'Event type is required' },
        { status: 400 }
      );
    }

    const client = await getClient();

    try {
      // Store analytics event in database
      await client.query(`
        INSERT INTO analytics_events (
          event_type,
          user_id,
          metadata,
          created_at
        )
        VALUES ($1, $2, $3, NOW())
      `, [type, userId, metadata ? JSON.stringify(metadata) : null]);

      return NextResponse.json({
        success: true,
        message: 'Event tracked successfully',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Analytics Track API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/analytics/track?type=xxx&userId=xxx&startTime=xxx&endTime=xxx
 * Get analytics events
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const userId = searchParams.get('userId');
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');

    const client = await getClient();

    try {
      let queryText = 'SELECT * FROM analytics_events WHERE 1=1';
      const params: any[] = [];
      let paramCount = 1;

      if (type) {
        queryText += ` AND event_type = $${paramCount}`;
        params.push(type);
        paramCount++;
      }

      if (userId) {
        queryText += ` AND user_id = $${paramCount}`;
        params.push(userId);
        paramCount++;
      }

      if (startTime) {
        queryText += ` AND created_at >= to_timestamp($${paramCount})`;
        params.push(parseInt(startTime) / 1000);
        paramCount++;
      }

      if (endTime) {
        queryText += ` AND created_at <= to_timestamp($${paramCount})`;
        params.push(parseInt(endTime) / 1000);
        paramCount++;
      }

      queryText += ' ORDER BY created_at DESC LIMIT 1000';

      const result = await client.query(queryText, params);

      return NextResponse.json({
        events: result.rows,
        count: result.rows.length,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Analytics Events API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}
