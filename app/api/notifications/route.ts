import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  data: any;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * GET /api/notifications?userAddress=0x...&limit=50&offset=0&unreadOnly=false
 * Get notifications for a user
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userAddress = searchParams.get('userAddress');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    if (!userAddress) {
      return NextResponse.json(
        { error: 'userAddress is required' },
        { status: 400 }
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

    return NextResponse.json({
      notifications: result.rows,
      total: parseInt(countResult.rows[0]?.count || '0'),
      limit,
      offset,
    });
  } catch (error) {
    console.error('[Notifications GET API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications
 * Create a new notification
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userAddress, type, title, message, data } = body;

    if (!userAddress || !type || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: userAddress, type, title, message' },
        { status: 400 }
      );
    }

    // Get user ID
    const userResult = await query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [userAddress.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = userResult.rows[0].id;

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
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications
 * Mark notifications as read
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationIds, userAddress, markAllRead } = body;

    if (markAllRead && userAddress) {
      // Mark all notifications as read for user
      const userResult = await query(
        'SELECT id FROM users WHERE wallet_address = $1',
        [userAddress.toLowerCase()]
      );

      if (userResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      const result = await query(
        `UPDATE notifications 
         SET is_read = true, updated_at = NOW()
         WHERE user_id = $1 AND is_read = false`,
        [userResult.rows[0].id]
      );

      return NextResponse.json({
        success: true,
        updated: result.rowCount || 0,
      });
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // Mark specific notifications as read
      const result = await query(
        `UPDATE notifications 
         SET is_read = true, updated_at = NOW()
         WHERE id = ANY($1)`,
        [notificationIds]
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
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications
 * Delete notifications
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationIds, userAddress, deleteAll } = body;

    if (deleteAll && userAddress) {
      // Delete all notifications for user
      const userResult = await query(
        'SELECT id FROM users WHERE wallet_address = $1',
        [userAddress.toLowerCase()]
      );

      if (userResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      const result = await query(
        'DELETE FROM notifications WHERE user_id = $1',
        [userResult.rows[0].id]
      );

      return NextResponse.json({
        success: true,
        deleted: result.rowCount || 0,
      });
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // Delete specific notifications
      const result = await query(
        'DELETE FROM notifications WHERE id = ANY($1)',
        [notificationIds]
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
    return NextResponse.json(
      { error: 'Failed to delete notifications' },
      { status: 500 }
    );
  }
}
