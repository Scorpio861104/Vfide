import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { requireAuth } from '@/lib/auth/middleware';
import crypto from 'crypto';

const CODE_TTL_MINUTES = 5;

const generateCode = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

const hashCode = (code: string) => {
  return crypto.createHash('sha256').update(code).digest('hex');
};

const sendEmailCode = async (destination: string, code: string) => {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  const fromName = process.env.SENDGRID_FROM_NAME || 'VFIDE';

  if (!apiKey || !fromEmail) {
    throw new Error('Email provider not configured');
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: destination }],
          subject: 'Your VFIDE verification code',
        },
      ],
      from: { email: fromEmail, name: fromName },
      content: [
        {
          type: 'text/plain',
          value: `Your VFIDE verification code is ${code}. It expires in ${CODE_TTL_MINUTES} minutes.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`SendGrid error: ${response.status} ${body}`);
  }
};

const sendSmsCode = async (destination: string, code: string) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('SMS provider not configured');
  }

  const payload = new URLSearchParams({
    To: destination,
    From: fromNumber,
    Body: `Your VFIDE verification code is ${code}. It expires in ${CODE_TTL_MINUTES} minutes.`,
  });

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: payload.toString(),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Twilio error: ${response.status} ${body}`);
  }
};

export async function POST(request: NextRequest) {
  const rateLimit = await withRateLimit(request, 'write');
  if (rateLimit) return rateLimit;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { method, destination } = body as {
      method?: 'sms' | 'email';
      destination?: string;
    };

    if (!method || (method !== 'sms' && method !== 'email')) {
      return NextResponse.json({ error: 'Invalid method' }, { status: 400 });
    }

    if (!destination || typeof destination !== 'string') {
      return NextResponse.json({ error: 'Destination required' }, { status: 400 });
    }

    const userResult = await query<{ id: number; email: string | null }>(
      'SELECT id, email FROM users WHERE wallet_address = $1',
      [authResult.user.address.toLowerCase()]
    );

    const userId = userResult.rows[0]?.id;
    const userEmail = userResult.rows[0]?.email ?? null;
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (method === 'email') {
      const normalizedDestination = destination.trim().toLowerCase();
      if (!userEmail || userEmail.toLowerCase() !== normalizedDestination) {
        return NextResponse.json({ error: 'Email address not verified' }, { status: 400 });
      }
    }

    if (method === 'sms') {
      return NextResponse.json({ error: 'SMS 2FA is not configured' }, { status: 400 });
    }

    const code = generateCode();
    const codeHash = hashCode(code);
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

    await query('DELETE FROM two_factor_codes WHERE user_id = $1 AND method = $2', [userId, method]);

    await query(
      `INSERT INTO two_factor_codes (user_id, method, destination, code_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, method, destination, codeHash, expiresAt.toISOString()]
    );

    try {
      if (method === 'email') {
        await sendEmailCode(destination, code);
      } else {
        await sendSmsCode(destination, code);
      }
    } catch (sendError) {
      await query('DELETE FROM two_factor_codes WHERE user_id = $1 AND method = $2', [userId, method]);
      const message = sendError instanceof Error ? sendError.message : 'Failed to send verification code';
      return NextResponse.json({ error: message }, { status: 503 });
    }

    return NextResponse.json({
      success: true,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('[2FA Initiate] Error:', error);
    return NextResponse.json({ error: 'Failed to initiate verification' }, { status: 500 });
  }
}
