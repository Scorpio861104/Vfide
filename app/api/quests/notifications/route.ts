import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import { isAdmin, requireAuth } from '@/lib/auth/middleware';
import { z } from 'zod4';

const MAX_QUEST_NOTIFICATION_IDS = 500;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{3,64}$/;
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

const markQuestNotificationsSchema = z.object({
  notificationIds: z.array(z.string().trim().regex(UUID_REGEX)).min(1).max(MAX_QUEST_NOTIFICATION_IDS),
  userAddress: z.string().trim().regex(ADDRESS_PATTERN),
});

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase();
}

function isAddressLike(value: string): boolean {
  return ADDRESS_PATTERN.test(value);
}

/**
 * GET /api/quests/notifications
 * Fetch unshown achievement notifications
 */
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;

  // Authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const requesterAddress = typeof authResult.user?.address === 'string'
    ? normalizeAddress(authResult.user.address)
    : '';
  if (!requesterAddress || !isAddressLike(requesterAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const userAddress = searchParams.get('userAddress');

    if (!userAddress) {
      return NextResponse.json({ error: 'User address required' }, { status: 400 });
    }

    const targetAddress = normalizeAddress(userAddress);
    if (!isAddressLike(targetAddress)) {
      return NextResponse.json({ error: 'Invalid user address format' }, { status: 400 });
    }

    const canAccess = requesterAddress === targetAddress || isAdmin(authResult.user);
    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const client = await getClient();

    try {
      // Get user ID
      const userResult = await client.query(
        'SELECT id FROM users WHERE wallet_address = $1',
        [targetAddress]
      );

      if (userResult.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const userId = userResult.rows[0].id;

      // Get unshown notifications
      const notificationsResult = await client.query(`
        SELECT 
          id,
          notification_type,
          title,
          message,
          icon,
          reward_xp,
          reward_vfide,
          created_at
        FROM achievement_notifications
        WHERE user_id = $1 AND shown = false
        ORDER BY created_at ASC
        LIMIT 10
      `, [userId]);

      const notifications = notificationsResult.rows.map(row => ({
        id: row.id,
        type: row.notification_type,
        title: row.title,
        message: row.message,
        icon: row.icon,
        rewardXp: row.reward_xp,
        rewardVfide: (BigInt(row.reward_vfide || '0') / BigInt('1000000000000000000')).toString(),
        createdAt: row.created_at,
      }));

      return NextResponse.json({ notifications });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/quests/notifications
 * Mark notifications as shown
 */
export async function PATCH(request: NextRequest) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'write');
  if (rateLimit) return rateLimit;

  // Authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const requesterAddress = typeof authResult.user?.address === 'string'
    ? normalizeAddress(authResult.user.address)
    : '';
  if (!requesterAddress || !isAddressLike(requesterAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof markQuestNotificationsSchema>;
  try {
    const rawBody = await request.json();
    const parsed = markQuestNotificationsSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const { notificationIds, userAddress } = body;

    const normalizedNotificationIds = notificationIds.map((id) => id.trim());

    const targetAddress = normalizeAddress(userAddress);
    if (!isAddressLike(targetAddress)) {
      return NextResponse.json({ error: 'Invalid user address format' }, { status: 400 });
    }

    const canUpdate = requesterAddress === targetAddress || isAdmin(authResult.user);
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const client = await getClient();

    try {
      // Get user ID
      const userResult = await client.query(
        'SELECT id FROM users WHERE wallet_address = $1',
        [targetAddress]
      );

      if (userResult.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const userId = userResult.rows[0].id;

      // Mark notifications as shown
      await client.query(`
        UPDATE achievement_notifications
        SET shown = true, shown_at = NOW()
        WHERE user_id = $1 AND id = ANY($2::uuid[])
      `, [userId, normalizedNotificationIds]);

      return NextResponse.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error marking notifications as shown:', error);
    return NextResponse.json(
      { error: 'Failed to mark notifications as shown' },
      { status: 500 }
    );
  }
}
