import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, withAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { z } from 'zod4';
import type { JWTPayload } from '@/lib/auth/jwt';

// Constants
const MAX_ACTIVITIES_LIMIT = 100;
const MAX_ACTIVITIES_OFFSET = 10000;
const DEFAULT_ACTIVITIES_LIMIT = 50;
const MAX_ACTIVITY_TYPE_LENGTH = 64;
const MAX_ACTIVITY_TITLE_LENGTH = 200;
const MAX_ACTIVITY_DESCRIPTION_LENGTH = 2000;
const MAX_ACTIVITY_DATA_BYTES = 10000;
const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

const createActivitySchema = z.object({
  userAddress: z.string().trim().regex(ETH_ADDRESS_REGEX),
  activityType: z.string().trim().min(1).max(MAX_ACTIVITY_TYPE_LENGTH),
  title: z.string().trim().min(1).max(MAX_ACTIVITY_TITLE_LENGTH),
  description: z.string().max(MAX_ACTIVITY_DESCRIPTION_LENGTH).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

function isDatabaseUnavailableError(error: unknown): boolean {
  const stack: unknown[] = [error];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    const asRecord = typeof current === 'object' ? current as Record<string, unknown> : null;
    const message = current instanceof Error
      ? current.message.toLowerCase()
      : String(current).toLowerCase();
    const code = typeof asRecord?.code === 'string' ? asRecord.code.toLowerCase() : '';

    if (
      code === 'econnrefused' ||
      code === '57p01' ||
      code === '42p01' ||
      code === '42703' ||
      message.includes('econnrefused') ||
      message.includes('database query failed') ||
      message.includes('connect') ||
      message.includes('connection terminated') ||
      message.includes('timeout expired') ||
      message.includes('does not exist')
    ) {
      return true;
    }

    const cause = asRecord?.cause;
    if (cause) stack.push(cause);

    const errors = asRecord?.errors;
    if (Array.isArray(errors)) {
      for (const nested of errors) stack.push(nested);
    }
  }

  return false;
}

function parseStrictIntegerParam(value: string | null): number | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return Number.parseInt(trimmed, 10);
}

interface Activity {
  id: number;
  user_id: number;
  activity_type: string;
  title: string;
  description: string;
  data: Record<string, unknown>;
  created_at: string;
  user_address?: string;
  user_username?: string;
  user_avatar?: string;
}

/**
 * GET /api/activities?userAddress=0x...&type=vote&limit=50&offset=0
 * Get activity feed
 */
