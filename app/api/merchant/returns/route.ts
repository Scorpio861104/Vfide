import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireOwnership, withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
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
  // POW-8 FIX: date-range filtering on returns listing.
  const fromDateRaw = request.nextUrl.searchParams.get('from_date');
  const toDateRaw = request.nextUrl.searchParams.get('to_date');
  const fromDate = fromDateRaw && !Number.isNaN(Date.parse(fromDateRaw))
    ? new Date(fromDateRaw).toISOString()
    : null;
  const toDate = toDateRaw && !Number.isNaN(Date.parse(toDateRaw))
    ? new Date(toDateRaw).toISOString()
    : null;

  try {
    const filters = ['merchant_address = $1'];
    const params: Array<string | number | boolean | unknown[] | Date | null | undefined> = [merchant];

    if (status) {
      filters.push(`status = $${params.length + 1}`);
      params.push(status);
    }
    if (fromDate) {
      filters.push(`created_at >= $${params.length + 1}`);
      params.push(fromDate);
    }
    if (toDate) {
      filters.push(`created_at <= $${params.length + 1}`);
      params.push(toDate);
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

async function postHandler(request: NextRequest, user: JWTPayload) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

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

    const customerAddress = typeof user.address === 'string'
      ? user.address.trim().toLowerCase()
      : '';

    if (!customerAddress || !ADDRESS_REGEX.test(customerAddress)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // F-BE-011 FIX: verify the authenticated user actually owns this order
    // before allowing them to file a return against it. Without this check,
    // ANY authenticated user could file return requests for ANY merchant's
    // ANY order_id — flooding the merchant with bogus returns, polluting
    // their dashboard, and (when status==completed by merchant) potentially
    // triggering refund flows for orders that aren't theirs to refund.
    //
    // The order must exist with the claimed merchant_address AND the
    // authenticated address must be the order's customer_address.
    const orderCheck = await query<{ customer_address: string | null }>(
      `SELECT customer_address FROM merchant_orders
        WHERE id = $1 AND merchant_address = $2
        LIMIT 1`,
      [orderId, merchantAddress],
    );
    if (orderCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Order not found for this merchant' }, { status: 404 });
    }
    const orderCustomer = (orderCheck.rows[0]?.customer_address || '').trim().toLowerCase();
    if (orderCustomer !== customerAddress) {
      return NextResponse.json(
        { error: 'You can only file returns for your own orders' },
        { status: 403 },
      );
    }

    // F-BE-036 FIX: validate that each returned item's product_id was
    // actually present in the original order. Without this check a
    // customer could file a return claiming items that were never on the
    // order — passing through to the merchant dashboard and (when the
    // merchant approves with status='completed') triggering inventory
    // restocks for products the customer never bought.
    const orderItemRows = await query<{ product_id: number | null }>(
      `SELECT product_id FROM merchant_order_items WHERE order_id = $1`,
      [orderId],
    );
    const validProductIds = new Set<string>();
    for (const row of orderItemRows.rows) {
      if (row.product_id != null) {
        validProductIds.add(String(row.product_id));
      }
    }
    for (const item of items) {
      if (typeof item !== 'object' || item == null) continue;
      const productId = String(((item as { product_id?: unknown }).product_id ?? '')).trim();
      // Tolerate items without a product_id (the legacy items column allowed
      // free-text rows). Only reject items that DO declare a product_id but
      // that product_id was not in the original order.
      if (productId && !validProductIds.has(productId)) {
        return NextResponse.json(
          { error: `Returned item product_id ${productId} was not in the original order` },
          { status: 400 },
        );
      }
    }

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

    // F-BE-035 FIX: enforce a state machine and idempotency on returns
    // updates. Previously the PATCH allowed any → any transitions and
    // would re-run the inventory restock branch each time the status was
    // re-set to 'completed', double-restocking products. We now:
    //   1. read the current row,
    //   2. require the requested status is a valid forward transition,
    //   3. record whether items have already been restocked (in items JSON
    //      using a `__restocked: true` marker on the row's items column,
    //      stored back at the time of the FIRST completed transition).
    const current = await query<{ status: string | null; items: unknown }>(
      `SELECT status, items FROM merchant_returns WHERE id = $1 AND merchant_address = $2 LIMIT 1`,
      [returnId, merchantAddress],
    );
    if (current.rows.length === 0) {
      return NextResponse.json({ error: 'Return not found' }, { status: 404 });
    }
    const currentStatus = (current.rows[0]?.status || '').trim().toLowerCase();

    // Permitted transitions. `cancelled` and `rejected` are terminal; from
    // there no further status changes are accepted. `completed` is also
    // terminal (idempotency below).
    const validTransitions: Record<string, string[]> = {
      pending: ['approved', 'rejected', 'cancelled'],
      approved: ['completed', 'cancelled'],
      rejected: [],
      completed: [],
      cancelled: [],
    };
    const allowed = validTransitions[currentStatus] ?? [];
    if (!allowed.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition return from '${currentStatus || 'unknown'}' to '${status}'` },
        { status: 400 },
      );
    }

    // Inspect items JSON to read the restock marker, defaulting to false.
    let parsedItemsRoot: unknown = current.rows[0]?.items;
    if (typeof parsedItemsRoot === 'string') {
      try {
        parsedItemsRoot = JSON.parse(parsedItemsRoot);
      } catch {
        parsedItemsRoot = null;
      }
    }
    const itemsRootObj =
      parsedItemsRoot && typeof parsedItemsRoot === 'object' && !Array.isArray(parsedItemsRoot)
        ? (parsedItemsRoot as Record<string, unknown>)
        : null;
    const itemsArray =
      Array.isArray(parsedItemsRoot)
        ? (parsedItemsRoot as unknown[])
        : itemsRootObj && Array.isArray(itemsRootObj.items)
          ? (itemsRootObj.items as unknown[])
          : [];
    const alreadyRestocked = !!(itemsRootObj && itemsRootObj.__restocked === true);

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

    // Restock branch: only restock the FIRST time the return reaches
    // 'approved' OR 'completed'. The state-machine guard above prevents
    // re-entering completed from completed, but we add the explicit
    // `__restocked` guard so any future transitions added below this
    // file cannot accidentally double-restock.
    if ((status === 'approved' || status === 'completed') && !alreadyRestocked) {
      for (const item of itemsArray) {
        if (typeof item === 'object' && item && 'product_id' in item && 'quantity' in item) {
          const productId = String((item as { product_id?: unknown }).product_id ?? '');
          const quantity = Number((item as { quantity?: unknown }).quantity ?? 0);
          if (productId && Number.isFinite(quantity) && quantity > 0) {
            await query(
              `UPDATE merchant_products
                  SET inventory_count = inventory_count + $2
                WHERE id = $1 AND track_inventory = true`,
              [productId, quantity],
            );
          }
        }
      }
      // Persist the restock marker so a future transition cannot duplicate
      // the inventory write. We wrap the items array in an object that
      // carries both the original list and the boolean marker.
      const newItemsValue = itemsRootObj
        ? { ...itemsRootObj, items: itemsArray, __restocked: true }
        : { items: itemsArray, __restocked: true };
      await query(
        `UPDATE merchant_returns SET items = $3 WHERE id = $1 AND merchant_address = $2`,
        [returnId, merchantAddress, JSON.stringify(newItemsValue)],
      );
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
