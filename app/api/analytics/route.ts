import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';

// Constants for validation
const MAX_ANALYTICS_LIMIT = 1000;
const DEFAULT_ANALYTICS_LIMIT = 100;
const VALID_EVENT_TYPES = [
  'page_view',
  'wallet_connect',
  'transaction',
  'quest_complete',
  'achievement_unlock',
  'social_interaction',
  'error',
  'performance'
];

export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;

  try {
    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get('eventType');
    const userId = searchParams.get('userId');
    const limitParam = searchParams.get('limit');
    
    // Parse and validate limit with proper bounds
    const limit = limitParam 
      ? Math.min(Math.max(1, parseInt(limitParam, 10)), MAX_ANALYTICS_LIMIT)
      : DEFAULT_ANALYTICS_LIMIT;

    // Validate parsed number
    if (isNaN(limit)) {
      return NextResponse.json(
        { error: 'Invalid limit parameter' },
        { status: 400 }
      );
    }

    // Validate event type if provided
    if (eventType && !VALID_EVENT_TYPES.includes(eventType)) {
      return NextResponse.json(
        { error: `Invalid event type. Must be one of: ${VALID_EVENT_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Build query with proper parameterization
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (eventType) {
      params.push(eventType);
      conditions.push(`event_type = $${params.length}`);
    }

    if (userId) {
      params.push(userId);
      conditions.push(`user_id = $${params.length}`);
    }

    // Add limit parameter
    params.push(limit);
    
    // Construct safe SQL query
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM analytics_events ${whereClause} ORDER BY timestamp DESC LIMIT $${params.length}`;

    const result = await query(sql, params);

    return NextResponse.json({ events: result.rows, total: result.rows.length });
  } catch (error) {
    console.error('[Analytics] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'write');
  if (rateLimit) return rateLimit;

  try {
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
    console.error('[Analytics POST] Error:', error);
    return NextResponse.json({ error: 'Failed to log event' }, { status: 500 });
  }
}
