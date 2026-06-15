/**
 * Merchant Advisor API (Institution 3 — Commerce).
 *
 * GET — computes the authenticated merchant's Commerce Health + advisor signals from REAL data:
 *   • Revenue + order trend: merchant_payment_confirmations, 30d vs prior 30d (timestamped rows →
 *     derived trend; no snapshot table needed).
 *   • Repeat customers: distinct vs repeat customer_address over 90 days.
 *   • Refund concern: merchant_returns granted (approved/completed) vs orders, 90 days.
 *   • Low inventory: merchant_products with inventory_tracking and inventory_count at/below threshold.
 *   • Subscription opportunity: presence of subscription plans.
 *
 * Read-only and merchant-scoped. Advisory only — it never changes prices, inventory, or funds.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { computeMerchantAdvisor, type MerchantAdvisorInput } from '@/lib/seer/merchantAdvisor';

export const dynamic = 'force-dynamic';

function authAddr(user: JWTPayload): string | null {
  const a = typeof user.address === 'string' ? user.address.trim().toLowerCase() : '';
  return a ? a : null;
}

const LOW_STOCK_THRESHOLD = 5;

async function getHandler(request: NextRequest, user: JWTPayload): Promise<Response> {
  const rl = await withRateLimit(request, 'read');
  if (rl) return rl;
  const m = authAddr(user);
  if (!m) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Revenue + orders: last 30 days vs the 30 days before. amount is TEXT → cast to numeric.
    const rev = (
      await query<{ rev_last: string; rev_prev: string; ord_last: string; ord_prev: string; lifetime: string }>(
        `SELECT
            COALESCE(SUM(amount::numeric) FILTER (WHERE created_at > NOW() - INTERVAL '30 days'), 0)::text AS rev_last,
            COALESCE(SUM(amount::numeric) FILTER (WHERE created_at <= NOW() - INTERVAL '30 days' AND created_at > NOW() - INTERVAL '60 days'), 0)::text AS rev_prev,
            COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::text AS ord_last,
            COUNT(*) FILTER (WHERE created_at <= NOW() - INTERVAL '30 days' AND created_at > NOW() - INTERVAL '60 days')::text AS ord_prev,
            COUNT(*)::text AS lifetime
           FROM merchant_payment_confirmations WHERE merchant_address = $1`,
        [m],
      )
    ).rows[0];

    // Repeat customers over 90 days.
    const cust = (
      await query<{ distinct_c: string; repeat_c: string }>(
        `SELECT COUNT(*)::text AS distinct_c,
                COUNT(*) FILTER (WHERE n >= 2)::text AS repeat_c
           FROM (
             SELECT customer_address, COUNT(*) AS n
               FROM merchant_payment_confirmations
              WHERE merchant_address = $1 AND created_at > NOW() - INTERVAL '90 days'
              GROUP BY customer_address
           ) t`,
        [m],
      )
    ).rows[0];

    // Refunds granted vs orders (90 days).
    const refunds = (
      await query<{ granted: string }>(
        `SELECT COUNT(*) FILTER (WHERE status IN ('approved','completed'))::text AS granted
           FROM merchant_returns WHERE merchant_address = $1 AND created_at > NOW() - INTERVAL '90 days'`,
        [m],
      )
    ).rows[0];
    const orders90 = Number(
      (await query<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM merchant_payment_confirmations WHERE merchant_address = $1 AND created_at > NOW() - INTERVAL '90 days'`,
        [m],
      )).rows[0]?.c ?? 0,
    );

    // Low inventory from tracked products.
    const stock = (
      await query<{ tracked: string; low: string }>(
        `SELECT COUNT(*) FILTER (WHERE inventory_tracking)::text AS tracked,
                COUNT(*) FILTER (WHERE inventory_tracking AND inventory_count IS NOT NULL AND inventory_count <= $2)::text AS low
           FROM merchant_products WHERE merchant_address = $1`,
        [m, LOW_STOCK_THRESHOLD],
      )
    ).rows[0];

    // Subscription plans present? (table may not exist in all deployments — treat errors as "none".)
    let hasSubscriptionPlans = false;
    try {
      const subs = (await query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM merchant_subscriptions WHERE merchant_address = $1`, [m])).rows[0];
      hasSubscriptionPlans = Number(subs?.c ?? 0) > 0;
    } catch { hasSubscriptionPlans = false; }

    const input: MerchantAdvisorInput = {
      revenueLast30: Number(rev?.rev_last ?? 0),
      revenuePrev30: Number(rev?.rev_prev ?? 0),
      ordersLast30: Number(rev?.ord_last ?? 0),
      ordersPrev30: Number(rev?.ord_prev ?? 0),
      lifetimeOrders: Number(rev?.lifetime ?? 0),
      distinctCustomers90: Number(cust?.distinct_c ?? 0),
      repeatCustomers90: Number(cust?.repeat_c ?? 0),
      refundsGranted90: Number(refunds?.granted ?? 0),
      orders90,
      trackedProducts: Number(stock?.tracked ?? 0),
      lowStockProducts: Number(stock?.low ?? 0),
      hasSubscriptionPlans,
    };

    return NextResponse.json({ advisor: computeMerchantAdvisor(input) });
  } catch (err) {
    logger.error('GET /api/merchant/advisor failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Failed to compute merchant advisor' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);