export const GET = withAuth(async (request: NextRequest, user: JWTPayload) => {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;

  try {
    const searchParams = request.nextUrl.searchParams;
    const userAddressParam = searchParams.get('userAddress');
    const activityTypeParam = searchParams.get('type');
    const parsedLimit = parseStrictIntegerParam(searchParams.get('limit'));
    const parsedOffset = parseStrictIntegerParam(searchParams.get('offset'));

    if (
      (searchParams.get('limit') !== null && parsedLimit === null) ||
      (searchParams.get('offset') !== null && parsedOffset === null)
    ) {
      return NextResponse.json(
        { error: `Invalid limit or offset parameter. Limit must be 1-${MAX_ACTIVITIES_LIMIT}, offset must be >= 0` },
        { status: 400 }
      );
    }

    const limit = parsedLimit ?? DEFAULT_ACTIVITIES_LIMIT;
    const offset = Math.min(Math.max(parsedOffset ?? 0, 0), MAX_ACTIVITIES_OFFSET);

    if (limit <= 0 || limit > MAX_ACTIVITIES_LIMIT) {
      return NextResponse.json(
        { error: `Invalid limit or offset parameter. Limit must be 1-${MAX_ACTIVITIES_LIMIT}, offset must be >= 0` },
        { status: 400 }
      );
    }

    const userAddress = typeof userAddressParam === 'string' ? userAddressParam.trim().toLowerCase() : null;
    if (userAddress && !ETH_ADDRESS_REGEX.test(userAddress)) {
      return NextResponse.json(
        { error: 'Invalid userAddress format' },
        { status: 400 }
      );
    }

    const activityType = typeof activityTypeParam === 'string' ? activityTypeParam.trim().toLowerCase() : null;
    if (activityType && activityType.length > MAX_ACTIVITY_TYPE_LENGTH) {
      return NextResponse.json(
        { error: `type too long. Maximum ${MAX_ACTIVITY_TYPE_LENGTH} characters.` },
        { status: 400 }
      );
    }

    if (userAddress) {
      const requesterAddress = typeof user?.address === 'string'
        ? user.address.trim().toLowerCase()
        : '';
      if (!requesterAddress || !ETH_ADDRESS_REGEX.test(requesterAddress)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const targetAddress = userAddress;
      const canAccess = requesterAddress === targetAddress || isAdmin(user);
      if (!canAccess) {
        return NextResponse.json(
          { error: 'You can only view your own activities' },
          { status: 403 }
        );
      }
    }

    const result = await query<Activity>(
      `SELECT
        a.*,
        u.wallet_address as user_address,
        u.username as user_username,
        u.avatar_url as user_avatar
      FROM activities a
      JOIN users u ON a.user_id = u.id
      WHERE ($1::text IS NULL OR u.wallet_address = $1)
        AND ($2::text IS NULL OR a.activity_type = $2)
      ORDER BY a.created_at DESC
      LIMIT $3 OFFSET $4`,
      [userAddress, activityType, limit, offset]
    );

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM activities a
       JOIN users u ON a.user_id = u.id
       WHERE ($1::text IS NULL OR u.wallet_address = $1)
         AND ($2::text IS NULL OR a.activity_type = $2)`,
      [userAddress, activityType]
    );

    const totalCount = parseInt(countResult.rows[0]?.count || '0', 10);
    if (isNaN(totalCount)) {
      return NextResponse.json(
        { error: 'Failed to get total count' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      activities: result.rows,
      total: totalCount,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('[Activities GET API] Error:', error);

    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json({
        activities: [],
        total: 0,
        limit: DEFAULT_ACTIVITIES_LIMIT,
        offset: 0,
        degraded: true,
      });
    }

    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/activities
 * Create a new activity entry
 */
export const POST = withAuth(async (request: NextRequest, user: JWTPayload) => {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'write');
  if (rateLimit) return rateLimit;

  // Authentication
  const requesterAddress = typeof user?.address === 'string'
    ? user.address.trim().toLowerCase()
    : '';
  if (!requesterAddress || !ETH_ADDRESS_REGEX.test(requesterAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof createActivitySchema>;
  try {
    const rawBody = await request.json();
    const parsed = createActivitySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    body = parsed.data;
  } catch (error) {
    logger.debug('[Activities POST] Invalid JSON body', error);
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  try {
    const { userAddress, activityType, title, description, data } = body;

    const normalizedUserAddress = userAddress.toLowerCase().trim();

    const normalizedActivityType = activityType.trim().toLowerCase();
    const normalizedTitle = title.trim();

    const normalizedDescription = typeof description === 'string' ? description : '';

    const serializedData = data ? JSON.stringify(data) : null;
    if (serializedData && serializedData.length > MAX_ACTIVITY_DATA_BYTES) {
      return NextResponse.json(
        { error: `data too large. Maximum ${MAX_ACTIVITY_DATA_BYTES} bytes allowed.` },
        { status: 400 }
      );
    }

    if (requesterAddress !== normalizedUserAddress) {
      return NextResponse.json(
        { error: 'You can only create activities for your own address' },
        { status: 403 }
      );
    }

    // Get user ID
    const userResult = await query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [normalizedUserAddress]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = userResult.rows[0]?.id;
    if (!userId) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Insert activity
    const result = await query<Activity>(
      `INSERT INTO activities (user_id, activity_type, title, description, data)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, normalizedActivityType, normalizedTitle, normalizedDescription, serializedData]
    );

    return NextResponse.json({
      success: true,
      activity: result.rows[0],
    }, { status: 201 });
  } catch (error) {
    logger.error('[Activities POST API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create activity' },
      { status: 500 }
    );
  }
});
