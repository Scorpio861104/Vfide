/**
 * Merchant Order Management API
 *
 * GET   — List orders (merchant: own orders; customer: own purchases)
 * POST  — Create order (from checkout)
 * PATCH — Update order status / fulfillment (merchant only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { query, getClient } from '@/lib/db';
import { withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { z } from 'zod4';

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;
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

interface CatalogProductRow {
  id: number;
  name: string;
  sku: string | null;
  price: string | number;
}

interface CatalogVariantRow {
  id: number;
  product_id: number;
  name: string;
  sku: string | null;
  price_override: string | number | null;
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

const orderItemInputSchema = z.object({
  product_id: z.number().int().positive().optional(),
  variant_id: z.number().int().positive().optional(),
  name: z.string().trim().min(1).max(200),
  sku: z.string().max(100).optional(),
  quantity: z.coerce.number().int().min(1),
  unit_price: z.coerce.number().min(0),
  product_type: z.enum(['physical', 'digital', 'service']).optional(),
});

const createOrderSchema = z.object({
  merchant_address: z.string().trim().toLowerCase().regex(ADDRESS_LIKE_REGEX),
  items: z.array(orderItemInputSchema).min(1).max(100),
  customer_email: z.string().trim().email().max(254).optional(),
  customer_name: z.string().trim().max(200).optional(),
  tx_hash: z.string().regex(TX_HASH_REGEX).optional(),
  token: z.string().trim().max(20).optional(),
  shipping_address: z.record(z.string(), z.unknown()).optional(),
  shipping_method: z.string().trim().max(100).optional(),
  tax_amount: z.coerce.number().min(0).optional(),
  shipping_amount: z.coerce.number().min(0).optional(),
  discount_amount: z.coerce.number().min(0).optional(),
  customer_notes: z.string().trim().max(1000).optional(),
});

const updateOrderSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(VALID_STATUSES).optional(),
  tracking_number: z.string().max(200).optional(),
  tracking_url: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
  tx_hash: z.string().regex(TX_HASH_REGEX).optional(),
});

function generateOrderNumber(): string {
  const d = new Date();
  const prefix = `ORD-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `${prefix}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

function getAuthAddress(user: JWTPayload): string | null {
  const address = typeof user.address === 'string'
    ? user.address.trim().toLowerCase() : '';
  if (!address || !ADDRESS_LIKE_REGEX.test(address)) {
    return null;
  }
  return address;
}

// ─────────────────────────── GET: List orders
async function getHandler(request: NextRequest, user: JWTPayload) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = getAuthAddress(user);
  if (!authAddress) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
    logger.error('[Orders GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

// ─────────────────────────── POST: Create order
async function postHandler(request: NextRequest, user: JWTPayload) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = getAuthAddress(user);
  if (!authAddress) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const parsedBody = createOrderSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const body = parsedBody.data;
    const { merchant_address, items, customer_email, customer_name,
            tx_hash, token, shipping_address, shipping_method,
            tax_amount, shipping_amount, discount_amount, customer_notes } = body;

    // #105 fix: enforce server-authoritative pricing from merchant catalog.
    // This route serves customer checkout creation; never trust client-supplied unit_price.
    const productIds = Array.from(
      new Set(
        items
          .map((item) => item.product_id)
          .filter((id): id is number => Number.isInteger(id) && id > 0)
      )
    );

    if (productIds.length !== items.length) {
      return NextResponse.json(
        { error: 'Each order item must reference a valid product_id' },
        { status: 400 }
      );
    }

    const variantIds = Array.from(
      new Set(
        items
          .map((item) => item.variant_id)
          .filter((id): id is number => Number.isInteger(id) && id > 0)
      )
    );

    const productResult = await query<CatalogProductRow>(
      `SELECT id, name, sku, price
         FROM merchant_products
        WHERE merchant_address = $1
          AND id = ANY($2::int[])
          AND status = 'active'`,
      [merchant_address, productIds]
    );

    if (productResult.rows.length !== productIds.length) {
      return NextResponse.json(
        { error: 'One or more products are invalid or unavailable' },
        { status: 400 }
      );
    }

    const productsById = new Map<number, CatalogProductRow>(
      productResult.rows.map((row) => [row.id, row])
    );

    const variantsById = new Map<number, CatalogVariantRow>();
    if (variantIds.length > 0) {
      const variantResult = await query<CatalogVariantRow>(
        `SELECT id, product_id, name, sku, price_override
           FROM merchant_product_variants
          WHERE id = ANY($1::int[])
            AND status = 'active'`,
        [variantIds]
      );

      if (variantResult.rows.length !== variantIds.length) {
        return NextResponse.json(
          { error: 'One or more product variants are invalid or unavailable' },
          { status: 400 }
        );
      }

      for (const variant of variantResult.rows) {
        variantsById.set(variant.id, variant);
      }
    }

    // Validate items
    const validatedItems: OrderItem[] = [];
    let subtotal = 0;
    for (const item of items) {
      const productId = item.product_id as number;
      const product = productsById.get(productId);
      if (!product) {
        return NextResponse.json({ error: `Product ${productId} not found` }, { status: 400 });
      }

      let authoritativeUnitPrice = Number(product.price);
      let authoritativeName = product.name;
      let authoritativeSku = product.sku ?? item.sku;

      if (item.variant_id) {
        const variant = variantsById.get(item.variant_id);
        if (!variant || variant.product_id !== productId) {
          return NextResponse.json(
            { error: `Variant ${item.variant_id} is invalid for product ${productId}` },
            { status: 400 }
          );
        }
        if (variant.price_override !== null && variant.price_override !== undefined) {
          authoritativeUnitPrice = Number(variant.price_override);
        }
        authoritativeName = variant.name || authoritativeName;
        authoritativeSku = variant.sku ?? authoritativeSku;
      }

      if (!Number.isFinite(authoritativeUnitPrice) || authoritativeUnitPrice < 0) {
        return NextResponse.json(
          { error: `Product ${productId} has invalid catalog pricing` },
          { status: 400 }
        );
      }

      const qty = Math.max(1, Math.floor(item.quantity));
      const price = authoritativeUnitPrice;
      const lineTotal = Math.round(qty * price * 100) / 100;
      subtotal += lineTotal;
      validatedItems.push({
        product_id: productId,
        variant_id: item.variant_id,
        name: authoritativeName,
        sku: authoritativeSku ?? undefined,
        quantity: qty,
        unit_price: price,
        product_type: item.product_type ?? 'physical',
      });
    }

    subtotal = Math.round(subtotal * 100) / 100;
    const tax = typeof tax_amount === 'number' ? Math.round(tax_amount * 100) / 100 : 0;
    const shipping = typeof shipping_amount === 'number' ? Math.round(shipping_amount * 100) / 100 : 0;
    const discount = typeof discount_amount === 'number' ? Math.round(discount_amount * 100) / 100 : 0;
    const total = Math.round((subtotal + tax + shipping - discount) * 100) / 100;

    if (total < 0) {
      return NextResponse.json({ error: 'Order total cannot be negative' }, { status: 400 });
    }

    // Security hardening (#62): never trust client-supplied tx_hash at order creation time.
    // Payment status is set only by the verified confirmation flow:
    // app/api/merchant/payments/confirm/route.ts
    if (tx_hash) {
      logger.warn('[Orders POST] Ignoring unverified tx_hash; payment must be confirmed via /api/merchant/payments/confirm');
    }

    const paymentStatus = 'unpaid';
    const orderStatus = 'pending';

    const orderNumber = generateOrderNumber();

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const orderResult = await client.query(
        `INSERT INTO merchant_orders
         (order_number, merchant_address, customer_address, customer_email, customer_name,
          status, payment_status, tx_hash, token, subtotal, tax_amount,
          shipping_amount, discount_amount, total, shipping_address, shipping_method, customer_notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         RETURNING *`,
        [
          orderNumber,
          merchant_address,
          authAddress,
          customer_email ?? null,
          customer_name ?? null,
          orderStatus,
          paymentStatus,
          null,
          token || 'VFIDE',
          subtotal,
          tax,
          shipping,
          discount,
          total,
          shipping_address ? JSON.stringify(shipping_address) : null,
          shipping_method ?? null,
          customer_notes ?? null,
        ]
      );

      const order = orderResult.rows[0];
      if (!order) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
      }

      // Insert line items
      for (const item of validatedItems) {
        const lineTotal = Math.round(item.quantity * item.unit_price * 100) / 100;
        await client.query(
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
      const soldProductIds = validatedItems
        .filter(i => i.product_id)
        .map(i => ({ id: i.product_id!, qty: i.quantity }));
      for (const { id, qty } of soldProductIds) {
        await client.query(
          'UPDATE merchant_products SET sold_count = sold_count + $1 WHERE id = $2',
          [qty, id]
        );
      }

      // Decrement inventory if tracking
      for (const item of validatedItems) {
        if (item.product_id) {
          await client.query(
            `UPDATE merchant_products
             SET inventory_count = GREATEST(0, inventory_count - $1)
             WHERE id = $2 AND inventory_tracking = true AND inventory_count IS NOT NULL`,
            [item.quantity, item.product_id]
          );
        }
      }

      await client.query('COMMIT');

      // payment.completed must only be emitted from the verified confirmation flow.
      // See app/api/merchant/payments/confirm/route.ts for on-chain event verification.

      return NextResponse.json({ order }, { status: 201 });
    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('[Orders POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}

// ─────────────────────────── PATCH: Update order status / fulfillment
async function patchHandler(request: NextRequest, user: JWTPayload) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = getAuthAddress(user);
  if (!authAddress) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const parsedBody = updateOrderSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const body = parsedBody.data;
    const { id, status, tracking_number, tracking_url, notes, tx_hash } = body;

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
    if (status) {
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

    if (tracking_number !== undefined) {
      updates.push(`tracking_number = $${pi++}`); params.push(tracking_number);
    }
    if (tracking_url !== undefined) {
      updates.push(`tracking_url = $${pi++}`); params.push(tracking_url);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${pi++}`); params.push(notes);
    }
    // Security hardening (#62): payment settlement updates must come only
    // from the on-chain verified confirmation endpoint.
    if (tx_hash !== undefined) {
      return NextResponse.json(
        {
          error: 'tx_hash updates are not allowed on this endpoint. Use /api/merchant/payments/confirm with on-chain verification.',
        },
        { status: 400 }
      );
    }

    params.push(id);
    const result = await query(
      `UPDATE merchant_orders SET ${updates.join(', ')} WHERE id = $${pi} RETURNING *`,
      params
    );

    return NextResponse.json({ order: result.rows[0] });
  } catch (error) {
    logger.error('[Orders PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
export const PATCH = withAuth(patchHandler);
