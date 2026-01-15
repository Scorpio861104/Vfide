import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rateLimit';

/**
 * GET /api/quests/notifications
 * Fetch unshown achievement notifications
 */
export async function GET(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(clientId, { maxRequests: 40, windowMs: 60000 });

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const userAddress = searchParams.get('userAddress');

    if (!userAddress) {
      return NextResponse.json({ error: 'User address required' }, { status: 400 });
    }

    const client = await getClient();

    try {
      // Get user ID
      const userResult = await client.query(
        'SELECT id FROM users WHERE wallet_address = $1',
        [userAddress]
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
        rewardVfide: (BigInt(row.reward_vfide || '0') / BigInt(10 ** 18)).toString(),
        createdAt: row.created_at,
      }));

      return NextResponse.json({ notifications });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching notifications:', error);
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
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(clientId, { maxRequests: 40, windowMs: 60000 });

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const { notificationIds, userAddress } = await request.json();

    if (!notificationIds || !Array.isArray(notificationIds) || !userAddress) {
      return NextResponse.json(
        { error: 'Notification IDs array and user address required' },
        { status: 400 }
      );
    }

    const client = await getClient();

    try {
      // Get user ID
      const userResult = await client.query(
        'SELECT id FROM users WHERE wallet_address = $1',
        [userAddress]
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
      `, [userId, notificationIds]);

      return NextResponse.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error marking notifications as shown:', error);
    return NextResponse.json(
      { error: 'Failed to mark notifications as shown' },
      { status: 500 }
    );
  }
}
