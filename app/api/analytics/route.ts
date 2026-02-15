import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { requireAdmin, requireAuth } from '@/lib/auth/middleware';

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
  'performance',
  'user_signup',
  'user_login',
  'user_profile_view',
  'user_profile_edit',
  'message_sent',
  'message_edited',
  'message_deleted',
  'message_reaction',
  'group_created',
  'group_joined',
  'group_left',
  'group_invite_created',
  'group_invite_used',
  'session_start',
  'session_end',
  'search_query',
  'badge_earned',
  'badge_viewed',
  'page_load_time',
  'api_response_time',
  'error_occurred'
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
      const authResult = await requireAuth(request);
      if (authResult instanceof NextResponse) return authResult;
      if (authResult.user.address.toLowerCase() !== userId.toLowerCase()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      params.push(userId);
      conditions.push(`user_id = $${params.length}`);
    } else {
      const adminResult = await requireAdmin(request);
      if (adminResult instanceof NextResponse) return adminResult;
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
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const body = await request.json();
    const metrics = Array.isArray(body.metrics) ? body.metrics : null;

    if (metrics && metrics.length > 0) {
      // API-24 Fix: Limit batch size to prevent abuse
      if (metrics.length > 50) {
        return NextResponse.json(
          { error: 'Batch size cannot exceed 50 events' },
          { status: 400 }
        );
      }

      const values: Array<string | number | boolean | Date | null | undefined | unknown[]> = [];
      const placeholders = (metrics as Array<{
        event?: string;
        properties?: Record<string, unknown>;
        value?: unknown;
        sessionId?: string;
        timestamp?: number;
      }>).map((metric, index) => {
        // API-23 Fix: Validate event type in batch path
        const eventType = String(metric.event || 'performance');
        if (!VALID_EVENT_TYPES.includes(eventType)) {
          throw new Error(`Invalid event type: ${eventType}`);
        }

        // API-24 Fix: Limit event_data size
        const eventData = JSON.stringify({
          ...(metric.properties || {}),
          value: metric.value,
          sessionId: metric.sessionId,
        });
        if (eventData.length > 5000) {
          throw new Error('Event data too large');
        }

        const baseIndex = index * 4;
        values.push(
          authResult.user.address,
          eventType,
          eventData,
          new Date(metric.timestamp || Date.now()).toISOString()
        );
        return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4})`;
      });

      await query(
        `INSERT INTO analytics_events (user_id, event_type, event_data, timestamp)
         VALUES ${placeholders.join(', ')}`,
        values
      );

      return NextResponse.json({ success: true });
    }

    const { userId, eventType, eventData } = body;

    if (!eventType) {
      return NextResponse.json({ error: 'eventType required' }, { status: 400 });
    }

    if (!VALID_EVENT_TYPES.includes(eventType)) {
      return NextResponse.json(
        { error: `Invalid event type. Must be one of: ${VALID_EVENT_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (userId && authResult.user.address.toLowerCase() !== String(userId).toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const resolvedUserId = authResult.user.address || userId || null;

    const result = await query(
      `INSERT INTO analytics_events (user_id, event_type, event_data, timestamp)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [resolvedUserId, eventType, JSON.stringify(eventData || {})]
    );

    return NextResponse.json({ success: true, event: result.rows[0] });
  } catch (error) {
    console.error('[Analytics POST] Error:', error);
    return NextResponse.json({ error: 'Failed to log event' }, { status: 500 });
  }
}
