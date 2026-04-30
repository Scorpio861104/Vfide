import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';

import { withRateLimit } from '@/lib/auth/rateLimit';
import { isAddress } from 'viem';
import { logger } from '@/lib/logger';
import { z } from 'zod4';

const MAX_ID_LENGTH = 128;
const MAX_CONTENT_LENGTH = 5000;
const MAX_EPHEMERAL_PUBKEY_CHARS = 1024;
const MAX_CIPHERTEXT_CHARS = 16384;
const MAX_IV_CHARS = 256;
const MAX_SIG_CHARS = 2048;
const MAX_NONCE_CHARS = 128;
const HEX_STRING_REGEX = /^[0-9a-fA-F]+$/;
const BASE64_STRING_REGEX = /^[A-Za-z0-9+/]+={0,2}$/;
const ETH_SIGNATURE_REGEX = /^0x[0-9a-fA-F]{130}$/;

const messageEditSchema = z.object({
  messageId: z.string().trim().min(1).max(MAX_ID_LENGTH),
  conversationId: z.string().trim().min(1).max(MAX_ID_LENGTH),
  newContent: z.string().trim().min(1).max(MAX_CONTENT_LENGTH),
  userAddress: z.string().trim().toLowerCase().refine((value) => isAddress(value), {
    message: 'Invalid Ethereum address format',
  }),
});

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
    if (
      typeof ephemeralPublicKey !== 'string' ||
      ephemeralPublicKey.length < 64 ||
      ephemeralPublicKey.length > MAX_EPHEMERAL_PUBKEY_CHARS ||
      !HEX_STRING_REGEX.test(ephemeralPublicKey)
    ) return false;
    if (
      typeof ciphertext !== 'string' ||
      ciphertext.length < 16 ||
      ciphertext.length > MAX_CIPHERTEXT_CHARS ||
      !BASE64_STRING_REGEX.test(ciphertext)
    ) return false;
    if (
      typeof iv !== 'string' ||
      iv.length < 8 ||
      iv.length > MAX_IV_CHARS ||
      !BASE64_STRING_REGEX.test(iv)
    ) return false;
    if (typeof sig !== 'string' || sig.length > MAX_SIG_CHARS || !ETH_SIGNATURE_REGEX.test(sig)) return false;
    if (typeof ts !== 'number' || !Number.isSafeInteger(ts) || ts <= 0) return false;
    if (
      typeof nonce !== 'string' ||
      nonce.length < 16 ||
      nonce.length > MAX_NONCE_CHARS ||
      !HEX_STRING_REGEX.test(nonce)
    ) return false;

    return true;
  } catch (error) {
    logger.debug('[Message Edit] Failed to parse encrypted payload', error);
    return false;
  }
}

export const PATCH = withAuth(async (request: NextRequest, user: JWTPayload) => {
  // Rate limiting: 20 requests per minute for write operations
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;
  const authenticatedAddress = typeof user?.address === 'string'
    ? user.address.trim().toLowerCase()
    : '';
  if (!authenticatedAddress || !isAddress(authenticatedAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof messageEditSchema>;
  try {
    const rawBody = await request.json();
    const parsed = messageEditSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    body = parsed.data;
  } catch (error) {
    logger.debug('[Message Edit] Invalid JSON body', error);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const client = await getClient();
  
  try {
    const { messageId, conversationId, newContent } = body;
    const normalizedUserAddress = body.userAddress;

    // Verify authenticated user matches userAddress
    if (authenticatedAddress !== normalizedUserAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!isEncryptedDirectMessagePayload(newContent)) {
      return NextResponse.json(
        { error: 'Edited content must be a valid encrypted payload' },
        { status: 400 }
      );
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

    if (message.sender.toLowerCase() !== normalizedUserAddress) {
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
    logger.error('[Message Edit] Error:', error);
    return NextResponse.json({ error: 'Failed to edit message' }, { status: 500 });
  } finally {
    client.release();
  }
});
