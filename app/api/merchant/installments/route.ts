import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireOwnership, withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { z } from 'zod4';

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const DECIMAL_AMOUNT_REGEX = /^\d+(\.\d{1,18})?$/;

const createInstallmentPlanSchema = z.object({
  merchantAddress: z.string().trim().regex(ADDRESS_REGEX),
  customerAddress: z.string().trim().regex(ADDRESS_REGEX),
  orderId: z.string().trim().min(1).max(120),
  totalAmount: z.union([
    z.number().positive(),
    z.string().trim().regex(DECIMAL_AMOUNT_REGEX),
  ]),
  installmentCount: z.number().int().positive().max(120),
  intervalDays: z.number().int().positive().max(365).optional(),
  token: z.string().trim().max(32).optional(),
});

function normalizeAddress(value: string | null): string | null {
  const address = value?.trim().toLowerCase() || '';
  return ADDRESS_REGEX.test(address) ? address : null;
}

function parsePayments(raw: unknown): Array<{ amount: string; paid_at: string }> {
  if (Array.isArray(raw)) {
    return raw.map((payment) => ({
      amount: String((payment as { amount?: unknown }).amount ?? '0'),
      paid_at: String((payment as { paid_at?: unknown }).paid_at ?? new Date().toISOString()),
    }));
  }

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsePayments(parsed);
    } catch {
      return [];
    }
  }

  return [];
}

function serializePlan(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    customer_address: row.customer_address ? String(row.customer_address) : '',
    order_id: String(row.order_id ?? ''),
    total_amount: String(row.total_amount ?? '0'),
    installment_count: Number(row.installment_count ?? 0),
    installment_amount: String(row.installment_amount ?? '0'),
    interval_days: Number(row.interval_days ?? 30),
    paid_count: Number(row.paid_count ?? 0),
    next_payment_due: row.next_payment_due ? String(row.next_payment_due) : null,
    status: String(row.status ?? 'active'),
    created_at: row.created_at ? String(row.created_at) : new Date().toISOString(),
    payments: parsePayments(row.payments),
  };
}

async function getHandler(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const merchant = normalizeAddress(request.nextUrl.searchParams.get('merchant'));
  if (!merchant) {
    return NextResponse.json({ error: 'merchant required' }, { status: 400 });
  }

  const authResult = await requireOwnership(request, merchant);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const result = await query(
      `SELECT ip.id, ip.customer_address, ip.order_id, ip.total_amount, ip.installment_count,
              ip.installment_amount, ip.interval_days, ip.paid_count, ip.next_payment_due,
              ip.status, ip.created_at,
              COALESCE((
                SELECT json_agg(json_build_object('amount', p.amount, 'paid_at', p.paid_at) ORDER BY p.paid_at)
                  FROM installment_payments p
                 WHERE p.plan_id = ip.id
              ), '[]'::json) AS payments
         FROM merchant_installment_plans ip
        WHERE ip.merchant_address = $1
        ORDER BY ip.created_at DESC
        LIMIT 100`,
      [merchant],
    );

    return NextResponse.json({
      plans: result.rows.map((row) => serializePlan(row as Record<string, unknown>)),
    });
  } catch (error) {
    logger.error('[Merchant Installments GET] Error:', error);
    return NextResponse.json({ error: 'Failed to load installment plans' }, { status: 500 });
  }
}

async function postHandler(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const parsedBody = createInstallmentPlanSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const body = parsedBody.data;
    const merchantAddress = normalizeAddress(body.merchantAddress);
    const customerAddress = normalizeAddress(body.customerAddress);
    const orderId = body.orderId.trim();
    const totalAmount = Number(body.totalAmount);
    const installmentCount = Number(body.installmentCount);
    const intervalDays = Number(body.intervalDays ?? 30);
    const token = (body.token ?? 'VFIDE').trim();

    if (!merchantAddress || !customerAddress || !orderId || !Number.isFinite(totalAmount) || totalAmount <= 0 || !Number.isFinite(installmentCount) || installmentCount <= 0) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const authResult = await requireOwnership(request, merchantAddress);
    if (authResult instanceof NextResponse) return authResult;

    const installmentAmount = Math.ceil((totalAmount / installmentCount) * 100) / 100;
    const nextDue = new Date(Date.now() + Math.max(intervalDays, 1) * 86400000).toISOString();

    const result = await query(
      `INSERT INTO merchant_installment_plans (
         merchant_address, customer_address, order_id, total_amount, installment_count,
         installment_amount, interval_days, next_payment_due, token
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, customer_address, order_id, total_amount, installment_count, installment_amount,
                 interval_days, paid_count, next_payment_due, status, created_at`,
      [merchantAddress, customerAddress, orderId, totalAmount, installmentCount, installmentAmount, Math.max(intervalDays, 1), nextDue, token || 'VFIDE'],
    );

    return NextResponse.json({
      success: true,
      plan: serializePlan(result.rows[0] as Record<string, unknown>),
    });
  } catch (error) {
    logger.error('[Merchant Installments POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 });
  }
}

async function patchHandler(request: NextRequest, user: JWTPayload) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const requesterAddress = typeof user.address === 'string'
      ? user.address.trim().toLowerCase()
      : '';
    if (!requesterAddress || !ADDRESS_REGEX.test(requesterAddress)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const planId = typeof body?.planId === 'string' ? body.planId.trim() : '';
    const txHash = typeof body?.txHash === 'string' ? body.txHash.trim() : null;
    const amount = Number(body?.amount ?? 0);

    if (!planId || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'planId and amount required' }, { status: 400 });
    }

    await query(
      `INSERT INTO installment_payments (plan_id, amount, tx_hash)
       VALUES ($1, $2, $3)`,
      [planId, amount, txHash],
    );

    const planResult = await query(
      `SELECT paid_count, installment_count, interval_days
         FROM merchant_installment_plans
        WHERE id = $1`,
      [planId],
    );

    if (planResult.rows.length === 0) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const plan = (planResult.rows[0] ?? {}) as Record<string, unknown>;
    const newPaidCount = Number(plan.paid_count ?? 0) + 1;
    const installmentCount = Number(plan.installment_count ?? newPaidCount);
    const intervalDays = Number(plan.interval_days ?? 30);
    const isComplete = newPaidCount >= installmentCount;
    const nextDue = isComplete ? null : new Date(Date.now() + Math.max(intervalDays, 1) * 86400000).toISOString();

    await query(
      `UPDATE merchant_installment_plans
          SET paid_count = $2,
              status = $3,
              next_payment_due = $4
        WHERE id = $1`,
      [planId, newPaidCount, isComplete ? 'completed' : 'active', nextDue],
    );

    return NextResponse.json({ success: true, paidCount: newPaidCount, complete: isComplete });
  } catch (error) {
    logger.error('[Merchant Installments PATCH] Error:', error);
    return NextResponse.json({ error: 'Payment recording failed' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
export const PATCH = withAuth(patchHandler);
