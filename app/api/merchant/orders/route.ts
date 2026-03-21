/**
 * Merchant Order Management API
 *
 * GET   — List orders (merchant: own orders; customer: own purchases)
 * POST  — Create order (from checkout)
 * PATCH — Update order status / fulfillment (merchant only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { dispatchWebhook } from '@/lib/webhooks/merchantWebhookDispatcher';

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{3,40}$/;
const TX_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;

interface OrderItem {
  product_id?: number;
  variant_id?: number;
  name: string;
  sku?: string;
  quantity: number;
  unit_price: number;
  product_type?: string;
}

const VALID_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'] as const;
const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending:    ['confirmed', 'cancelled'],
  confirmed:  ['processing', 'cancelled', 'refunded'],
  processing: ['shipped', 'cancelled', 'refunded'],
  shipped:    ['delivered', 'refunded'],
  delivered:  ['completed', 'refunded'],
  completed:  ['refunded'],
  cancelled:  [],
  refunded:   [],
};

function generateOrderNumber(): string {
  const d = new Date();
  const prefix = `ORD-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `${prefix}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

async function getAuthAddress(request: NextRequest): Promise<string | NextResponse> {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const address = typeof authResult.user?.address === 'string'
    ? authResult.user.address.trim().toLowerCase() : '';
  if (!address || !ADDRESS_LIKE_REGEX.test(address)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return address;
}

// ─────────────────────────── GET: List orders
export async function GET(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = await getAuthAddress(request);
  if (authAddress instanceof NextResponse) return authAddress;

  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role') || 'merchant';  // merchant or customer
  const status = searchParams.get('status');
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20));
  const offset = (page - 1) * limit;

  try {
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let pi = 1;

    if (role === 'customer') {
      conditions.push(`o.customer_address = $${pi++}`);
    } else {
      conditions.push(`o.merchant_address = $${pi++}`);
    }
    params.push(authAddress);

    if (status && VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
      conditions.push(`o.status = $${pi++}`);
      params.push(status);
    }

    const where = conditions.join(' AND ');

    const [orders, countResult] = await Promise.all([
      query(
        `SELECT o.*, json_agg(json_build_object(
           'id', oi.id, 'name', oi.name, 'quantity', oi.quantity,
           'unit_price', oi.unit_price, 'total', oi.total,
           'product_type', oi.product_type, 'sku', oi.sku
         )) as items
         FROM merchant_orders o
         LEFT JOIN merchant_order_items oi ON oi.order_id = o.id
         WHERE ${where}
         GROUP BY o.id
         ORDER BY o.created_at DESC
         LIMIT $${pi++} OFFSET $${pi}`,
        [...params, limit, offset]
      ),
      query(
        `SELECT COUNT(*) as total FROM merchant_orders o WHERE ${where}`,
        params
      ),
    ]);

    return NextResponse.json({
      orders: orders.rows,
      pagination: {
        page, limit,
        total: Number(countResult.rows[0]?.total ?? 0),
        pages: Math.ceil(Number(countResult.rows[0]?.total ?? 0) / limit),
      },
    });
  } catch (error) {
    console.error('[Orders GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

// ─────────────────────────── POST: Create order
export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = await getAuthAddress(request);
  if (authAddress instanceof NextResponse) return authAddress;

  try {
    const body = await request.json() as Record<string, unknown>;
    const { merchant_address, items, customer_email, customer_name,
            tx_hash, token, shipping_address, shipping_method,
            tax_amount, shipping_amount, discount_amount, customer_notes } = body;

    if (typeof merchant_address !== 'string' || !ADDRESS_LIKE_REGEX.test(merchant_address)) {
      return NextResponse.json({ error: 'Valid merchant_address required' }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
      return NextResponse.json({ error: '1-100 items required' }, { status: 400 });
    }

    // Validate items
    const validatedItems: OrderItem[] = [];
    let subtotal = 0;
    for (const item of items) {
      const i = item as Record<string, unknown>;
      if (typeof i.name !== 'string' || !i.name.trim()) continue;
      const qty = typeof i.quantity === 'number' ? Math.max(1, Math.floor(i.quantity)) : 1;
      const price = typeof i.unit_price === 'number' && i.unit_price >= 0 ? i.unit_price : 0;
      const lineTotal = Math.round(qty * price * 100) / 100;
      subtotal += lineTotal;
      validatedItems.push({
        product_id: typeof i.product_id === 'number' ? i.product_id : undefined,
        variant_id: typeof i.variant_id === 'number' ? i.variant_id : undefined,
        name: (i.name as string).trim().slice(0, 200),
        sku: typeof i.sku === 'string' ? i.sku.slice(0, 100) : undefined,
        quantity: qty,
        unit_price: price,
        product_type: typeof i.product_type === 'string' ? i.product_type : 'physical',
      });
    }

    if (validatedItems.length === 0) {
      return NextResponse.json({ error: 'At least one valid item required' }, { status: 400 });
    }

    subtotal = Math.round(subtotal * 100) / 100;
    const tax = typeof tax_amount === 'number' && tax_amount >= 0 ? Math.round(tax_amount * 100) / 100 : 0;
    const shipping = typeof shipping_amount === 'number' && shipping_amount >= 0 ? Math.round(shipping_amount * 100) / 100 : 0;
    const discount = typeof discount_amount === 'number' && discount_amount >= 0 ? Math.round(discount_amount * 100) / 100 : 0;
    const total = Math.round((subtotal + tax + shipping - discount) * 100) / 100;

    if (total < 0) {
      return NextResponse.json({ error: 'Order total cannot be negative' }, { status: 400 });
    }

    const validTxHash = typeof tx_hash === 'string' && TX_HASH_REGEX.test(tx_hash) ? tx_hash : null;
    const paymentStatus = validTxHash ? 'paid' : 'unpaid';
    const orderStatus = validTxHash ? 'confirmed' : 'pending';

    const orderNumber = generateOrderNumber();

    const orderResult = await query(
      `INSERT INTO merchant_orders
       (order_number, merchant_address, customer_address, customer_email, customer_name,
        status, payment_status, tx_hash, token, subtotal, tax_amount,
        shipping_amount, discount_amount, total, shipping_address, shipping_method, customer_notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING *`,
      [
        orderNumber,
        (merchant_address as string).toLowerCase(),
        authAddress,
        typeof customer_email === 'string' ? customer_email.slice(0, 254) : null,
        typeof customer_name === 'string' ? customer_name.slice(0, 200) : null,
        orderStatus,
        paymentStatus,
        validTxHash,
        typeof token === 'string' ? token.slice(0, 20) : 'VFIDE',
        subtotal,
        tax,
        shipping,
        discount,
        total,
        shipping_address && typeof shipping_address === 'object' ? JSON.stringify(shipping_address) : null,
        typeof shipping_method === 'string' ? shipping_method.slice(0, 100) : null,
        typeof customer_notes === 'string' ? customer_notes.slice(0, 1000) : null,
      ]
    );

    const order = orderResult.rows[0];
    if (!order) {
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }

    // Insert line items
    for (const item of validatedItems) {
      const lineTotal = Math.round(item.quantity * item.unit_price * 100) / 100;
      await query(
        `INSERT INTO merchant_order_items
         (order_id, product_id, variant_id, name, sku, quantity, unit_price, total, product_type)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          order.id,
          item.product_id ?? null,
          item.variant_id ?? null,
          item.name,
          item.sku ?? null,
          item.quantity,
          item.unit_price,
          lineTotal,
          item.product_type ?? 'physical',
        ]
      );
    }

    // Update sold counts
    const productIds = validatedItems
      .filter(i => i.product_id)
      .map(i => ({ id: i.product_id!, qty: i.quantity }));
    for (const { id, qty } of productIds) {
      await query(
        'UPDATE merchant_products SET sold_count = sold_count + $1 WHERE id = $2',
        [qty, id]
      );
    }

    // Decrement inventory if tracking
    for (const item of validatedItems) {
      if (item.product_id) {
        await query(
          `UPDATE merchant_products
           SET inventory_count = GREATEST(0, inventory_count - $1)
           WHERE id = $2 AND inventory_tracking = true AND inventory_count IS NOT NULL`,
          [item.quantity, item.product_id]
        );
      }
    }

    // Dispatch webhook
    dispatchWebhook((merchant_address as string).toLowerCase(), 'payment.completed', {
      order_number: orderNumber,
      total,
      token: typeof token === 'string' ? token : 'VFIDE',
      tx_hash: validTxHash,
      customer_address: authAddress,
      items_count: validatedItems.length,
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error('[Orders POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}

// ─────────────────────────── PATCH: Update order status / fulfillment
export async function PATCH(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = await getAuthAddress(request);
  if (authAddress instanceof NextResponse) return authAddress;

  try {
    const body = await request.json() as Record<string, unknown>;
    const { id, status, tracking_number, tracking_url, notes, tx_hash } = body;

    if (typeof id !== 'number') {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 });
    }

    const existing = await query(
      'SELECT * FROM merchant_orders WHERE id = $1 AND merchant_address = $2',
      [id, authAddress]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = existing.rows[0]!;
    const updates: string[] = ['updated_at = NOW()'];
    const params: (string | number | null)[] = [];
    let pi = 1;

    // Status transitions
    if (typeof status === 'string' && VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
      const allowed = STATUS_TRANSITIONS[order.status as string];
      if (!allowed || !allowed.includes(status)) {
        return NextResponse.json({
          error: `Cannot transition from '${order.status}' to '${status}'`,
        }, { status: 400 });
      }
      updates.push(`status = $${pi++}`); params.push(status);

      if (status === 'shipped') {
        updates.push('shipped_at = NOW()');
      } else if (status === 'delivered') {
        updates.push('delivered_at = NOW()');
      } else if (status === 'completed') {
        updates.push('fulfilled_at = NOW()');
      } else if (status === 'cancelled') {
        updates.push('cancelled_at = NOW()');
      } else if (status === 'refunded') {
        updates.push('refunded_at = NOW()');
        updates.push(`payment_status = 'refunded'`);
      }
    }

    if (typeof tracking_number === 'string') {
      updates.push(`tracking_number = $${pi++}`); params.push(tracking_number.slice(0, 200));
    }
    if (typeof tracking_url === 'string') {
      updates.push(`tracking_url = $${pi++}`); params.push(tracking_url.slice(0, 2000));
    }
    if (typeof notes === 'string') {
      updates.push(`notes = $${pi++}`); params.push(notes.slice(0, 2000));
    }
    if (typeof tx_hash === 'string' && TX_HASH_REGEX.test(tx_hash)) {
      updates.push(`tx_hash = $${pi++}`); params.push(tx_hash);
      updates.push(`payment_status = 'paid'`);
    }

    params.push(id);
    const result = await query(
      `UPDATE merchant_orders SET ${updates.join(', ')} WHERE id = $${pi} RETURNING *`,
      params
    );

    return NextResponse.json({ order: result.rows[0] });
  } catch (error) {
    console.error('[Orders PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
