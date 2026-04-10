import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { requireAdmin, requireAuth } from '@/lib/auth/middleware';
import { logger } from '@/lib/logger';
import { z } from 'zod4';

// Constants for validation
const MAX_ANALYTICS_LIMIT = 1000;
const DEFAULT_ANALYTICS_LIMIT = 100;
const MAX_BATCH_METRICS = 200;
const MAX_EVENT_DATA_BYTES = 10000;
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
  'error_occurred',
  'seer_score_set',
  'seer_action_allowed',
  'seer_action_warned',
  'seer_action_delayed',
  'seer_action_blocked',
  'seer_reason_code',
  'seer_appeal_opened',
  'seer_appeal_resolved',
  'seer_policy_shadow_eval',
  'seer_service_view'
];

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function byteLength(value: string): number {
  return Buffer.byteLength(value, 'utf8');
}

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase();
}

function isAddressLike(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function parseStrictIntegerParam(value: string | null): number | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return Number.parseInt(trimmed, 10);
}

const analyticsBatchMetricSchema = z.object({
  event: z.string().optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
  value: z.unknown().optional(),
  sessionId: z.string().optional(),
  timestamp: z.number().finite().optional(),
});

const analyticsBatchSchema = z.object({
  metrics: z.array(analyticsBatchMetricSchema).min(1).max(MAX_BATCH_METRICS),
});

