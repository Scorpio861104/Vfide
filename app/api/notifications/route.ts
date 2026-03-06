import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';

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

  try {
    const searchParams = request.nextUrl.searchParams;
    const userAddress = searchParams.get('userAddress');
    const rawLimit = parseInt(searchParams.get('limit') || '50', 10);
    const rawOffset = parseInt(searchParams.get('offset') || '0', 10);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const limit = Math.min(Math.max(rawLimit, 0), MAX_NOTIFICATIONS_LIMIT);
    const offset = Math.min(Math.max(rawOffset, 0), MAX_NOTIFICATIONS_OFFSET);

    // Validate parsed numbers
    if (isNaN(rawLimit) || isNaN(rawOffset)) {
      return NextResponse.json(
        { error: 'Invalid limit or offset parameter' },
        { status: 400 }
      );
    }

    if (!userAddress) {
      return NextResponse.json(
        { error: 'userAddress is required' },
        { status: 400 }
      );
    }

    // Verify ownership - user can only view their own notifications
    if (authResult.user.address.toLowerCase() !== userAddress.toLowerCase()) {
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
      [userAddress.toLowerCase(), limit, offset]
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
      [userAddress.toLowerCase()]
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
    console.error('[Notifications GET API] Error:', error);
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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json(
      { error: 'Request body must be a JSON object' },
      { status: 400 }
    );
  }

  try {
    const { userAddress, type, title, message, data } = body;

    if (!userAddress || !type || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: userAddress, type, title, message' },
        { status: 400 }
      );
    }

    if (
      typeof userAddress !== 'string' ||
      typeof type !== 'string' ||
      typeof title !== 'string' ||
      typeof message !== 'string'
    ) {
      return NextResponse.json(
        { error: 'userAddress, type, title, and message must be strings' },
        { status: 400 }
      );
    }

    const requesterAddress = authResult.user.address.toLowerCase();
    const targetAddress = userAddress.toLowerCase();
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
    console.error('[Notifications POST API] Error:', error);
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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json(
      { error: 'Request body must be a JSON object' },
      { status: 400 }
    );
  }

  try {
    const { notificationIds, userAddress, markAllRead } = body;
    const userAddressValue = typeof userAddress === 'string' ? userAddress : null;

    if (markAllRead && userAddressValue) {
      // Verify ownership - user can only modify their own notifications
      if (authResult.user.address.toLowerCase() !== userAddressValue.toLowerCase()) {
        return NextResponse.json(
          { error: 'You can only modify your own notifications' },
          { status: 403 }
        );
      }

      // Mark all notifications as read for user
      const userResult = await query(
        'SELECT id FROM users WHERE wallet_address = $1',
        [userAddressValue.toLowerCase()]
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
      if (notificationIds.length > MAX_BULK_NOTIFICATION_IDS) {
        return NextResponse.json(
          { error: `Too many notificationIds. Maximum ${MAX_BULK_NOTIFICATION_IDS} allowed.` },
          { status: 400 }
        );
      }

      // Verify ownership - notifications must belong to authenticated user
      const userResult = await query(
        'SELECT id FROM users WHERE wallet_address = $1',
        [authResult.user.address.toLowerCase()]
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
        [notificationIds, userId]
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
    console.error('[Notifications PATCH API] Error:', error);
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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json(
      { error: 'Request body must be a JSON object' },
      { status: 400 }
    );
  }

  try {
    const { notificationIds, userAddress, deleteAll } = body;
    const userAddressValue = typeof userAddress === 'string' ? userAddress : null;

    if (deleteAll && userAddressValue) {
      // Verify ownership - user can only delete their own notifications
      if (authResult.user.address.toLowerCase() !== userAddressValue.toLowerCase()) {
        return NextResponse.json(
          { error: 'You can only delete your own notifications' },
          { status: 403 }
        );
      }

      // Delete all notifications for user
      const userResult = await query(
        'SELECT id FROM users WHERE wallet_address = $1',
        [userAddressValue.toLowerCase()]
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
      if (notificationIds.length > MAX_BULK_NOTIFICATION_IDS) {
        return NextResponse.json(
          { error: `Too many notificationIds. Maximum ${MAX_BULK_NOTIFICATION_IDS} allowed.` },
          { status: 400 }
        );
      }

      // Verify ownership - notifications must belong to authenticated user
      const userResult = await query(
        'SELECT id FROM users WHERE wallet_address = $1',
        [authResult.user.address.toLowerCase()]
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
        [notificationIds, userId]
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
    console.error('[Notifications DELETE API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete notifications';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
