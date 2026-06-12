/**
 * Merchant HQ aggregation API (Wave 66) — unified merchant operating center.
 *
 * GET /api/merchant/hq
 *
 * Composes existing merchant signals into one actionable payload:
 * Merchant Health composite, Merchant Advisor outputs, delivery reliability,
 * trust/dispute posture, and continuity/recovery readiness.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import { computeMerchantHealth } from '@/lib/seer/merchantHealth';
import { computeMerchantAdvisor, type MerchantAdvisorInput } from '@/lib/seer/merchantAdvisor';
import { computeDeliveryReliability, type DeliveryStats } from '@/lib/seer/deliveryReliability';

export const dynamic = 'force-dynamic';

function authAddr(user: JWTPayload): string | null {
  const addr = typeof user.address === 'string' ? user.address.trim().toLowerCase() : '';
  return addr ? addr : null;
}

async function getHandler(request: NextRequest, user: JWTPayload): Promise<Response> {
  const rl = await withRateLimit(request, 'read');
  if (rl) return rl;

  const addr = authAddr(user);
  if (!addr) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [advisorInputs, delivery, trust, continuity] = await Promise.all([
      readAdvisorInputs(addr),
      readDelivery(addr),
      readTrust(addr),
      readContinuity(addr),
    ]);

    const advisor = computeMerchantAdvisor(advisorInputs);

    const retentionRate =
      advisorInputs.distinctCustomers90 > 0
        ? advisorInputs.repeatCustomers90 / advisorInputs.distinctCustomers90
        : null;
    const revenueTrendRatio =
      advisorInputs.revenuePrev30 > 0
        ? advisorInputs.revenueLast30 / advisorInputs.revenuePrev30
        : null;

    const health = computeMerchantHealth({
      commerceHealth: advisor.insufficientData ? null : advisor.healthScore,
      merchantTrust: trust.score,
      deliveryReliability: delivery.score,
      retentionRate,
      revenueTrendRatio,
      lifetimeOrders: advisorInputs.lifetimeOrders,
    });

    return NextResponse.json({
      snapshot: {
        revenueLast30: advisorInputs.revenueLast30,
        ordersLast30: advisorInputs.ordersLast30,
        distinctCustomers90: advisorInputs.distinctCustomers90,
        merchantTrust: trust.score,
        commerceHealth: advisor.insufficientData ? null : advisor.healthScore,
        deliveryReliability: delivery.score,
        deliveryLabel: delivery.reliability,
        continuityReady: continuity.continuityReady,
        recoveryReady: continuity.recoveryReady,
      },
      health: {
        score: health.score,
        band: health.band,
        components: health.components,
        growthSignals: health.growthSignals,
        riskSignals: health.riskSignals,
        topRecommendation: health.topRecommendation,
      },
      advisor: {
        commerceHealth: advisor.insufficientData ? null : advisor.healthScore,
        recommendations: advisor.signals,
        insufficientData: advisor.insufficientData,
        retentionRate,
        revenueTrendRatio,
      },
      trust: {
        score: trust.score,
        disputesTotal: trust.disputesTotal,
        disputesUpheld: trust.disputesUpheld,
        deliveryReliability: delivery.score,
        deliveryLabel: delivery.reliability,
        action:
          trust.disputesUpheld > 0
            ? 'Resolve open disputes and confirm deliveries to rebuild trust.'
            : delivery.reliability === 'concerning'
              ? 'Improve delivery confirmation to raise trust.'
              : 'Trust is in good shape — keep confirming deliveries.',
      },
      continuity: {
        ready: continuity.continuityReady,
        hasSuccessor: continuity.hasSuccessor,
        operatorCount: continuity.operatorCount,
        action: continuity.continuityReady
          ? 'Continuity is configured — review it periodically.'
          : 'Set a successor and an emergency operator so your business survives the unexpected.',
      },
      recovery: {
        ready: continuity.recoveryReady,
        action: continuity.recoveryReady
          ? 'Recovery is configured.'
          : 'Add account-recovery guardians to protect access.',
      },
    });
  } catch (err) {
    logger.error('GET /api/merchant/hq failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Failed to load merchant HQ' }, { status: 500 });
  }
}

async function readAdvisorInputs(addr: string): Promise<MerchantAdvisorInput> {
  const zero: MerchantAdvisorInput = {
    revenueLast30: 0,
    revenuePrev30: 0,
    ordersLast30: 0,
    ordersPrev30: 0,
    distinctCustomers90: 0,
    repeatCustomers90: 0,
    refundsGranted90: 0,
    orders90: 0,
    trackedProducts: 0,
    lowStockProducts: 0,
    hasSubscriptionPlans: false,
    lifetimeOrders: 0,
  };

  try {
    const rev = (
      await query<{ last30: string; prev30: string; orders30: string; ordersprev30: string; lifetime: string }>(
        `SELECT
           COALESCE(SUM(amount) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days'),0)::text AS last30,
           COALESCE(SUM(amount) FILTER (WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days'),0)::text AS prev30,
           COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::text AS orders30,
           COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days')::text AS ordersprev30,
           COUNT(*)::text AS lifetime
         FROM merchant_payment_confirmations WHERE merchant_address = $1`,
        [addr],
      )
    ).rows[0];

    if (rev) {
      zero.revenueLast30 = Number(rev.last30);
      zero.revenuePrev30 = Number(rev.prev30);
      zero.ordersLast30 = Number(rev.orders30);
      zero.ordersPrev30 = Number(rev.ordersprev30);
      zero.lifetimeOrders = Number(rev.lifetime);
      zero.orders90 = Number(rev.lifetime);
    }
  } catch {
    // Best-effort read. Keep zeros to produce provisional outputs instead of fabricated values.
  }

  return zero;
}

async function readDelivery(addr: string): Promise<{ score: number | null; reliability: string }> {
  try {
    const rows = (
      await query<{ status: string; n: string }>(
        `SELECT status, COUNT(*)::text AS n FROM shipments WHERE merchant_address = $1 GROUP BY status`,
        [addr],
      )
    ).rows;

    const stats: DeliveryStats = {
      shipped: 0,
      deliveredConfirmed: 0,
      deliveredUnconfirmed: 0,
      notReceived: 0,
      returned: 0,
    };

    for (const row of rows) {
      const n = Number(row.n);
      if (row.status === 'shipped') stats.shipped = n;
      else if (row.status === 'delivered_confirmed') stats.deliveredConfirmed = n;
      else if (row.status === 'delivered_unconfirmed') stats.deliveredUnconfirmed = n;
      else if (row.status === 'not_received') stats.notReceived = n;
      else if (row.status === 'returned') stats.returned = n;
    }

    const result = computeDeliveryReliability(stats);
    return { score: result.score, reliability: result.reliability };
  } catch {
    return { score: null, reliability: 'unproven' };
  }
}

async function readTrust(addr: string): Promise<{ score: number | null; disputesTotal: number; disputesUpheld: number }> {
  try {
    const row = (
      await query<{ total: string; upheld: string; refunded: string }>(
        `SELECT COUNT(*)::text AS total,
                COUNT(*) FILTER (WHERE status = 'upheld')::text AS upheld,
                COUNT(*) FILTER (WHERE status = 'refunded')::text AS refunded
           FROM disputes WHERE respondent_address = $1`,
        [addr],
      )
    ).rows[0];

    const upheld = Number(row?.upheld ?? 0);
    const refunded = Number(row?.refunded ?? 0);
    const score = Math.max(0, Math.min(100, 70 - upheld * 20 - refunded * 5));
    return { score, disputesTotal: Number(row?.total ?? 0), disputesUpheld: upheld };
  } catch {
    return { score: null, disputesTotal: 0, disputesUpheld: 0 };
  }
}

async function readContinuity(
  addr: string,
): Promise<{ continuityReady: boolean; recoveryReady: boolean; hasSuccessor: boolean; operatorCount: number }> {
  try {
    const succ = (
      await query<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM merchant_succession WHERE merchant_address = $1`,
        [addr],
      )
    ).rows[0];
    const ops = (
      await query<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM merchant_operators WHERE merchant_address = $1`,
        [addr],
      )
    ).rows[0];

    const hasSuccessor = Number(succ?.c ?? 0) > 0;
    const operatorCount = Number(ops?.c ?? 0);

    return {
      continuityReady: hasSuccessor && operatorCount > 0,
      recoveryReady: hasSuccessor,
      hasSuccessor,
      operatorCount,
    };
  } catch {
    return { continuityReady: false, recoveryReady: false, hasSuccessor: false, operatorCount: 0 };
  }
}

export const GET = withAuth(getHandler);
