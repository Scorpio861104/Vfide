import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { z } from 'zod4';

interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

const MAX_NOTIFICATIONS_LIMIT = 200;
const MAX_NOTIFICATIONS_OFFSET = 10000;
const MAX_BULK_NOTIFICATION_IDS = 500;
const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{3,40}$/;

const createNotificationSchema = z.object({
  userAddress: z.string().trim().toLowerCase().regex(ADDRESS_LIKE_REGEX),
  type: z.string().trim().min(1),
  title: z.string().trim().min(1),
  message: z.string().trim().min(1),
  data: z.record(z.string(), z.unknown()).optional(),
});

const updateNotificationsSchema = z.object({
  notificationIds: z.array(z.coerce.number().int().positive()).max(MAX_BULK_NOTIFICATION_IDS).optional(),
  userAddress: z.string().trim().toLowerCase().regex(ADDRESS_LIKE_REGEX).optional(),
  markAllRead: z.boolean().optional(),
});

const deleteNotificationsSchema = z.object({
  notificationIds: z.array(z.coerce.number().int().positive()).max(MAX_BULK_NOTIFICATION_IDS).optional(),
  userAddress: z.string().trim().toLowerCase().regex(ADDRESS_LIKE_REGEX).optional(),
  deleteAll: z.boolean().optional(),
});

function isAddressLike(value: string): boolean {
  return ADDRESS_LIKE_REGEX.test(value.trim());
}

function parseStrictIntegerParam(value: string | null): number | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return Number.parseInt(trimmed, 10);
}

function parseBooleanParam(value: string | null): boolean | null {
  if (value === null) return false;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return null;
}

function normalizeNotificationIds(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const normalized = value
    .map((id) => (typeof id === 'number' || typeof id === 'string' ? Number.parseInt(String(id), 10) : NaN));

  if (normalized.some((id) => !Number.isInteger(id) || id <= 0)) {
    return null;
  }

  return normalized;
}

/**
 * GET /api/notifications?userAddress=0x...&limit=50&offset=0&unreadOnly=false
 * Get notifications for a user
 */
