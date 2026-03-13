import { NextRequest, NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { validateBody, sendMessageSchema } from '@/lib/auth/validation';
import { isAddress } from 'viem';

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

const MAX_MESSAGES_LIMIT = 200;
const MAX_MESSAGES_OFFSET = 10000;
const MAX_BULK_MESSAGE_IDS = 500;
const MAX_CONVERSATION_ADDRESS_LENGTH = 64;
const MAX_DIRECT_MESSAGES_PER_MINUTE_PER_SENDER = 30;
const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{3,40}$/;
const HEX_STRING_REGEX = /^[0-9a-fA-F]+$/;
const BASE64_STRING_REGEX = /^[A-Za-z0-9+/]+={0,2}$/;
const ETH_SIGNATURE_REGEX = /^0x[0-9a-fA-F]{130}$/;

function isAddressLike(value: string): boolean {
  return ADDRESS_LIKE_REGEX.test(value.trim());
}

function parseStrictIntegerParam(value: string | null): number | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return Number.parseInt(trimmed, 10);
}

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isEncryptedDirectMessagePayload(content: string): boolean {
  try {
    const payload = JSON.parse(content) as Record<string, unknown>;
    if (!payload || typeof payload !== 'object') return false;

    const v = payload.v;
    const ephemeralPublicKey = payload.ephemeralPublicKey;
    const ciphertext = payload.ciphertext;
    const iv = payload.iv;
    const sig = payload.sig;
    const ts = payload.ts;
    const nonce = payload.nonce;

    if (v !== 1) return false;
    if (typeof ephemeralPublicKey !== 'string' || ephemeralPublicKey.length < 64 || !HEX_STRING_REGEX.test(ephemeralPublicKey)) return false;
    if (typeof ciphertext !== 'string' || ciphertext.length < 16 || !BASE64_STRING_REGEX.test(ciphertext)) return false;
    if (typeof iv !== 'string' || iv.length < 8 || !BASE64_STRING_REGEX.test(iv)) return false;
    if (typeof sig !== 'string' || !ETH_SIGNATURE_REGEX.test(sig)) return false;
    if (typeof ts !== 'number' || !Number.isFinite(ts) || ts <= 0) return false;
    if (typeof nonce !== 'string' || nonce.length < 16 || !HEX_STRING_REGEX.test(nonce)) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * GET /api/messages?conversationWith=0x...&limit=50&offset=0
 * Get messages for a conversation between current user and another user
 */
export async function GET(request: NextRequest) {
  // Rate limiting: 100 requests per minute for messages
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
    const userAddressParam = searchParams.get('userAddress'); // Current user
    const conversationWithParam = searchParams.get('conversationWith'); // Other user
    const parsedLimit = parseStrictIntegerParam(searchParams.get('limit'));
    const parsedOffset = parseStrictIntegerParam(searchParams.get('offset'));

    if (
      (searchParams.get('limit') !== null && parsedLimit === null) ||
      (searchParams.get('offset') !== null && parsedOffset === null)
    ) {
      return NextResponse.json(
        { error: 'Invalid limit or offset parameter' },
        { status: 400 }
      );
    }

    const limit = Math.min(Math.max(parsedLimit ?? 50, 0), MAX_MESSAGES_LIMIT);
    const offset = Math.min(Math.max(parsedOffset ?? 0, 0), MAX_MESSAGES_OFFSET);

    if (!userAddressParam) {
      return NextResponse.json(
        { error: 'userAddress is required' },
        { status: 400 }
      );
    }

    const userAddress = userAddressParam.trim().toLowerCase();
    if (!isAddress(userAddress)) {
      return NextResponse.json(
        { error: 'Invalid userAddress format' },
        { status: 400 }
      );
    }

    // Verify ownership - user can only read their own messages
    if (authAddress !== userAddress) {
      return NextResponse.json(
        { error: 'You can only view your own messages' },
        { status: 403 }
      );
    }

    // If conversationWith is specified, get messages between two users
    if (conversationWithParam) {
      const conversationWith = conversationWithParam.trim().toLowerCase();
      // Validate conversationWith address
      if (!isAddress(conversationWith)) {
        return NextResponse.json(
          { error: 'Invalid conversationWith address format' },
          { status: 400 }
        );
      }

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

      const totalCount = parseInt(countResult.rows[0]?.count || '0', 10);
      if (isNaN(totalCount)) {
        throw new Error('Failed to get conversation message count');
      }

      return NextResponse.json({
        messages: result.rows,
        total: totalCount,
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

      const totalCount = parseInt(countResult.rows[0]?.count || '0', 10);
      if (isNaN(totalCount)) {
        throw new Error('Failed to get total message count');
      }

      return NextResponse.json({
        messages: result.rows,
        total: totalCount,
        limit,
        offset,
      });
    }
  } catch (error) {
    console.error('[Messages GET API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch messages';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/messages
 * Send a new message
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

  const client = await getClient();
  
  try {
    // Validate request body
    const validation = await validateBody(request, sendMessageSchema);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.details },
        { status: 400 }
      );
    }

    const { from, to, content } = validation.data;

    if (!isEncryptedDirectMessagePayload(content)) {
      return NextResponse.json(
        { error: 'Message content must be a valid encrypted payload' },
        { status: 400 }
      );
    }

    const isEncrypted = true;
    
    // Content is already sanitized by sendMessageSchema via validateBody

    // Verify the sender is the authenticated user
    if (authAddress !== from.toLowerCase()) {
      return NextResponse.json(
        { error: 'You can only send messages from your own address' },
        { status: 403 }
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

    const recentSendCountResult = await client.query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM messages
       WHERE sender_id = $1
         AND recipient_id = $2
         AND created_at > NOW() - INTERVAL '1 minute'`,
      [senderId, recipientId]
    );

    const recentSendCount = Number.parseInt(recentSendCountResult.rows[0]?.count || '0', 10);
    if (!Number.isNaN(recentSendCount) && recentSendCount >= MAX_DIRECT_MESSAGES_PER_MINUTE_PER_SENDER) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Direct message rate limit exceeded for this conversation' },
        { status: 429 }
      );
    }

    const replayResult = await client.query<{ id: number }>(
      `SELECT id
       FROM messages
       WHERE sender_id = $1
         AND recipient_id = $2
         AND content = $3
         AND created_at > NOW() - INTERVAL '10 minutes'
       LIMIT 1`,
      [senderId, recipientId, content]
    );

    if (replayResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Duplicate encrypted payload replay detected' },
        { status: 409 }
      );
    }

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
    const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
    return NextResponse.json(
      { error: errorMessage },
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
    const { messageIds, conversationWith, userAddress } = body;
    const userAddressValue = toNonEmptyString(userAddress);
    const conversationWithValue = toNonEmptyString(conversationWith);

    if (userAddressValue && !isAddress(userAddressValue)) {
      return NextResponse.json(
        { error: 'Invalid userAddress format for read-receipt update' },
        { status: 400 }
      );
    }

    // Verify ownership - user can only mark their own messages as read
    if (userAddressValue && authAddress !== userAddressValue.toLowerCase()) {
      return NextResponse.json(
        { error: 'You can only mark your own messages as read' },
        { status: 403 }
      );
    }

    if (messageIds && Array.isArray(messageIds)) {
      if (messageIds.length > MAX_BULK_MESSAGE_IDS) {
        return NextResponse.json(
          { error: `Too many messageIds. Maximum ${MAX_BULK_MESSAGE_IDS} allowed.` },
          { status: 400 }
        );
      }

      const hasInvalidMessageIds = messageIds.some(
        (id) => !Number.isInteger(id) || Number(id) <= 0
      );

      if (hasInvalidMessageIds) {
        return NextResponse.json(
          { error: 'Invalid messageIds. Must be an array of positive integers.' },
          { status: 400 }
        );
      }

      // Verify the user is the recipient of these messages
      const messageCheck = await query(
        `SELECT m.id, recipient.wallet_address 
         FROM messages m 
         JOIN users recipient ON m.recipient_id = recipient.id 
         WHERE m.id = ANY($1)`,
        [messageIds]
      );

      const unauthorizedMessages = messageCheck.rows.filter(
        m => m.wallet_address.toLowerCase() !== authAddress
      );

      if (unauthorizedMessages.length > 0) {
        return NextResponse.json(
          { error: 'You can only mark messages where you are the recipient as read' },
          { status: 403 }
        );
      }

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
    } else if (conversationWithValue && userAddressValue) {
      if (
        userAddressValue.length > MAX_CONVERSATION_ADDRESS_LENGTH ||
        conversationWithValue.length > MAX_CONVERSATION_ADDRESS_LENGTH
      ) {
        return NextResponse.json(
          { error: 'Address value is too long' },
          { status: 400 }
        );
      }

      if (!isAddress(userAddressValue) || !isAddress(conversationWithValue)) {
        return NextResponse.json(
          { error: 'Invalid address format for conversation read-receipt update' },
          { status: 400 }
        );
      }

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
          [conversationWithValue.toLowerCase(), userAddressValue.toLowerCase()]
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
