import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { isAddress } from 'viem';
import { logger } from '@/lib/logger';

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
  } catch {
    return false;
  }
}

export async function PATCH(request: NextRequest) {
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

  let body: Record<string, unknown>;
  try {
    body = await request.json() as unknown as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 });
  }

  const client = await getClient();
  
  try {
    const messageId = toNonEmptyString(body.messageId);
    const conversationId = toNonEmptyString(body.conversationId);
    const newContent = toNonEmptyString(body.newContent);
    const userAddress = toNonEmptyString(body.userAddress);

    if (!messageId || !conversationId || !newContent || !userAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (messageId.length > MAX_ID_LENGTH || conversationId.length > MAX_ID_LENGTH) {
      return NextResponse.json({ error: 'messageId or conversationId is too long' }, { status: 400 });
    }

    const normalizedUserAddress = userAddress.toLowerCase();

    // Validate address format
    if (!isAddress(normalizedUserAddress)) {
      return NextResponse.json({ error: 'Invalid Ethereum address format' }, { status: 400 });
    }

    // Verify authenticated user matches userAddress
    if (authenticatedAddress !== normalizedUserAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Validate content length and sanitization happens in validation schema
    if (newContent.length < 1 || newContent.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json({ error: `Content must be between 1 and ${MAX_CONTENT_LENGTH} characters` }, { status: 400 });
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
}
