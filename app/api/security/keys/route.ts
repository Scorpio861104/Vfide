import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { query } from '@/lib/db';
import type { JWTPayload } from '@/lib/auth/jwt';

import { withRateLimit } from '@/lib/auth/rateLimit';
import { verifyMessage, isAddress } from 'viem';
import {
  KEY_DIRECTORY_ALGORITHM,
  buildKeyDirectorySigningMessage,
  normalizeHex,
  validateKeyDirectoryPayload,
} from '@/lib/security/keyDirectory';
import {
  getAccountLock,
  recordSecurityEvent,
} from '@/lib/security/accountProtection';
import { getRequestIp } from '@/lib/security/requestContext';
import { logger } from '@/lib/logger';
import { z } from 'zod4';

interface KeyDirectoryRow {
  address: string;
  encryption_public_key: string;
  algorithm: string;
  proof_signature: string;
  proof_timestamp: string;
  updated_at: string;
}

const keyDirectoryUpdateSchema = z.object({
  address: z.string().trim().toLowerCase(),
  encryptionPublicKey: z.string().trim().min(1),
  signature: z.string().trim().min(1),
  timestamp: z.coerce.number().int().positive(),
  algorithm: z.literal(KEY_DIRECTORY_ALGORITHM).optional(),
});

export async function GET(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const address = request.nextUrl.searchParams.get('address')?.trim().toLowerCase() || '';
  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: 'Valid address is required' }, { status: 400 });
  }

  try {
    const result = await query<KeyDirectoryRow>(
      `SELECT address, encryption_public_key, algorithm, proof_signature, proof_timestamp::text, updated_at::text
       FROM encryption_key_directory
       WHERE address = $1 AND revoked_at IS NULL`,
      [address],
    );

    const row = result.rows[0];
    if (!row) {
      return NextResponse.json({ error: 'Encryption key not found' }, { status: 404 });
    }

    return NextResponse.json({
      address: row.address,
      encryptionPublicKey: row.encryption_public_key,
      algorithm: row.algorithm,
      proofSignature: row.proof_signature,
      proofTimestamp: Number.parseInt(row.proof_timestamp, 10),
      updatedAt: row.updated_at,
    });
  } catch (error) {
    logger.error('[Key Directory GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch encryption key' }, { status: 500 });
  }
}

export const PUT = withAuth(async (request: NextRequest, user: JWTPayload) => {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;
  const authenticatedAddress = user.address.toLowerCase();
  const { ip: requesterIp } = getRequestIp(request.headers);
  const lock = await getAccountLock(authenticatedAddress);
  if (lock) {
    return NextResponse.json(
      { error: `Account temporarily locked due to security signals: ${lock.reason}` },
      { status: 423 }
    );
  }

  let body: z.infer<typeof keyDirectoryUpdateSchema>;
  try {
    const rawBody = await request.json();
    const parsed = keyDirectoryUpdateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    body = parsed.data;
  } catch (error) {
    logger.debug('[Key Directory PUT] Invalid JSON body', error);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const address = body.address;
  const encryptionPublicKey = body.encryptionPublicKey;
  const signature = body.signature;
  const timestamp = body.timestamp;
  const algorithm = body.algorithm ?? KEY_DIRECTORY_ALGORITHM;

  if (address !== authenticatedAddress) {
    return NextResponse.json({ error: 'You can only publish your own key' }, { status: 403 });
  }

  const validation = validateKeyDirectoryPayload({ address, encryptionPublicKey, signature, timestamp });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const signingMessage = buildKeyDirectorySigningMessage(address, encryptionPublicKey, timestamp);

  const validSignature = await verifyMessage({
    address: address as `0x${string}`,
    message: signingMessage,
    signature: signature as `0x${string}`,
  });

  if (!validSignature) {
    return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 });
  }

  const lockResult = await recordSecurityEvent(authenticatedAddress, {
    ts: Date.now(),
    ip: requesterIp,
    type: 'key_rotate',
  });
  if (lockResult.locked) {
    return NextResponse.json(
      { error: `Account locked after suspicious key-rotation pattern: ${lockResult.reason}` },
      { status: 423 }
    );
  }

  try {
    await query(
      `INSERT INTO encryption_key_directory (
         address,
         encryption_public_key,
         algorithm,
         proof_signature,
         proof_message,
         proof_timestamp,
         updated_at,
         revoked_at
       ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NULL)
       ON CONFLICT (address)
       DO UPDATE SET
         encryption_public_key = EXCLUDED.encryption_public_key,
         algorithm = EXCLUDED.algorithm,
         proof_signature = EXCLUDED.proof_signature,
         proof_message = EXCLUDED.proof_message,
         proof_timestamp = EXCLUDED.proof_timestamp,
         updated_at = NOW(),
         revoked_at = NULL`,
      [address, normalizeHex(encryptionPublicKey).toLowerCase(), algorithm, signature, signingMessage, timestamp],
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[Key Directory PUT] Error:', error);
    return NextResponse.json({ error: 'Failed to publish encryption key' }, { status: 500 });
  }
});
