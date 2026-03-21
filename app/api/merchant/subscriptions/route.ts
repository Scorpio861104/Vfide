/**
 * Merchant Subscription Plans API
 * 
 * GET    — List plans for a merchant (public) or own plans (authenticated)
 * POST   — Create a new subscription plan
 * PATCH  — Update plan details or status
 * DELETE — Archive a subscription plan
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { dispatchWebhook } from '@/lib/webhooks/merchantWebhookDispatcher';

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{3,40}$/;
const VALID_INTERVALS = ['weekly', 'monthly', 'quarterly', 'yearly'] as const;

async function getAuthAddress(request: NextRequest): Promise<string | NextResponse> {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const address = typeof authResult.user?.address === 'string'
    ? authResult.user.address.trim().toLowerCase()
    : '';
  if (!address || !ADDRESS_LIKE_REGEX.test(address)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return address;
}

// ─────────────────────────── GET: List plans
export async function GET(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(request.url);
  const merchantAddress = searchParams.get('merchant');

  // Public access: list active plans for a specific merchant
  if (merchantAddress && ADDRESS_LIKE_REGEX.test(merchantAddress)) {
    try {
      const result = await query(
        `SELECT id, merchant_address, name, description, token, amount, interval,
                trial_days, max_subscribers, active_subscribers, created_at
         FROM merchant_subscription_plans
         WHERE merchant_address = $1 AND status = 'active'
         ORDER BY amount ASC`,
        [merchantAddress.toLowerCase()]
      );
      return NextResponse.json({ plans: result.rows });
    } catch (error) {
      console.error('[Subscriptions GET] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
    }
  }

  // Authenticated: list own plans (all statuses)
  const authAddress = await getAuthAddress(request);
  if (authAddress instanceof NextResponse) return authAddress;

  try {
    const result = await query(
      `SELECT p.*,
              (SELECT COUNT(*) FROM subscriptions s WHERE s.plan_id = p.id AND s.status = 'active') as current_subscribers,
              COALESCE(
                (SELECT json_agg(sub ORDER BY sub.created_at DESC)
                 FROM (
                   SELECT s.id, s.user_id, s.status, s.next_payment, s.trial_ends_at,
                          s.last_payment_at, s.failure_count, s.created_at
                   FROM subscriptions s
                   WHERE s.plan_id = p.id
                   ORDER BY s.created_at DESC
                   LIMIT 50
                 ) sub),
                '[]'::json
              ) AS subscribers
       FROM merchant_subscription_plans p
       WHERE p.merchant_address = $1
       ORDER BY p.created_at DESC`,
      [authAddress]
    );

    return NextResponse.json({ plans: result.rows });
  } catch (error) {
    console.error('[Subscriptions GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
  }
}

// ─────────────────────────── POST: Create plan
export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = await getAuthAddress(request);
  if (authAddress instanceof NextResponse) return authAddress;

  try {
    const body = await request.json() as Record<string, unknown>;
    const { name, description, token, amount, interval, trial_days, max_subscribers } = body;

    // Validate required fields
    if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 100) {
      return NextResponse.json({ error: 'Plan name required (max 100 chars)' }, { status: 400 });
    }
    if (typeof token !== 'string' || !ADDRESS_LIKE_REGEX.test(token)) {
      return NextResponse.json({ error: 'Valid token address required' }, { status: 400 });
    }
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: 'Positive amount required' }, { status: 400 });
    }
    if (typeof interval !== 'string' || !VALID_INTERVALS.includes(interval as typeof VALID_INTERVALS[number])) {
      return NextResponse.json({ error: `Interval must be one of: ${VALID_INTERVALS.join(', ')}` }, { status: 400 });
    }

    // Limit plans per merchant
    const countResult = await query(
      'SELECT COUNT(*) as count FROM merchant_subscription_plans WHERE merchant_address = $1',
      [authAddress]
    );
    if (Number(countResult.rows[0]?.count) >= 20) {
      return NextResponse.json({ error: 'Maximum 20 subscription plans per merchant' }, { status: 400 });
    }

    const trialDays = Math.max(0, Math.min(90, Math.floor(Number(trial_days) || 0)));
    const maxSubs = typeof max_subscribers === 'number' && max_subscribers > 0
      ? Math.floor(max_subscribers) : null;

    const result = await query(
      `INSERT INTO merchant_subscription_plans
       (merchant_address, name, description, token, amount, interval, trial_days, max_subscribers)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        authAddress,
        name.trim(),
        typeof description === 'string' ? description.slice(0, 2000) : null,
        token,
        amountNum,
        interval,
        trialDays,
        maxSubs,
      ]
    );

    return NextResponse.json({ plan: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[Subscriptions POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 });
  }
}

// ─────────────────────────── PATCH: Update plan
export async function PATCH(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = await getAuthAddress(request);
  if (authAddress instanceof NextResponse) return authAddress;

  try {
    const body = await request.json() as Record<string, unknown>;
    const { id, name, description, amount, status, trial_days, max_subscribers } = body;

    if (typeof id !== 'number') {
      return NextResponse.json({ error: 'Plan ID required' }, { status: 400 });
    }

    // Verify ownership
    const existing = await query(
      'SELECT * FROM merchant_subscription_plans WHERE id = $1 AND merchant_address = $2',
      [id, authAddress]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const updates: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (typeof name === 'string' && name.trim().length > 0) {
      updates.push(`name = $${paramIndex++}`);
      params.push(name.trim().slice(0, 100));
    }
    if (typeof description === 'string') {
      updates.push(`description = $${paramIndex++}`);
      params.push(description.slice(0, 2000));
    }
    if (typeof amount === 'number' && amount > 0) {
      updates.push(`amount = $${paramIndex++}`);
      params.push(amount);
    }
    if (typeof status === 'string' && ['active', 'paused', 'archived'].includes(status)) {
      updates.push(`status = $${paramIndex++}`);
      params.push(status);
    }
    if (typeof trial_days === 'number') {
      updates.push(`trial_days = $${paramIndex++}`);
      params.push(Math.max(0, Math.min(90, Math.floor(trial_days))));
    }
    if (typeof max_subscribers === 'number' || max_subscribers === null) {
      updates.push(`max_subscribers = $${paramIndex++}`);
      params.push(max_subscribers === null ? null : Math.max(0, Math.floor(max_subscribers as number)));
    }

    params.push(id);
    const result = await query(
      `UPDATE merchant_subscription_plans SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params as (string | number | boolean | Date | null | undefined)[]
    );

    return NextResponse.json({ plan: result.rows[0] });
  } catch (error) {
    console.error('[Subscriptions PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 });
  }
}

// ─────────────────────────── Subscriber Management (for customers)

/**
 * Subscribe a customer to a plan.
 * Called internally when a customer subscribes via the checkout page.
 */
