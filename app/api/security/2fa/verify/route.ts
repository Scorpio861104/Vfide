import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { requireAuth } from '@/lib/auth/middleware';
import crypto from 'crypto';

const hashCode = (code: string) => {
  return crypto.createHash('sha256').update(code).digest('hex');
};

const MAX_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
  const rateLimit = await withRateLimit(request, 'write');
  if (rateLimit) return rateLimit;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { method, code } = body as { method?: 'sms' | 'email'; code?: string };

    if (!method || (method !== 'sms' && method !== 'email')) {
      return NextResponse.json({ error: 'Invalid method' }, { status: 400 });
    }

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Code required' }, { status: 400 });
    }

    const userResult = await query<{ id: number }>(
      'SELECT id FROM users WHERE wallet_address = $1',
      [authResult.user.address.toLowerCase()]
    );

    const userId = userResult.rows[0]?.id;
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const storedResult = await query<{
      id: number;
      code_hash: string;
      expires_at: string;
      attempts: number;
    }>(
      `SELECT id, code_hash, expires_at, attempts
       FROM two_factor_codes
       WHERE user_id = $1 AND method = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, method]
    );

    const record = storedResult.rows[0];
    if (!record) {
      return NextResponse.json({ error: 'Verification code not found' }, { status: 404 });
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      await query('DELETE FROM two_factor_codes WHERE id = $1', [record.id]);
      return NextResponse.json({ error: 'Too many attempts. Request a new code.' }, { status: 429 });
    }

    if (new Date(record.expires_at).getTime() < Date.now()) {
      await query('DELETE FROM two_factor_codes WHERE id = $1', [record.id]);
      return NextResponse.json({ error: 'Verification code expired' }, { status: 400 });
    }

    const inputHash = hashCode(code);
    const inputBuffer = Buffer.from(inputHash, 'hex');
    const storedBuffer = Buffer.from(record.code_hash, 'hex');
    const hashesMatch =
      inputBuffer.length === storedBuffer.length &&
      crypto.timingSafeEqual(inputBuffer, storedBuffer);

    if (!hashesMatch) {
      const nextAttempts = record.attempts + 1;
      if (nextAttempts >= MAX_ATTEMPTS) {
        await query('DELETE FROM two_factor_codes WHERE id = $1', [record.id]);
        return NextResponse.json({ error: 'Too many attempts. Request a new code.' }, { status: 429 });
      }

      await query('UPDATE two_factor_codes SET attempts = attempts + 1 WHERE id = $1', [record.id]);
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
    }

    await query('DELETE FROM two_factor_codes WHERE id = $1', [record.id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[2FA Verify] Error:', error);
    return NextResponse.json({ error: 'Failed to verify code' }, { status: 500 });
  }
}
