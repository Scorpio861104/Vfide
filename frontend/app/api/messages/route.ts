import { NextRequest, NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db';

interface Message {
  id: number;
  sender_id: number;
  recipient_id: number;
  content: string;
  is_encrypted: boolean;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  sender_address?: string;
  sender_username?: string;
  sender_avatar?: string;
  recipient_address?: string;
  recipient_username?: string;
  recipient_avatar?: string;
}

/**
 * GET /api/messages?conversationWith=0x...&limit=50&offset=0
 * Get messages for a conversation between current user and another user
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userAddress = searchParams.get('userAddress'); // Current user
    const conversationWith = searchParams.get('conversationWith'); // Other user
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!userAddress) {
      return NextResponse.json(
        { error: 'userAddress is required' },
        { status: 400 }
      );
    }

    // If conversationWith is specified, get messages between two users
    if (conversationWith) {
      const result = await query<Message>(
        `SELECT 
          m.*,
          sender.wallet_address as sender_address,
          sender.username as sender_username,
          sender.avatar_url as sender_avatar,
          recipient.wallet_address as recipient_address,
          recipient.username as recipient_username,
          recipient.avatar_url as recipient_avatar
         FROM messages m
         JOIN users sender ON m.sender_id = sender.id
         JOIN users recipient ON m.recipient_id = recipient.id
         WHERE (sender.wallet_address = $1 AND recipient.wallet_address = $2)
            OR (sender.wallet_address = $2 AND recipient.wallet_address = $1)
         ORDER BY m.created_at DESC
         LIMIT $3 OFFSET $4`,
        [userAddress.toLowerCase(), conversationWith.toLowerCase(), limit, offset]
      );

      const countResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count
         FROM messages m
         JOIN users sender ON m.sender_id = sender.id
         JOIN users recipient ON m.recipient_id = recipient.id
         WHERE (sender.wallet_address = $1 AND recipient.wallet_address = $2)
            OR (sender.wallet_address = $2 AND recipient.wallet_address = $1)`,
        [userAddress.toLowerCase(), conversationWith.toLowerCase()]
      );

      return NextResponse.json({
        messages: result.rows,
        total: parseInt(countResult.rows[0]?.count || '0'),
        limit,
        offset,
      });
    } else {
      // Get all messages for user
      const result = await query<Message>(
        `SELECT 
          m.*,
          sender.wallet_address as sender_address,
          sender.username as sender_username,
          sender.avatar_url as sender_avatar,
          recipient.wallet_address as recipient_address,
          recipient.username as recipient_username,
          recipient.avatar_url as recipient_avatar
         FROM messages m
         JOIN users sender ON m.sender_id = sender.id
         JOIN users recipient ON m.recipient_id = recipient.id
         WHERE sender.wallet_address = $1 OR recipient.wallet_address = $1
         ORDER BY m.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userAddress.toLowerCase(), limit, offset]
      );

      const countResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count
         FROM messages m
         JOIN users sender ON m.sender_id = sender.id
         JOIN users recipient ON m.recipient_id = recipient.id
         WHERE sender.wallet_address = $1 OR recipient.wallet_address = $1`,
        [userAddress.toLowerCase()]
      );

      return NextResponse.json({
        messages: result.rows,
        total: parseInt(countResult.rows[0]?.count || '0'),
        limit,
        offset,
      });
    }
  } catch (error) {
    console.error('[Messages GET API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/messages
 * Send a new message
 */
export async function POST(request: NextRequest) {
  const client = await getClient();
  
  try {
    const body = await request.json();
    const { from, to, content, isEncrypted } = body;

    // Validate required fields
    if (!from || !to || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: from, to, content' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Get sender and recipient IDs
    const senderResult = await client.query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [from.toLowerCase()]
    );

    const recipientResult = await client.query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [to.toLowerCase()]
    );

    if (senderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Sender not found' },
        { status: 404 }
      );
    }

    if (recipientResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Recipient not found' },
        { status: 404 }
      );
    }

    const senderId = senderResult.rows[0].id;
    const recipientId = recipientResult.rows[0].id;

    // Insert message
    const messageResult = await client.query(
      `INSERT INTO messages (sender_id, recipient_id, content, is_encrypted, is_read)
       VALUES ($1, $2, $3, $4, false)
       RETURNING *`,
      [senderId, recipientId, content, isEncrypted || false]
    );

    const message = messageResult.rows[0];

    // Create notification for recipient
    await client.query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, 'message', 'New Message', $2, $3)`,
      [
        recipientId,
        `You have a new message from ${from}`,
        JSON.stringify({ messageId: message.id, from, to })
      ]
    );

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      message,
    }, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Messages POST API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * PATCH /api/messages
 * Mark messages as read
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageIds, conversationWith, userAddress } = body;

    if (messageIds && Array.isArray(messageIds)) {
      // Mark specific messages as read
      await query(
        `UPDATE messages SET is_read = true, updated_at = NOW()
         WHERE id = ANY($1)`,
        [messageIds]
      );

      return NextResponse.json({
        success: true,
        updated: messageIds.length,
      });
    } else if (conversationWith && userAddress) {
      // Mark all messages in conversation as read
      const result = await query(
        `UPDATE messages m
         SET is_read = true, updated_at = NOW()
         FROM users sender, users recipient
         WHERE m.sender_id = sender.id
           AND m.recipient_id = recipient.id
           AND sender.wallet_address = $1
           AND recipient.wallet_address = $2
           AND m.is_read = false`,
        [conversationWith.toLowerCase(), userAddress.toLowerCase()]
      );

      return NextResponse.json({
        success: true,
        updated: result.rowCount || 0,
      });
    } else {
      return NextResponse.json(
        { error: 'Either messageIds or (conversationWith + userAddress) required' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[Messages PATCH API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update messages' },
      { status: 500 }
    );
  }
}
