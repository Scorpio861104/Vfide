import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const STORE_DIR = path.join(process.cwd(), '.vfide-runtime');
const STORE_PATH = path.join(STORE_DIR, 'subscriptions.json');

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

type SubscriptionStore = Record<string, SubscriptionRecord[]>;

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

async function readStore(): Promise<SubscriptionStore> {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as SubscriptionStore;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeStore(store: SubscriptionStore) {
  await fs.mkdir(STORE_DIR, { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address');

  if (!address || !ADDRESS_REGEX.test(address)) {
    return NextResponse.json({ error: 'Valid address query parameter is required' }, { status: 400 });
  }

  const store = await readStore();
  const normalizedAddress = normalizeAddress(address);
  const subscriptions = store[normalizedAddress] ?? [];

  return NextResponse.json({
    subscriptions,
    total: subscriptions.length,
    source: 'backend',
  });
}

export async function POST(request: NextRequest) {
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

  if (!recipient || !amount || !Number.isFinite(numericAmount) || numericAmount <= 0 || !INTERVALS.has(interval)) {
    return NextResponse.json({ error: 'recipient, amount, and interval are required' }, { status: 400 });
  }

  const now = new Date();
  const record: SubscriptionRecord = {
    id: `sub-${Date.now()}`,
    recipient,
    label,
    amount,
    interval,
    status: 'active',
    nextPayment: getNextPaymentDate(interval, now),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    source: body.contractsReady ? 'onchain-ready' : 'local',
    note: body.contractsReady
      ? 'Contract routes are configured and ready for wallet confirmation.'
      : 'Stored in the VFIDE backend schedule until production contract addresses are restored.',
  };

  const store = await readStore();
  const normalizedAddress = normalizeAddress(body.address);
  const nextSubscriptions = [record, ...(store[normalizedAddress] ?? [])];
  store[normalizedAddress] = nextSubscriptions;
  await writeStore(store);

  return NextResponse.json(
    {
      record,
      subscriptions: nextSubscriptions,
      total: nextSubscriptions.length,
      source: 'backend',
    },
    { status: 201 },
  );
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null) as {
    address?: string;
    id?: string;
    action?: 'pause' | 'resume' | 'cancel';
  } | null;

  if (!body?.address || !ADDRESS_REGEX.test(body.address) || !body.id || !body.action) {
    return NextResponse.json({ error: 'address, id, and action are required' }, { status: 400 });
  }

  const store = await readStore();
  const normalizedAddress = normalizeAddress(body.address);
  const subscriptions = store[normalizedAddress] ?? [];
  const subscriptionIndex = subscriptions.findIndex((subscription) => subscription.id === body.id);

  if (subscriptionIndex === -1) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
  }

  const currentSubscription = subscriptions[subscriptionIndex];
  if (!currentSubscription) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
  }

  const nextStatus: SubscriptionStatus = body.action === 'cancel'
    ? 'cancelled'
    : body.action === 'pause'
      ? 'paused'
      : 'active';

  subscriptions[subscriptionIndex] = {
    ...currentSubscription,
    status: nextStatus,
    nextPayment: nextStatus === 'cancelled' ? null : currentSubscription.nextPayment,
    updatedAt: new Date().toISOString(),
  };

  store[normalizedAddress] = subscriptions;
  await writeStore(store);

  return NextResponse.json({
    record: subscriptions[subscriptionIndex],
    subscriptions,
    total: subscriptions.length,
    source: 'backend',
  });
}
