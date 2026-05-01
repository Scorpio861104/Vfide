import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth, requireOwnership, withAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

function normalizeMerchantAddress(value: string | null): string | null {
  const merchant = value?.trim().toLowerCase() || '';
  return ADDRESS_REGEX.test(merchant) ? merchant : null;
}

function parseItems(raw: unknown) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function serializeReturn(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    order_id: String(row.order_id),
    customer_address: row.customer_address ? String(row.customer_address) : '',
    items: parseItems(row.items),
    type: String(row.type ?? 'refund'),
    reason: row.reason ? String(row.reason) : null,
    status: String(row.status ?? 'requested'),
    refund_amount: row.refund_amount != null ? String(row.refund_amount) : null,
    credit_amount: row.credit_amount != null ? String(row.credit_amount) : null,
    created_at: row.created_at ? String(row.created_at) : new Date().toISOString(),
  };
}

async function getHandler(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const merchant = normalizeMerchantAddress(request.nextUrl.searchParams.get('merchant'));
  if (!merchant) {
    return NextResponse.json({ error: 'merchant required' }, { status: 400 });
  }

  const authResult = await requireOwnership(request, merchant);
  if (authResult instanceof NextResponse) return authResult;

  const status = request.nextUrl.searchParams.get('status')?.trim().toLowerCase();

  try {
    const filters = ['merchant_address = $1'];
    const params: Array<string | number | boolean | unknown[] | Date | null | undefined> = [merchant];

    if (status) {
      filters.push(`status = $${params.length + 1}`);
      params.push(status);
    }

    const result = await query(
      `SELECT id, order_id, customer_address, items, type, reason, status, refund_amount, credit_amount, created_at
         FROM merchant_returns
        WHERE ${filters.join(' AND ')}
        ORDER BY created_at DESC
        LIMIT 100`,
      params,
    );

    return NextResponse.json({ returns: result.rows.map((row) => serializeReturn(row as Record<string, unknown>)) });
  } catch (error) {
    logger.error('[Merchant Returns GET] Error:', error);
    return NextResponse.json({ error: 'Failed to load returns' }, { status: 500 });
  }
}

async function postHandler(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const merchantAddress = normalizeMerchantAddress(typeof body?.merchantAddress === 'string' ? body.merchantAddress : null);
    const orderId = typeof body?.orderId === 'string' ? body.orderId.trim() : '';
    const items = Array.isArray(body?.items) ? body.items : [];
    const type = typeof body?.type === 'string' ? body.type.trim().toLowerCase() : '';
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';

    if (!merchantAddress || !orderId || items.length === 0 || !type) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const customerAddress = typeof authResult.user?.address === 'string'
      ? authResult.user.address.trim().toLowerCase()
      : '';

    const result = await query(
      `INSERT INTO merchant_returns (
         merchant_address, order_id, customer_address, items, type, reason
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, order_id, customer_address, items, type, reason, status, refund_amount, credit_amount, created_at`,
      [merchantAddress, orderId, customerAddress || null, JSON.stringify(items), type, reason || null],
    );

    return NextResponse.json({
      success: true,
      return: serializeReturn(result.rows[0] as Record<string, unknown>),
    });
  } catch (error) {
    logger.error('[Merchant Returns POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create return' }, { status: 500 });
  }
}

async function patchHandler(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();
    const returnId = typeof body?.returnId === 'string' ? body.returnId.trim() : '';
    const merchantAddress = normalizeMerchantAddress(typeof body?.merchantAddress === 'string' ? body.merchantAddress : null);
    const status = typeof body?.status === 'string' ? body.status.trim().toLowerCase() : '';
    const refundAmount = body?.refundAmount == null ? null : Number(body.refundAmount);
    const creditAmount = body?.creditAmount == null ? null : Number(body.creditAmount);

    if (!returnId || !merchantAddress || !status) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const authResult = await requireOwnership(request, merchantAddress);
    if (authResult instanceof NextResponse) return authResult;

    await query(
      `UPDATE merchant_returns
          SET status = $3,
              refund_amount = $4,
              credit_amount = $5,
              resolved_at = NOW(),
              resolved_by = $6
        WHERE id = $1 AND merchant_address = $2`,
      [returnId, merchantAddress, status, refundAmount, creditAmount, merchantAddress],
    );

    if (status === 'approved' || status === 'completed') {
      let returnData: { rows?: Array<{ items?: unknown }> } | null = null;
      try {
        returnData = await query(`SELECT items FROM merchant_returns WHERE id = $1`, [returnId]);
      } catch {
        returnData = { rows: [] };
      }
      const items = parseItems(returnData?.rows?.[0]?.items);

      for (const item of items) {
        if (typeof item === 'object' && item && 'product_id' in item && 'quantity' in item) {
          const productId = String((item as { product_id?: unknown }).product_id ?? '');
          const quantity = Number((item as { quantity?: unknown }).quantity ?? 0);
          if (productId && Number.isFinite(quantity) && quantity > 0) {
            await query(
              `UPDATE merchant_products
                  SET inventory_count = inventory_count + $2
                WHERE id = $1 AND track_inventory = true`,
              [productId, quantity],
            ).catch(() => undefined);
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[Merchant Returns PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update return' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
export const PATCH = withAuth(patchHandler);
