import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { isAddress } from 'viem';
import { logger } from '@/lib/logger';
import { z } from 'zod4';

const MAX_ID_LENGTH = 128;

const deleteMessageSchema = z.object({
  messageId: z.string().trim().min(1).max(MAX_ID_LENGTH),
  conversationId: z.string().trim().min(1).max(MAX_ID_LENGTH),
  userAddress: z.string().trim().refine((value) => isAddress(value), {
    message: 'Invalid Ethereum address format',
  }),
  hardDelete: z.boolean().optional(),
});

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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

  const authenticatedAddress = typeof authResult.user?.address === 'string'
    ? authResult.user.address.trim().toLowerCase()
    : '';
  if (!authenticatedAddress || !isAddress(authenticatedAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof deleteMessageSchema>;
  try {
    const rawBody = await request.json();
    const parsed = deleteMessageSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    body = parsed.data;
  } catch (error) {
    logger.debug('[Message Delete] Invalid JSON body', error);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const messageId = toNonEmptyString(body.messageId);
    const conversationId = toNonEmptyString(body.conversationId);
    const userAddress = toNonEmptyString(body.userAddress);
    const hardDelete = body.hardDelete === true;

    if (!messageId || !conversationId || !userAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (messageId.length > MAX_ID_LENGTH || conversationId.length > MAX_ID_LENGTH) {
      return NextResponse.json({ error: 'messageId or conversationId is too long' }, { status: 400 });
    }

    const normalizedUserAddress = userAddress.toLowerCase();

    // Verify authenticated user matches userAddress
    if (authenticatedAddress !== normalizedUserAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const messageResult = await query(
      `SELECT m.*, u.wallet_address as sender
       FROM messages m JOIN users u ON m.sender_id = u.id
       WHERE m.id = $1 AND m.conversation_id = $2`,
      [messageId, conversationId]
    );

    if (messageResult.rows.length === 0) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const message = messageResult.rows[0];
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (message.sender.toLowerCase() !== normalizedUserAddress) {
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
    logger.error('[Message Delete] Error:', error);
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}
