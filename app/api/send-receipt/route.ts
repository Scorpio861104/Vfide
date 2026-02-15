import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { requireAuth } from '@/lib/auth/middleware';
import { query } from '@/lib/db';
import { isAddress } from 'viem';

type SaleItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type SalePayload = {
  id: string;
  timestamp: number;
  items: SaleItem[];
  subtotal: number;
  vfideAmount: string;
  fee: number;
  customerAddress?: string;
  customerEmail?: string;
};

const MAX_ITEMS = 50;
const MAX_NAME_LENGTH = 120;
const MAX_RECEIPTS_PER_DAY = 100;
const MAX_EMAIL_LENGTH = 254;

const isValidEmail = (email: string): boolean => {
  if (!email || email.length > MAX_EMAIL_LENGTH) return false;
  // Strict email validation: no control characters, no angle brackets, no commas
  // RFC 5321 compliant local-part + domain with TLD
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(email);
};

/** Strip any characters that could cause email header injection */
const sanitizeForEmailSubject = (value: string): string => {
  return value.replace(/[\r\n\t]/g, '').slice(0, 120);
};

async function sendReceiptEmail(email: string, sale: SalePayload, merchantAddress: string) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  const fromName = process.env.SENDGRID_FROM_NAME || 'VFIDE';

  if (!apiKey || !fromEmail) {
    throw new Error('Email provider not configured');
  }

  const lines = sale.items
    .map((item) => `• ${item.name} × ${item.quantity} — $${(item.price * item.quantity).toFixed(2)}`)
    .join('\n');

  const bodyText = `Thanks for your purchase!\n\n` +
    `Receipt ID: ${sale.id}\n` +
    `Merchant: ${merchantAddress}\n` +
    `Date: ${new Date(sale.timestamp).toLocaleString()}\n\n` +
    `Items:\n${lines}\n\n` +
    `Subtotal: $${sale.subtotal.toFixed(2)}\n` +
    `VFIDE Fee: $${sale.fee.toFixed(2)}\n` +
    `Total (VFIDE): ${sale.vfideAmount}\n`;

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email }],
          subject: sanitizeForEmailSubject(`Your VFIDE receipt ${sale.id}`),
        },
      ],
      from: { email: fromEmail, name: fromName },
      content: [
        {
          type: 'text/plain',
          value: bodyText,
        },
      ],
    }),
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(`SendGrid error: ${response.status} ${responseBody}`);
  }
}

export async function POST(request: NextRequest) {
  const rateLimit = await withRateLimit(request, 'write');
  if (rateLimit) return rateLimit;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { sale, email, merchantAddress } = body as {
      sale?: SalePayload;
      email?: string;
      merchantAddress?: string;
    };

    if (!sale || !email || !merchantAddress) {
      return NextResponse.json({ error: 'Missing sale, email, or merchantAddress' }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    if (!isAddress(merchantAddress)) {
      return NextResponse.json({ error: 'Invalid merchant address' }, { status: 400 });
    }

    if (authResult.user.address.toLowerCase() !== merchantAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized merchant' }, { status: 403 });
    }

    if (!sale.id || typeof sale.id !== 'string' || sale.id.length > 120) {
      return NextResponse.json({ error: 'Invalid sale id' }, { status: 400 });
    }

    if (!Array.isArray(sale.items) || sale.items.length === 0 || sale.items.length > MAX_ITEMS) {
      return NextResponse.json({ error: 'Invalid sale items' }, { status: 400 });
    }

    let computedSubtotal = 0;
    try {
      computedSubtotal = sale.items.reduce((sum, item) => {
        if (!item || typeof item.name !== 'string' || item.name.length === 0 || item.name.length > MAX_NAME_LENGTH) {
          throw new Error('Invalid item name');
        }
        if (typeof item.price !== 'number' || item.price < 0 || !Number.isFinite(item.price)) {
          throw new Error('Invalid item price');
        }
        if (typeof item.quantity !== 'number' || item.quantity <= 0 || !Number.isFinite(item.quantity)) {
          throw new Error('Invalid item quantity');
        }
        return sum + item.price * item.quantity;
      }, 0);
    } catch (validationError) {
      const message = validationError instanceof Error ? validationError.message : 'Invalid items';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const normalizedSubtotal = Math.round(computedSubtotal * 100) / 100;
    const reportedSubtotal = Math.round((sale.subtotal ?? 0) * 100) / 100;

    if (normalizedSubtotal !== reportedSubtotal) {
      return NextResponse.json({ error: 'Subtotal mismatch' }, { status: 400 });
    }

    const userResult = await query<{ id: number }>(
      'SELECT id FROM users WHERE wallet_address = $1',
      [merchantAddress.toLowerCase()]
    );

    const userId = userResult.rows[0]?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    // Enforce per-merchant daily receipt limit to prevent email abuse
    const todayCountResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM activities
       WHERE user_id = $1 AND activity_type = 'receipt_sent'
       AND created_at >= CURRENT_DATE`,
      [userId]
    );
    const todayCount = parseInt(todayCountResult.rows[0]?.count || '0', 10);
    if (todayCount >= MAX_RECEIPTS_PER_DAY) {
      return NextResponse.json(
        { error: 'Daily receipt limit reached. Try again tomorrow.' },
        { status: 429 }
      );
    }

    await query(
      `INSERT INTO activities (user_id, activity_type, title, description, data)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        userId,
        'receipt_sent',
        'Receipt sent',
        `Receipt sent to ${email}`,
        JSON.stringify({ sale, email }),
      ]
    );

    await sendReceiptEmail(email, sale, merchantAddress);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Send Receipt] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}