export async function GET(request: NextRequest) {
  // Rate limiting: 60 requests per minute for notifications
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  // Require authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const authAddress = typeof authResult.user?.address === 'string'
    ? authResult.user.address.trim().toLowerCase()
    : '';
  if (!authAddress || !isAddressLike(authAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const userAddressParam = searchParams.get('userAddress');
    const parsedLimit = parseStrictIntegerParam(searchParams.get('limit'));
    const parsedOffset = parseStrictIntegerParam(searchParams.get('offset'));
    const parsedUnreadOnly = parseBooleanParam(searchParams.get('unreadOnly'));

    if (
      (searchParams.get('limit') !== null && parsedLimit === null) ||
      (searchParams.get('offset') !== null && parsedOffset === null)
    ) {
      return NextResponse.json(
        { error: 'Invalid limit or offset parameter' },
        { status: 400 }
      );
    }

    if (parsedUnreadOnly === null) {
      return NextResponse.json(
        { error: 'Invalid unreadOnly parameter. Must be true or false.' },
        { status: 400 }
      );
    }

    const limit = Math.min(Math.max(parsedLimit ?? 50, 0), MAX_NOTIFICATIONS_LIMIT);
    const offset = Math.min(Math.max(parsedOffset ?? 0, 0), MAX_NOTIFICATIONS_OFFSET);
    const unreadOnly = parsedUnreadOnly;

    if (!userAddressParam) {
      return NextResponse.json(
        { error: 'userAddress is required' },
        { status: 400 }
      );
    }

    const userAddress = userAddressParam.trim().toLowerCase();
    if (!isAddressLike(userAddress)) {
      return NextResponse.json(
        { error: 'Invalid userAddress format' },
        { status: 400 }
      );
    }

    // Verify ownership - user can only view their own notifications
    if (authAddress !== userAddress) {
      return NextResponse.json(
        { error: 'You can only view your own notifications' },
        { status: 403 }
      );
    }

    let queryText = `
      SELECT n.*
      FROM notifications n
      JOIN users u ON n.user_id = u.id
      WHERE u.wallet_address = $1
    `;

    if (unreadOnly) {
      queryText += ' AND n.is_read = false';
    }

    queryText += ' ORDER BY n.created_at DESC LIMIT $2 OFFSET $3';

    const result = await query<Notification>(
      queryText,
      [userAddress, limit, offset]
    );

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as count
      FROM notifications n
      JOIN users u ON n.user_id = u.id
      WHERE u.wallet_address = $1
    `;

    if (unreadOnly) {
      countQuery += ' AND n.is_read = false';
    }

    const countResult = await query<{ count: string }>(
      countQuery,
      [userAddress]
    );

    const totalCount = parseInt(countResult.rows[0]?.count || '0', 10);
    if (isNaN(totalCount)) {
      throw new Error('Failed to get notification count');
    }

    return NextResponse.json({
      notifications: result.rows,
      total: totalCount,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('[Notifications GET API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch notifications';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications
 * Create a new notification
 */
export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  // Require authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const authAddress = typeof authResult.user?.address === 'string'
    ? authResult.user.address.trim().toLowerCase()
    : '';
  if (!authAddress || !isAddressLike(authAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof createNotificationSchema>;
  try {
    const rawBody = await request.json();
    const parsed = createNotificationSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    body = parsed.data;
  } catch (error) {
    logger.debug('[Notifications POST] Invalid JSON body', error);
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  try {
    const { userAddress, type, title, message, data } = body;
    const targetAddress = userAddress;

    const requesterAddress = authAddress;
    const canCreate = requesterAddress === targetAddress || isAdmin(authResult.user);
    if (!canCreate) {
      return NextResponse.json(
        { error: 'You can only create notifications for your own account' },
        { status: 403 }
      );
    }

    // Get user ID
    const userResult = await query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [targetAddress]
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

    // Insert notification
    const result = await query<Notification>(
      `INSERT INTO notifications (user_id, type, title, message, data, is_read)
       VALUES ($1, $2, $3, $4, $5, false)
       RETURNING *`,
      [userId, type, title, message, data ? JSON.stringify(data) : null]
    );

    return NextResponse.json({
      success: true,
      notification: result.rows[0],
    }, { status: 201 });
  } catch (error) {
    logger.error('[Notifications POST API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create notification';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications
 * Mark notifications as read
 */
export async function PATCH(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  // Require authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const authAddress = typeof authResult.user?.address === 'string'
    ? authResult.user.address.trim().toLowerCase()
    : '';
  if (!authAddress || !isAddressLike(authAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof updateNotificationsSchema>;
  try {
    const rawBody = await request.json();
    const parsed = updateNotificationsSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    body = parsed.data;
  } catch (error) {
    logger.debug('[Notifications PATCH] Invalid JSON body', error);
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  try {
    const { notificationIds, userAddress, markAllRead } = body;
    const userAddressValue = userAddress ?? null;

    if (markAllRead && userAddressValue) {
      const normalizedUserAddress = userAddressValue;

      // Verify ownership - user can only modify their own notifications
      if (authAddress !== normalizedUserAddress) {
        return NextResponse.json(
          { error: 'You can only modify your own notifications' },
          { status: 403 }
        );
      }

      // Mark all notifications as read for user
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

      const result = await query(
        `UPDATE notifications 
         SET is_read = true, updated_at = NOW()
         WHERE user_id = $1 AND is_read = false`,
        [userId]
      );

      return NextResponse.json({
        success: true,
        updated: result.rowCount || 0,
      });
    } else if (notificationIds && Array.isArray(notificationIds)) {
      const normalizedNotificationIds = normalizeNotificationIds(notificationIds);
      if (!normalizedNotificationIds || normalizedNotificationIds.length === 0) {
        return NextResponse.json(
          { error: 'notificationIds must contain positive integer values' },
          { status: 400 }
        );
      }

      // Verify ownership - notifications must belong to authenticated user
      const userResult = await query(
        'SELECT id FROM users WHERE wallet_address = $1',
        [authAddress]
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

      // Mark specific notifications as read (only if they belong to the user)
      const result = await query(
        `UPDATE notifications 
         SET is_read = true, updated_at = NOW()
         WHERE id = ANY($1) AND user_id = $2`,
        [normalizedNotificationIds, userId]
      );

      return NextResponse.json({
        success: true,
        updated: result.rowCount || 0,
      });
    } else {
      return NextResponse.json(
        { error: 'Either notificationIds or (markAllRead + userAddress) required' },
        { status: 400 }
      );
    }
  } catch (error) {
    logger.error('[Notifications PATCH API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update notifications';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications
 * Delete notifications
 */
export async function DELETE(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  // Require authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const authAddress = typeof authResult.user?.address === 'string'
    ? authResult.user.address.trim().toLowerCase()
    : '';
  if (!authAddress || !isAddressLike(authAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof deleteNotificationsSchema>;
  try {
    const rawBody = await request.json();
    const parsed = deleteNotificationsSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    body = parsed.data;
  } catch (error) {
    logger.debug('[Notifications DELETE] Invalid JSON body', error);
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  try {
    const { notificationIds, userAddress, deleteAll } = body;
    const userAddressValue = userAddress ?? null;

    if (deleteAll && userAddressValue) {
      const normalizedUserAddress = userAddressValue;

      // Verify ownership - user can only delete their own notifications
      if (authAddress !== normalizedUserAddress) {
        return NextResponse.json(
          { error: 'You can only delete your own notifications' },
          { status: 403 }
        );
      }

      // Delete all notifications for user
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

      const result = await query(
        'DELETE FROM notifications WHERE user_id = $1',
        [userId]
      );

      return NextResponse.json({
        success: true,
        deleted: result.rowCount || 0,
      });
    } else if (notificationIds && Array.isArray(notificationIds)) {
      const normalizedNotificationIds = normalizeNotificationIds(notificationIds);
      if (!normalizedNotificationIds || normalizedNotificationIds.length === 0) {
        return NextResponse.json(
          { error: 'notificationIds must contain positive integer values' },
          { status: 400 }
        );
      }

      // Verify ownership - notifications must belong to authenticated user
      const userResult = await query(
        'SELECT id FROM users WHERE wallet_address = $1',
        [authAddress]
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

      // Delete specific notifications (only if they belong to the user)
      const result = await query(
        'DELETE FROM notifications WHERE id = ANY($1) AND user_id = $2',
        [normalizedNotificationIds, userId]
      );

      return NextResponse.json({
        success: true,
        deleted: result.rowCount || 0,
      });
    } else {
      return NextResponse.json(
        { error: 'Either notificationIds or (deleteAll + userAddress) required' },
        { status: 400 }
      );
    }
  } catch (error) {
    logger.error('[Notifications DELETE API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete notifications';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
