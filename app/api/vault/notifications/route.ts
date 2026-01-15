import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { validateAddress, validatePositiveInteger } from '@/lib/inputValidation';
import { rateLimiter } from '@/lib/rateLimiter';

/**
 * GET /api/vault/notifications?userAddress=0x...&unreadOnly=true
 * Get vault notifications for a user
 * 
 * Rate limit: 30 req/min
 */
export async function GET(request: NextRequest) {
  // Apply rate limiting
  const limitResult = await rateLimiter(request, 30);
  if (limitResult) return limitResult;

  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('userAddress');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    if (!userAddress) {
      return NextResponse.json(
        { error: 'userAddress parameter required' },
        { status: 400 }
      );
    }

    // Validate address format
    let validatedUserAddress: string;
    try {
      validatedUserAddress = validateAddress(userAddress);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid Ethereum address format' },
        { status: 400 }
      );
    }

    // Query notifications
    const queryText = unreadOnly
      ? `SELECT * FROM vault_notifications 
         WHERE user_address = $1 AND is_read = false 
         ORDER BY created_at DESC 
         LIMIT 50`
      : `SELECT * FROM vault_notifications 
         WHERE user_address = $1 
         ORDER BY created_at DESC 
         LIMIT 100`;

    const result = await query(queryText, [validatedUserAddress]);

    // Get unread count
    const unreadCountResult = await query(
      `SELECT COUNT(*) as count FROM vault_notifications 
       WHERE user_address = $1 AND is_read = false`,
      [validatedUserAddress]
    );

    return NextResponse.json({
      notifications: result.rows,
      unreadCount: parseInt(unreadCountResult.rows[0]?.count || '0'),
      total: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching vault notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/vault/notifications
 * Create a new vault notification
 * 
 * Rate limit: 20 req/min
 */
export async function POST(request: NextRequest) {
  // Apply rate limiting
  const limitResult = await rateLimiter(request, 20);
  if (limitResult) return limitResult;

  try {
    const body = await request.json();
    const { 
      vaultAddress, 
      userAddress, 
      notificationType, 
      title, 
      message,
      actionUrl 
    } = body;

    if (!vaultAddress || !userAddress || !notificationType || !title || !message) {
      return NextResponse.json(
        { error: 'vaultAddress, userAddress, notificationType, title, and message required' },
        { status: 400 }
      );
    }

    // Validate addresses
    let validatedVaultAddress: string;
    let validatedUserAddress: string;
    try {
      validatedVaultAddress = validateAddress(vaultAddress);
      validatedUserAddress = validateAddress(userAddress);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid Ethereum address format' },
        { status: 400 }
      );
    }

    // Validate title and message lengths
    if (title.length > 200) {
      return NextResponse.json(
        { error: 'Title too long (max 200 characters)' },
        { status: 400 }
      );
    }

    // Insert notification
    const result = await query(
      `INSERT INTO vault_notifications 
       (vault_address, user_address, notification_type, title, message, action_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [validatedVaultAddress, validatedUserAddress, notificationType, title, message, actionUrl || null]
    );

    return NextResponse.json({
      success: true,
      notification: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/vault/notifications
 * Mark notifications as read
 * 
 * Rate limit: 30 req/min
 */
export async function PATCH(request: NextRequest) {
  // Apply rate limiting
  const limitResult = await rateLimiter(request, 30);
  if (limitResult) return limitResult;

  try {
    const body = await request.json();
    const { notificationIds, markAsRead } = body;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json(
        { error: 'notificationIds array required' },
        { status: 400 }
      );
    }

    // Validate notification IDs
    const validatedIds: number[] = [];
    for (const id of notificationIds) {
      try {
        validatedIds.push(validatePositiveInteger(String(id), 'Notification ID'));
      } catch (error) {
        return NextResponse.json(
          { error: `Invalid notification ID: ${id}` },
          { status: 400 }
        );
      }
    }

    const isRead = markAsRead !== false; // Default to true

    // Update notifications
    const result = await query(
      `UPDATE vault_notifications 
       SET is_read = $1, read_at = ${isRead ? 'NOW()' : 'NULL'} 
       WHERE id = ANY($2::int[])
       RETURNING *`,
      [isRead, validatedIds]
    );

    return NextResponse.json({
      success: true,
      updatedCount: result.rows.length,
      notifications: result.rows
    });

  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}
