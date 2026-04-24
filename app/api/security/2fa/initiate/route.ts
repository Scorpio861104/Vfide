import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { isAddress } from 'viem';
import { z } from 'zod4';
import crypto from 'crypto';

const MAX_DESTINATION_LENGTH = 320;

const initiateSchema = z.object({
  method: z.enum(['email']),
  destination: z.string().trim().max(MAX_DESTINATION_LENGTH),
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function generateOtp(): string {
  // 6-digit numeric OTP using cryptographically secure random
  const bytes = crypto.randomBytes(4);
  const num = bytes.readUInt32BE(0) % 1_000_000;
  return num.toString().padStart(6, '0');
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const rawAddress = authResult.user.address?.trim() ?? '';
  const normalizedAddress = rawAddress.toLowerCase();

  if (!isAddress(normalizedAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = initiateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { method, destination } = parsed.data;
  const normalizedDestination = destination.trim().toLowerCase();

  if (method === 'email') {
    if (!EMAIL_REGEX.test(normalizedDestination)) {
      return NextResponse.json({ error: 'Invalid email destination format' }, { status: 400 });
    }
  }

  // Look up user by wallet address
  const userResult = await query<{ id: number; email: string }>(
    'SELECT id, email FROM users WHERE wallet_address = $1',
    [normalizedAddress],
  );

  const user = userResult.rows[0];
  if (!user) {
    // Return 200 to avoid enumeration — don't reveal whether address is registered
    return NextResponse.json({ success: true });
  }

  if (method === 'email' && user.email !== normalizedDestination) {
    return NextResponse.json({ error: 'Invalid email destination format' }, { status: 400 });
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Expire any existing codes for this user/method
  await query(
    `UPDATE two_factor_codes SET used = TRUE WHERE user_id = $1 AND method = $2 AND used = FALSE`,
    [user.id, method],
  );

  // Insert new OTP code
  await query(
    `INSERT INTO two_factor_codes (user_id, method, destination, code, expires_at, used)
     VALUES ($1, $2, $3, $4, $5, FALSE)`,
    [user.id, method, normalizedDestination, otp, expiresAt.toISOString()],
  );

  // Send via SendGrid
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL ?? 'noreply@vfide.app';
  const fromName = process.env.SENDGRID_FROM_NAME ?? 'VFIDE';

  if (apiKey && method === 'email') {
    await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: normalizedDestination }] }],
        from: { email: fromEmail, name: fromName },
        subject: 'Your VFIDE verification code',
        content: [
          {
            type: 'text/plain',
            value: `Your VFIDE verification code is: ${otp}\n\nThis code expires in 10 minutes.`,
          },
        ],
      }),
    });
  }

  return NextResponse.json({ success: true });
}