const analyticsSingleSchema = z.object({
  userId: z.union([z.string(), z.number()]).optional(),
  eventType: z.string().trim().min(1),
  eventData: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;

  try {
    const { searchParams } = new URL(request.url);
    const rawEventType = searchParams.get('eventType');
    const rawUserId = searchParams.get('userId');
    const limitParam = searchParams.get('limit');
    const eventType = rawEventType?.trim().toLowerCase() || null;
    const userId = rawUserId ? normalizeAddress(rawUserId) : null;

    const parsedLimit = parseStrictIntegerParam(limitParam);
    if (limitParam !== null && parsedLimit === null) {
      return NextResponse.json(
        { error: 'Invalid limit parameter' },
        { status: 400 }
      );
    }

    // Parse and validate limit with proper bounds
    const limit = parsedLimit === null
      ? DEFAULT_ANALYTICS_LIMIT
      : Math.min(Math.max(1, parsedLimit), MAX_ANALYTICS_LIMIT);

    // Validate event type if provided
    if (eventType && !VALID_EVENT_TYPES.includes(eventType)) {
      return NextResponse.json(
        { error: `Invalid event type. Must be one of: ${VALID_EVENT_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (userId && !isAddressLike(userId)) {
      return NextResponse.json({ error: 'Invalid userId format' }, { status: 400 });
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
      if (!authResult.user?.address || !isAddressLike(authResult.user.address)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (normalizeAddress(authResult.user.address) !== userId) {
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
    logger.error('[Analytics] Error:', error);
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

    let body: z.infer<typeof analyticsBatchSchema> | z.infer<typeof analyticsSingleSchema>;
    try {
      const rawBody = await request.json();
      if (isObjectRecord(rawBody) && Array.isArray(rawBody.metrics)) {
        const parsedBatch = analyticsBatchSchema.safeParse(rawBody);
        if (!parsedBatch.success) {
          return NextResponse.json({ error: 'Invalid batch metric payload' }, { status: 400 });
        }
        body = parsedBatch.data;
      } else {
        const parsedSingle = analyticsSingleSchema.safeParse(rawBody);
        if (!parsedSingle.success) {
          return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }
        body = parsedSingle.data;
      }
    } catch (error) {
      logger.debug('[Analytics POST] Invalid JSON payload', error);
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const metrics = 'metrics' in body && Array.isArray(body.metrics) ? body.metrics : null;

    if (metrics && metrics.length > 0) {
      if (metrics.length > MAX_BATCH_METRICS) {
        return NextResponse.json(
          { error: `Too many metrics in one request. Max ${MAX_BATCH_METRICS}.` },
          { status: 400 }
        );
      }

      const hasInvalidMetricShape = metrics.some((metric) => !isObjectRecord(metric));
      if (hasInvalidMetricShape) {
        return NextResponse.json(
          { error: 'Invalid batch metric payload' },
          { status: 400 }
        );
      }

      const invalidBatchEvent = (metrics as Array<{ event?: string }>).find(metric => {
        const eventType = String(metric.event || 'performance').trim().toLowerCase();
        return !VALID_EVENT_TYPES.includes(eventType);
      });

      if (invalidBatchEvent) {
        return NextResponse.json(
          { error: `Invalid event type in batch. Must be one of: ${VALID_EVENT_TYPES.join(', ')}` },
          { status: 400 }
        );
      }

      for (const metric of metrics as Array<{ timestamp?: number; properties?: Record<string, unknown>; value?: unknown; sessionId?: string }>) {
        if (metric.timestamp !== undefined && (typeof metric.timestamp !== 'number' || !Number.isFinite(metric.timestamp))) {
          return NextResponse.json(
            { error: 'Invalid metric timestamp in batch' },
            { status: 400 }
          );
        }

        if (typeof metric.timestamp === 'number' && Number.isNaN(new Date(metric.timestamp).getTime())) {
          return NextResponse.json(
            { error: 'Invalid metric timestamp in batch' },
            { status: 400 }
          );
        }

        if (metric.properties !== undefined && !isObjectRecord(metric.properties)) {
          return NextResponse.json(
            { error: 'Invalid metric properties in batch' },
            { status: 400 }
          );
        }

        const serializedEventData = JSON.stringify({
          ...(metric.properties || {}),
          value: metric.value,
          sessionId: metric.sessionId,
        });

        if (byteLength(serializedEventData) > MAX_EVENT_DATA_BYTES) {
          return NextResponse.json(
            { error: `Event data too large. Maximum ${MAX_EVENT_DATA_BYTES} bytes allowed.` },
            { status: 400 }
          );
        }
      }

      const values: Array<string | number | boolean | Date | null | undefined | unknown[]> = [];
      const placeholders = (metrics as Array<{
        event?: string;
        properties?: Record<string, unknown>;
        value?: unknown;
        sessionId?: string;
        timestamp?: number;
      }>).map((metric, index) => {
        const serializedEventData = JSON.stringify({
          ...(metric.properties || {}),
          value: metric.value,
          sessionId: metric.sessionId,
        });

        const baseIndex = index * 4;
        values.push(
          normalizeAddress(authResult.user.address),
          String(metric.event || 'performance').trim().toLowerCase(),
          serializedEventData,
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

    const singleEventBody = body as z.infer<typeof analyticsSingleSchema>;
    const { userId, eventType, eventData } = singleEventBody;

    const normalizedEventType = typeof eventType === 'string' ? eventType.trim().toLowerCase() : null;
    const normalizedUserId =
      typeof userId === 'string' || typeof userId === 'number'
        ? String(userId).trim().toLowerCase()
        : null;

    if (!normalizedEventType) {
      return NextResponse.json({ error: 'eventType required' }, { status: 400 });
    }

    if (!VALID_EVENT_TYPES.includes(normalizedEventType)) {
      return NextResponse.json(
        { error: `Invalid event type. Must be one of: ${VALID_EVENT_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (normalizedUserId && !isAddressLike(normalizedUserId)) {
      return NextResponse.json({ error: 'Invalid userId format' }, { status: 400 });
    }

    if (eventData !== undefined && !isObjectRecord(eventData)) {
      return NextResponse.json(
        { error: 'Invalid eventData. Must be an object if provided.' },
        { status: 400 }
      );
    }

    const serializedEventData = JSON.stringify(eventData || {});
    if (byteLength(serializedEventData) > MAX_EVENT_DATA_BYTES) {
      return NextResponse.json(
        { error: `Event data too large. Maximum ${MAX_EVENT_DATA_BYTES} bytes allowed.` },
        { status: 400 }
      );
    }

    if (!authResult.user?.address || !isAddressLike(authResult.user.address)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (normalizedUserId && normalizeAddress(authResult.user.address) !== normalizedUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const resolvedUserId = normalizeAddress(authResult.user.address) || normalizedUserId || null;

    const result = await query(
      `INSERT INTO analytics_events (user_id, event_type, event_data, timestamp)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [resolvedUserId, normalizedEventType, serializedEventData]
    );

    return NextResponse.json({ success: true, event: result.rows[0] });
  } catch (error) {
    logger.error('[Analytics POST] Error:', error);
    return NextResponse.json({ error: 'Failed to log event' }, { status: 500 });
  }
}
