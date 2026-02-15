import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';

interface MessageDeleteRequest {
  messageId: string;
  hardDelete?: boolean;
}

export async function DELETE(request: NextRequest) {
  // Rate limiting: 20 requests per minute for write operations
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  // Require authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body: MessageDeleteRequest = await request.json();
    const { messageId, hardDelete = false } = body;

    if (!messageId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const messageResult = await query(
      `SELECT m.*, u.wallet_address as sender
       FROM messages m JOIN users u ON m.sender_id = u.id
       WHERE m.id = $1`,
      [messageId]
    );

    if (messageResult.rows.length === 0) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const message = messageResult.rows[0];
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (message.sender.toLowerCase() !== authResult.user.address.toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (hardDelete) {
      await query(`DELETE FROM messages WHERE id = $1`, [messageId]);
      return NextResponse.json({ success: true, permanent: true });
    } else {
      const result = await query(
        `UPDATE messages SET is_deleted = true, deleted_at = NOW(), content = '[Message deleted]' WHERE id = $1 RETURNING *`,
        [messageId]
      );
      return NextResponse.json({ success: true, data: result.rows[0] });
    }
  } catch (error) {
    console.error('[Message Delete] Error:', error);
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}
