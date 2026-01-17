import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import { validateRequest, checkRateLimit } from '@/lib/api-validation';
import { requireAuth } from '@/lib/auth-middleware';
import { apiLogger } from '@/lib/logger.service';

interface MessageEditRequest {
  messageId: string;
  conversationId: string;
  newContent: string;
  userAddress: string;
}

export async function PATCH(request: NextRequest) {
  // Rate limiting
  const clientId = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimit = checkRateLimit(`message-edit:${clientId}`, { maxRequests: 20, windowMs: 60000 });
  if (!rateLimit.success) {
    return rateLimit.errorResponse;
  }

  // Authentication required
  const auth = await requireAuth(request);
  if (!auth.authenticated) {
    return auth.errorResponse;
  }

  const client = await getClient();
  
  try {
    const body: MessageEditRequest = await request.json();
    const { messageId, conversationId, newContent, userAddress } = body;

    // Validate all required fields
    const validation = validateRequest(body, {
      messageId: { required: true, type: 'string' },
      conversationId: { required: true, type: 'string' },
      newContent: { required: true, type: 'string' },
      userAddress: { required: true, type: 'string' }
    });
    if (!validation.valid) {
      return validation.errorResponse;
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
    apiLogger.error('[Message Edit] Error', { error });
    return NextResponse.json({ error: 'Failed to edit message' }, { status: 500 });
  } finally {
    client.release();
  }
}
