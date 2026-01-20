import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { validateBody, editMessageSchema } from '@/lib/auth/validation';
import { isAddress } from 'viem';

interface MessageEditRequest {
  messageId: string;
  conversationId: string;
  newContent: string;
  userAddress: string;
}

export async function PATCH(request: NextRequest) {
  // Rate limiting: 20 requests per minute for write operations
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  // Require authentication
  const authResult = requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const client = await getClient();
  
  try {
    const body: MessageEditRequest = await request.json();
    const { messageId, conversationId, newContent, userAddress } = body;

    if (!messageId || !conversationId || !newContent || !userAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate address format
    if (!isAddress(userAddress)) {
      return NextResponse.json({ error: 'Invalid Ethereum address format' }, { status: 400 });
    }

    // Verify authenticated user matches userAddress
    if (authResult.user.address.toLowerCase() !== userAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Validate content length and sanitization happens in validation schema
    if (newContent.length < 1 || newContent.length > 5000) {
      return NextResponse.json({ error: 'Content must be between 1 and 5000 characters' }, { status: 400 });
    }

    await client.query('BEGIN');

    const messageResult = await client.query(
      `SELECT m.*, u.wallet_address as sender
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.id = $1 AND m.conversation_id = $2`,
      [messageId, conversationId]
    );

    if (messageResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const message = messageResult.rows[0];

    if (message.sender.toLowerCase() !== userAddress.toLowerCase()) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (message.is_deleted) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Cannot edit deleted message' }, { status: 400 });
    }

    const messageAge = Date.now() - new Date(message.timestamp).getTime();
    if (messageAge > 15 * 60 * 1000) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Edit time limit exceeded' }, { status: 400 });
    }

    await client.query(
      `INSERT INTO message_edits (message_id, original_content, edited_at)
       VALUES ($1, $2, NOW())`,
      [messageId, message.content]
    );

    const updateResult = await client.query(
      `UPDATE messages SET content = $1, edited_at = NOW() WHERE id = $2 RETURNING *`,
      [newContent, messageId]
    );

    await client.query('COMMIT');

    return NextResponse.json({ success: true, message: updateResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Message Edit] Error:', error);
    return NextResponse.json({ error: 'Failed to edit message' }, { status: 500 });
  } finally {
    client.release();
  }
}
