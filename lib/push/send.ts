import { query } from '@/lib/db';

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:hello@vfide.io';

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string }>;
}

interface SubscriptionRow {
  endpoint: string;
  p256dh?: string | null;
  auth?: string | null;
  keys?: { p256dh?: string; auth?: string } | string | null;
}

function normalizeAddress(userAddress: string): string {
  return userAddress.trim().toLowerCase();
}

function toSubscription(row: SubscriptionRow) {
  let parsedKeys: { p256dh?: string; auth?: string } = {};

  if (typeof row.keys === 'string') {
    try {
      parsedKeys = JSON.parse(row.keys) as { p256dh?: string; auth?: string };
    } catch {
      parsedKeys = {};
    }
  } else if (row.keys) {
    parsedKeys = row.keys;
  }

  const p256dh = row.p256dh || parsedKeys.p256dh;
  const auth = row.auth || parsedKeys.auth;

  if (!row.endpoint || !p256dh || !auth) {
    return null;
  }

  return {
    endpoint: row.endpoint,
    keys: { p256dh, auth },
  };
}

async function loadSubscriptions(userAddress: string): Promise<SubscriptionRow[]> {
  const normalized = normalizeAddress(userAddress);

  try {
    const result = await query<SubscriptionRow>(
      `SELECT ps.endpoint, ps.p256dh, ps.auth, ps.keys
       FROM push_subscriptions ps
       LEFT JOIN users u ON ps.user_id = u.id
       WHERE LOWER(COALESCE(ps.user_address, u.wallet_address, '')) = $1`,
      [normalized]
    );
    return result.rows;
  } catch {
    try {
      const fallback = await query<SubscriptionRow>(
        `SELECT ps.endpoint, ps.keys
         FROM push_subscriptions ps
         JOIN users u ON ps.user_id = u.id
         WHERE LOWER(u.wallet_address) = $1`,
        [normalized]
      );
      return fallback.rows;
    } catch {
      return [];
    }
  }
}

export async function sendPushToUser(
  userAddress: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return { sent: 0, failed: 0 };
  }

  const subscriptions = await loadSubscriptions(userAddress);
  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const webpush = await import('web-push');
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

  let sent = 0;
  let failed = 0;

  for (const row of subscriptions) {
    try {
      const subscription = toSubscription(row);
      if (!subscription) {
        failed += 1;
        continue;
      }

      await webpush.sendNotification(
        subscription,
        JSON.stringify({
          ...payload,
          icon: payload.icon || '/icon-192.png',
          badge: payload.badge || '/badge-72x72.png',
        })
      );
      sent += 1;
    } catch (error) {
      const statusCode = typeof error === 'object' && error && 'statusCode' in error
        ? Number((error as { statusCode?: number }).statusCode)
        : 0;

      if (statusCode === 404 || statusCode === 410) {
        try {
          await query('DELETE FROM push_subscriptions WHERE endpoint = $1', [row.endpoint]);
        } catch {
          // Best effort cleanup.
        }
      }

      failed += 1;
    }
  }

  return { sent, failed };
}

export const PUSH_PAYLOADS = {
  paymentReceived: (amount: string, from: string): PushPayload => ({
    title: 'Payment received!',
    body: `${from} sent you ${amount} VFIDE`,
    tag: 'payment',
    data: { url: '/vault', type: 'payment_received' },
  }),
  badgeEarned: (badgeName: string): PushPayload => ({
    title: 'Badge earned!',
    body: `You earned the ${badgeName} badge`,
    tag: 'badge',
    data: { url: '/badges', type: 'badge_earned' },
  }),
  loanDue: (amount: string, daysLeft: number): PushPayload => ({
    title: 'Loan payment due',
    body: `${amount} VFIDE due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
    tag: 'loan',
    data: { url: '/lending', type: 'loan_due' },
  }),
  orderReceived: (orderId: string, amount: string): PushPayload => ({
    title: 'New order!',
    body: `Order #${orderId} for ${amount} VFIDE`,
    tag: 'order',
    data: { url: '/merchant', type: 'order_received' },
  }),
};
