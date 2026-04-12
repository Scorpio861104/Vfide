import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const INTERVALS = new Set(['weekly', 'monthly', 'quarterly', 'yearly']);

type BillingInterval = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
type SubscriptionStatus = 'active' | 'paused' | 'cancelled';

type SubscriptionRecord = {
  id: string;
  recipient: string;
  label: string;
  amount: string;
  interval: BillingInterval;
  status: SubscriptionStatus;
  nextPayment: string | null;
  createdAt: string;
  updatedAt: string;
  source: 'local' | 'onchain-ready';
  note: string;
};

function normalizeAddress(value: string) {
  return value.trim().toLowerCase();
}

function getNextPaymentDate(interval: BillingInterval, from = new Date()) {
  const next = new Date(from);
  switch (interval) {
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'quarterly':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next.toISOString();
}

type SubscriptionRow = {
  id: number;
  merchant_address: string;
  merchant_name: string | null;
  amount: string;
  frequency: BillingInterval;
  status: SubscriptionStatus;
  next_payment: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  source: 'local' | 'onchain-ready';
  note: string;
};

function toIsoString(value: Date | string | null) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toRecord(row: SubscriptionRow): SubscriptionRecord {
  return {
    id: String(row.id),
    recipient: row.merchant_address,
    label: row.merchant_name?.trim() || 'Recurring payment',
    amount: row.amount,
    interval: row.frequency,
    status: row.status,
    nextPayment: toIsoString(row.next_payment),
    createdAt: toIsoString(row.created_at) || new Date(0).toISOString(),
    updatedAt: toIsoString(row.updated_at) || new Date(0).toISOString(),
    source: row.source,
    note: row.note,
  };
}

async function ensureUserId(address: string) {
  const normalizedAddress = normalizeAddress(address);

  await query(
    `INSERT INTO users (wallet_address, proof_score)
     VALUES ($1, 5000)
     ON CONFLICT (wallet_address) DO NOTHING`,
    [normalizedAddress],
  );

  const result = await query<{ id: number }>(
    'SELECT id FROM users WHERE wallet_address = $1',
    [normalizedAddress],
  );

  const userId = result.rows[0]?.id;
  if (!userId) {
    throw new Error('Unable to resolve subscription owner');
  }

  return userId;
}

async function listSubscriptions(address: string) {
  const result = await query<SubscriptionRow>(
    `SELECT s.id,
            s.merchant_address,
            s.merchant_name,
            s.amount::text AS amount,
            s.frequency,
            s.status,
            s.next_payment,
            s.created_at,
            s.updated_at,
            COALESCE(s.source, 'local') AS source,
            COALESCE(s.note, '') AS note
       FROM subscriptions s
       INNER JOIN users u ON u.id = s.user_id
      WHERE u.wallet_address = $1
      ORDER BY s.created_at DESC`,
    [normalizeAddress(address)],
  );

  return result.rows.map(toRecord);
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const address = request.nextUrl.searchParams.get('address');

  if (!address || !ADDRESS_REGEX.test(address)) {
    return NextResponse.json({ error: 'Valid address query parameter is required' }, { status: 400 });
  }

  try {
    const subscriptions = await listSubscriptions(address);

    return NextResponse.json({
      subscriptions,
      total: subscriptions.length,
      source: 'backend',
    });
  } catch {
    return NextResponse.json({ error: 'Failed to load subscriptions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const body = await request.json().catch(() => null) as {
    address?: string;
    recipient?: string;
    amount?: string;
    label?: string;
    interval?: BillingInterval;
    contractsReady?: boolean;
  } | null;

  if (!body?.address || !ADDRESS_REGEX.test(body.address)) {
    return NextResponse.json({ error: 'Valid address is required' }, { status: 400 });
  }

  const recipient = body.recipient?.trim() ?? '';
  const amount = body.amount?.trim() ?? '';
  const label = body.label?.trim() || 'Recurring payment';
  const interval = body.interval ?? 'monthly';
  const numericAmount = Number.parseFloat(amount);

  if (!ADDRESS_REGEX.test(recipient) || !amount || !Number.isFinite(numericAmount) || numericAmount <= 0 || !INTERVALS.has(interval)) {
    return NextResponse.json({ error: 'recipient, amount, and interval are required' }, { status: 400 });
  }

  const now = new Date();
  const source = body.contractsReady ? 'onchain-ready' : 'local';
  const note = body.contractsReady
    ? 'Contract routes are configured and ready for wallet confirmation.'
    : 'Stored in the VFIDE backend schedule until production contract addresses are restored.';

  try {
    const userId = await ensureUserId(body.address);
    const result = await query<SubscriptionRow>(
      `INSERT INTO subscriptions (
         user_id,
         merchant_address,
         merchant_name,
         amount,
         frequency,
         next_payment,
         status,
         created_at,
         updated_at,
         source,
         note
       )
       VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $7, $8, $9)
       RETURNING id,
                 merchant_address,
                 merchant_name,
                 amount::text AS amount,
                 frequency,
                 status,
                 next_payment,
                 created_at,
                 updated_at,
                 source,
                 note`,
      [
        userId,
        normalizeAddress(recipient),
        label,
        amount,
        interval,
        getNextPaymentDate(interval, now),
        now.toISOString(),
        source,
        note,
      ],
    );

    const subscriptions = await listSubscriptions(body.address);

    return NextResponse.json(
      {
        record: result.rows[0] ? toRecord(result.rows[0]) : null,
        subscriptions,
        total: subscriptions.length,
        source: 'backend',
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const body = await request.json().catch(() => null) as {
    address?: string;
    id?: string;
    action?: 'pause' | 'resume' | 'cancel';
  } | null;

  if (!body?.address || !ADDRESS_REGEX.test(body.address) || !body.id || !body.action) {
    return NextResponse.json({ error: 'address, id, and action are required' }, { status: 400 });
  }

  const nextStatus: SubscriptionStatus = body.action === 'cancel'
    ? 'cancelled'
    : body.action === 'pause'
      ? 'paused'
      : 'active';

  try {
    const userId = await ensureUserId(body.address);
    const result = await query<SubscriptionRow>(
      `UPDATE subscriptions
          SET status = $1,
              next_payment = CASE WHEN $1 = 'cancelled' THEN NULL ELSE next_payment END,
              updated_at = NOW()
        WHERE id = $2
          AND user_id = $3
        RETURNING id,
                  merchant_address,
                  merchant_name,
                  amount::text AS amount,
                  frequency,
                  status,
                  next_payment,
                  created_at,
                  updated_at,
                  COALESCE(source, 'local') AS source,
                  COALESCE(note, '') AS note`,
      [nextStatus, Number(body.id), userId],
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }
    const updated = result.rows[0]!;

    const subscriptions = await listSubscriptions(body.address);

    return NextResponse.json({
      record: toRecord(updated),
      subscriptions,
      total: subscriptions.length,
      source: 'backend',
    });
  } catch {
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  }
}