export async function subscribeCustomer(
  userId: number,
  planId: number,
  merchantAddress: string,
): Promise<{ success: boolean; subscription?: Record<string, unknown>; error?: string }> {
  try {
    // Fetch plan
    const planResult = await query(
      'SELECT * FROM merchant_subscription_plans WHERE id = $1 AND status = $2',
      [planId, 'active']
    );
    if (planResult.rows.length === 0) {
      return { success: false, error: 'Plan not found or inactive' };
    }

    const plan = planResult.rows[0];
    if (!plan) {
      return { success: false, error: 'Plan not found or inactive' };
    }

    // Check subscriber cap
    if (plan.max_subscribers !== null) {
      const countResult = await query(
        "SELECT COUNT(*) as count FROM subscriptions WHERE plan_id = $1 AND status = 'active'",
        [planId]
      );
      if (Number(countResult.rows[0]?.count) >= Number(plan.max_subscribers)) {
        return { success: false, error: 'Plan is full' };
      }
    }

    // Check duplicate
    const existingResult = await query(
      "SELECT id FROM subscriptions WHERE user_id = $1 AND plan_id = $2 AND status = 'active'",
      [userId, planId]
    );
    if (existingResult.rows.length > 0) {
      return { success: false, error: 'Already subscribed to this plan' };
    }

    // Calculate trial end and next payment
    const now = new Date();
    const trialDays = Number(plan.trial_days) || 0;
    const trialEndsAt = trialDays > 0 ? new Date(now.getTime() + trialDays * 86400000) : null;
    const nextPayment = trialEndsAt ?? getNextPaymentDate(now, plan.interval as string);

    const result = await query(
      `INSERT INTO subscriptions
       (user_id, merchant_address, merchant_name, amount, frequency, next_payment,
        status, plan_id, trial_ends_at, token)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        userId,
        merchantAddress,
        plan.name,
        plan.amount,
        plan.interval,
        nextPayment,
        'active',
        planId,
        trialEndsAt,
        plan.token,
      ]
    );

    // Update subscriber count
    await query(
      'UPDATE merchant_subscription_plans SET active_subscribers = active_subscribers + 1 WHERE id = $1',
      [planId]
    );

    // Dispatch webhook
    dispatchWebhook(merchantAddress, 'subscription.created', {
      plan_id: planId,
      plan_name: plan.name,
      user_id: userId,
      amount: plan.amount,
      interval: plan.interval,
      trial_days: trialDays,
    });

    return { success: true, subscription: result.rows[0] };
  } catch (error) {
    console.error('[Subscribe] Error:', error);
    return { success: false, error: 'Failed to create subscription' };
  }
}

function getNextPaymentDate(from: Date, interval: string): Date {
  const next = new Date(from);
  switch (interval) {
    case 'weekly': next.setDate(next.getDate() + 7); break;
    case 'monthly': next.setMonth(next.getMonth() + 1); break;
    case 'quarterly': next.setMonth(next.getMonth() + 3); break;
    case 'yearly': next.setFullYear(next.getFullYear() + 1); break;
  }
  return next;
}
