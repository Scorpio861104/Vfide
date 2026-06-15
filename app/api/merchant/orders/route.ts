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
import { emitServerEvent } from '@/lib/events/serverEmit';
import { authoritativeShipping, type ShippingZone, type ShippingRate } from '@/lib/commerce/shippingRates';
import { computeTax, type TaxRate, type TaxLine, type ProductType } from '@/lib/commerce/taxEngine';
import { validateCoupon, bundleSavings, composePrice, type BundleDefinition, type CartLineForBundle } from '@/lib/commerce/discountEngine';
import { serializeCouponRow } from '@/lib/coupons';
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
  weight_grams: number | null;
  product_type: string | null;
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
  tax_exempt: z.boolean().optional(),
  shipping_amount: z.coerce.number().min(0).optional(),
  shipping_rate_id: z.coerce.number().int().positive().optional(),
  discount_amount: z.coerce.number().min(0).optional(),
  coupon_code: z.string().trim().max(40).optional(),
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
  // POW-8 FIX: date-range filtering. A merchant pulling "orders in March"
  // previously had to page through ALL historical orders and filter
  // client-side. With this, the server pushes the time range into SQL
  // and uses the existing `idx_orders_created` index. Both bounds are
  // optional; either alone is honored. Invalid dates are silently
  // ignored (no error) so unknown clients don't break.
  const fromDateRaw = searchParams.get('from_date');
  const toDateRaw = searchParams.get('to_date');
  const fromDate = fromDateRaw && !Number.isNaN(Date.parse(fromDateRaw))
    ? new Date(fromDateRaw).toISOString()
    : null;
  const toDate = toDateRaw && !Number.isNaN(Date.parse(toDateRaw))
    ? new Date(toDateRaw).toISOString()
    : null;
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

    // POW-8: date-range conditions. Both index-friendly via idx_orders_created.
    if (fromDate) {
      conditions.push(`o.created_at >= $${pi++}`);
      params.push(fromDate);
    }
    if (toDate) {
      conditions.push(`o.created_at <= $${pi++}`);
      params.push(toDate);
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
          .filter((id): id is number => typeof id === 'number' && Number.isInteger(id) && id > 0)
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
          .filter((id): id is number => typeof id === 'number' && Number.isInteger(id) && id > 0)
      )
    );

    const productResult = await query<CatalogProductRow>(
      `SELECT id, name, sku, price, weight_grams, product_type
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

    // Phase 1A variant-required rule: if a product has ≥1 ACTIVE variant, a purchase line for it MUST name a
    // variant (the variant is the stock-keeping unit). Prevents ambiguous variant-less purchases.
    const productsWithActiveVariants = new Set<number>(
      (await query<{ product_id: number }>(
        `SELECT DISTINCT product_id FROM merchant_product_variants
          WHERE product_id = ANY($1::int[]) AND status = 'active'`,
        [productIds],
      )).rows.map((r) => r.product_id),
    );
    for (const item of items) {
      const pid = item.product_id as number;
      if (productsWithActiveVariants.has(pid) && !item.variant_id) {
        return NextResponse.json(
          { error: `Product ${pid} requires a variant selection` },
          { status: 400 },
        );
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
        product_type: (product.product_type as 'physical' | 'digital' | 'service' | null) ?? item.product_type ?? 'physical',
      });
    }

    subtotal = Math.round(subtotal * 100) / 100;

    // Phase 1E: discounts (coupon + bundles) are SERVER-AUTHORITATIVE and computed BEFORE tax, so tax applies
    // to the discounted base. Non-breaking: with no coupon code and no bundles, the client discount_amount is
    // honored (legacy). Coupon redemption limits are enforced; the redemption row is written in the order tx.
    let discount = typeof discount_amount === 'number' ? Math.round(discount_amount * 100) / 100 : 0;
    let appliedCouponCode: string | null = null;
    let appliedCouponId: string | null = null;
    let couponDiscount = 0;
    let bundleDiscount = 0;
    try {
      // Bundles: savings for the whole cart (no code needed).
      const bundleRows = (await query<{ id: number; name: string; pricing_type: 'fixed' | 'percent'; amount: number; active: boolean }>(
        `SELECT id, name, pricing_type, amount::float8 AS amount, active FROM merchant_bundles WHERE merchant_address = $1 AND active = true`,
        [merchant_address],
      )).rows;
      if (bundleRows.length > 0) {
        const compRows = (await query<{ bundle_id: number; product_id: number; quantity: number }>(
          `SELECT bundle_id, product_id, quantity FROM merchant_bundle_components WHERE bundle_id = ANY($1::int[])`,
          [bundleRows.map((b) => b.id)],
        )).rows;
        const cartLines: CartLineForBundle[] = validatedItems
          .filter((it) => typeof it.product_id === 'number')
          .map((it) => ({ product_id: it.product_id as number, quantity: it.quantity, unit_price: it.unit_price }));
        for (const b of bundleRows) {
          const def: BundleDefinition = {
            id: b.id, name: b.name, pricing_type: b.pricing_type, amount: Number(b.amount), active: b.active,
            components: compRows.filter((c) => c.bundle_id === b.id).map((c) => ({ product_id: c.product_id, quantity: c.quantity })),
          };
          bundleDiscount += bundleSavings(def, cartLines);
        }
        bundleDiscount = Math.round(bundleDiscount * 100) / 100;
      }

      // Coupon: validated against this customer's prior redemptions + the eligible (product-scoped) subtotal.
      if (typeof body.coupon_code === 'string' && body.coupon_code.trim().length > 0) {
        const code = body.coupon_code.trim().toUpperCase();
        const couponRow = (await query<Record<string, unknown>>(
          `SELECT id, merchant_address, code, discount_type, discount_value, min_order_amount, max_discount,
                  max_uses, uses, per_customer_limit, valid_from, valid_until, active, product_ids
             FROM merchant_coupons WHERE merchant_address = $1 AND UPPER(code) = $2`,
          [merchant_address, code],
        )).rows[0];
        if (couponRow) {
          const coupon = serializeCouponRow(couponRow);
          const redemptions = (await query<{ n: string }>(
            `SELECT COUNT(*)::text AS n FROM coupon_redemptions WHERE coupon_id = $1 AND customer_address = $2`,
            [coupon.id, authAddress],
          )).rows[0];
          const customerRedemptions = Number(redemptions?.n ?? 0);
          // eligible subtotal: items whose product_id is in the coupon's productIds (or full subtotal if unscoped)
          const scoped = Array.isArray(coupon.productIds) && coupon.productIds.length > 0;
          const eligibleSubtotal = scoped
            ? Math.round(validatedItems
                .filter((it) => it.product_id != null && coupon.productIds!.includes(String(it.product_id)))
                .reduce((s, it) => s + it.unit_price * it.quantity, 0) * 100) / 100
            : subtotal;
          const decision = validateCoupon(coupon, { nowMs: Date.now(), customerRedemptions, eligibleSubtotal, fullSubtotal: subtotal });
          if (!decision.ok) {
            return NextResponse.json({ error: `Coupon not applied: ${decision.reason}` }, { status: 400 });
          }
          couponDiscount = decision.discount;
          appliedCouponCode = coupon.code;
          appliedCouponId = coupon.id;
        } else {
          return NextResponse.json({ error: 'Coupon not found' }, { status: 400 });
        }
      }

      if (bundleRows.length > 0 || appliedCouponId) {
        discount = Math.round((couponDiscount + bundleDiscount) * 100) / 100;
      }
    } catch (e) {
      logger.warn('[Orders POST] authoritative discount failed; falling back to provided amount', { error: e instanceof Error ? e.message : String(e) });
    }
    // discounted taxable base — tax is computed on this, not the gross subtotal
    const discountedBase = Math.round(Math.max(0, subtotal - discount) * 100) / 100;
    const discountRatio = subtotal > 0 ? discountedBase / subtotal : 1;

    // Phase 1D: tax is SERVER-AUTHORITATIVE when the merchant has configured tax rates. Lines are bucketed by
    // the CATALOG product_type (not the client's), the most-specific matching jurisdiction rate is applied per
    // type, and a tax-exempt order yields zero. Non-breaking: with no configured rates, fall back to the
    // client-supplied tax_amount (legacy). This is in-house rate application, NOT legally-authoritative tax
    // determination (see lib/commerce/taxProvider.ts).
    let tax = typeof tax_amount === 'number' ? Math.round(tax_amount * 100) / 100 : 0;
    let taxBreakdown: ReturnType<typeof computeTax>['breakdown'] | null = null;
    try {
      const taxRates = (await query<TaxRate>(
        `SELECT id, name, rate_bps, jurisdiction_country, jurisdiction_state, jurisdiction_city,
                postal_code_pattern, is_default, enabled, applies_to
           FROM merchant_tax_rates WHERE merchant_address = $1 AND enabled = true`,
        [merchant_address],
      )).rows;
      if (taxRates.length > 0) {
        const addr = (shipping_address ?? {}) as { country?: string; state?: string; city?: string; postal?: string };
        // Phase 1E: tax is computed on the DISCOUNTED base — scale each line by the overall discount ratio so a
        // coupon/bundle reduces taxable value proportionally across product-type buckets.
        const taxLines: TaxLine[] = validatedItems.map((it) => ({
          type: ((it.product_type as ProductType) ?? 'physical'),
          amount: Math.round(it.unit_price * it.quantity * discountRatio * 100) / 100,
        }));
        const result = computeTax(taxRates, taxLines, addr, body.tax_exempt === true);
        tax = result.taxAmount;
        taxBreakdown = result.breakdown;
      }
    } catch (e) {
      logger.warn('[Orders POST] authoritative tax failed; falling back to provided amount', { error: e instanceof Error ? e.message : String(e) });
    }

    // Phase 1C: shipping is SERVER-AUTHORITATIVE when the merchant has configured shipping zones. If they have
    // no zones (haven't adopted the rate engine), fall back to the client-supplied amount (legacy behavior),
    // so existing physical merchants are not broken. Digital-only orders skip shipping entirely.
    let shipping = typeof shipping_amount === 'number' ? Math.round(shipping_amount * 100) / 100 : 0;
    let resolvedShippingRateId: number | null = null;
    try {
      const zones = (await query<ShippingZone>(
        `SELECT id, name, countries, sort_order FROM merchant_shipping_zones WHERE merchant_address = $1 ORDER BY sort_order, id`,
        [merchant_address],
      )).rows;
      if (zones.length > 0) {
        // Total parcel weight from catalog weights (grams). Missing weight treated as 0.
        let totalWeight = 0;
        for (const item of items) {
          const p = item.product_id ? productsById.get(item.product_id) : undefined;
          const w = p?.weight_grams ?? 0;
          totalWeight += (Number(w) || 0) * Math.max(1, Math.floor(item.quantity));
        }
        const rates = (await query<ShippingRate>(
          `SELECT id, zone_id, name, rate_type, base_amount::float8 AS base_amount, per_kg::float8 AS per_kg,
                  pct::float8 AS pct, free_over::float8 AS free_over, min_weight_g, max_weight_g, active
             FROM merchant_shipping_rates WHERE merchant_address = $1 AND active = true ORDER BY id`,
          [merchant_address],
        )).rows;
        const addr = (shipping_address ?? {}) as { country?: string };
        const country = typeof addr.country === 'string' ? addr.country : '';
        const chosenRateId = typeof body.shipping_rate_id === 'number' ? body.shipping_rate_id : null;
        const result = authoritativeShipping(zones, rates, { country, totalWeightGrams: totalWeight, subtotal }, chosenRateId);
        if (!result.ok) {
          return NextResponse.json(
            { error: result.reason === 'NO_SERVICE' ? 'This merchant does not ship to the destination' : 'Selected shipping rate is unavailable' },
            { status: 400 },
          );
        }
        shipping = result.amount;
        resolvedShippingRateId = result.rate_id;
      }
    } catch (e) {
      logger.warn('[Orders POST] authoritative shipping failed; falling back to provided amount', { error: e instanceof Error ? e.message : String(e) });
    }

    // Phase 1E: canonical composition — discount reduces subtotal, tax is on the discounted base (already
    // computed above), shipping added last. composePrice clamps the discount so the total never goes negative.
    const composed = composePrice(subtotal, discount, tax, shipping);
    discount = composed.discount;
    const total = composed.total;

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

      const requestedInventory = new Map<number, number>();
      for (const item of validatedItems) {
        if (!item.product_id) continue;
        requestedInventory.set(
          item.product_id,
          (requestedInventory.get(item.product_id) ?? 0) + item.quantity
        );
      }

      // Phase 1A: when a line names a variant, the VARIANT is the stock-keeping unit. Track requested qty
      // per variant so we enforce + decrement variant inventory (not just product-level).
      const requestedVariantInventory = new Map<number, number>();
      for (const item of validatedItems) {
        if (!item.variant_id) continue;
        requestedVariantInventory.set(
          item.variant_id,
          (requestedVariantInventory.get(item.variant_id) ?? 0) + item.quantity,
        );
      }

      for (const [productId, requestedQty] of requestedInventory.entries()) {
        const inventoryResult = await client.query<{
          inventory_tracking: boolean;
          inventory_count: number | null;
        }>(
          `SELECT inventory_tracking, inventory_count
             FROM merchant_products
            WHERE id = $1 AND merchant_address = $2
            FOR UPDATE`,
          [productId, merchant_address]
        );

        const inventoryRow = inventoryResult.rows[0];
        if (!inventoryRow) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: `Product ${productId} not found` }, { status: 400 });
        }

        if (
          inventoryRow.inventory_tracking &&
          inventoryRow.inventory_count !== null &&
          inventoryRow.inventory_count < requestedQty
        ) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { error: `Insufficient inventory for product ${productId}` },
            { status: 409 }
          );
        }
      }

      // Phase 1A: variant inventory check (variant is the SKU when chosen). NULL count = untracked.
      for (const [variantId, requestedQty] of requestedVariantInventory.entries()) {
        const vRes = await client.query<{ inventory_count: number | null }>(
          `SELECT inventory_count FROM merchant_product_variants WHERE id = $1 FOR UPDATE`,
          [variantId],
        );
        const vRow = vRes.rows[0];
        if (vRow && vRow.inventory_count !== null && vRow.inventory_count < requestedQty) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { error: `Insufficient inventory for variant ${variantId}` },
            { status: 409 }
          );
        }
      }

      const orderResult = await client.query(
        `INSERT INTO merchant_orders
         (order_number, merchant_address, customer_address, customer_email, customer_name,
          status, payment_status, tx_hash, token, subtotal, tax_amount,
          shipping_amount, discount_amount, total, shipping_address, shipping_method, customer_notes, shipping_rate_id,
          tax_exempt, tax_breakdown, coupon_code, bundle_discount)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
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
          resolvedShippingRateId,
          body.tax_exempt === true,
          taxBreakdown ? JSON.stringify(taxBreakdown) : null,
          appliedCouponCode,
          bundleDiscount,
        ]
      );

      const order = orderResult.rows[0];
      if (!order) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
      }

      // Phase 1E: record the coupon redemption and increment usage atomically with the order, so usage caps and
      // per-customer limits are enforced against real redemptions.
      if (appliedCouponId && couponDiscount > 0) {
        await client.query(
          `INSERT INTO coupon_redemptions (coupon_id, customer_address, order_id, discount_applied)
           VALUES ($1,$2,$3,$4)`,
          [appliedCouponId, authAddress, order.id, couponDiscount],
        );
        await client.query(`UPDATE merchant_coupons SET uses = uses + 1 WHERE id = $1`, [appliedCouponId]);
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
      for (const [productId, requestedQty] of requestedInventory.entries()) {
          await client.query(
            `UPDATE merchant_products
             SET inventory_count = GREATEST(0, inventory_count - $1)
             WHERE id = $2 AND inventory_tracking = true AND inventory_count IS NOT NULL`,
            [requestedQty, productId]
          );
      }

      // Phase 1A: decrement variant inventory for variant lines (NULL count = untracked, left untouched).
      for (const [variantId, requestedQty] of requestedVariantInventory.entries()) {
          await client.query(
            `UPDATE merchant_product_variants
             SET inventory_count = GREATEST(0, inventory_count - $1)
             WHERE id = $2 AND inventory_count IS NOT NULL`,
            [requestedQty, variantId]
          );
      }

      await client.query('COMMIT');

      // payment.completed must only be emitted from the verified confirmation flow.
      // See app/api/merchant/payments/confirm/route.ts for on-chain event verification.
      await emitServerEvent(authAddress, 'ORDER_CREATED', { order_id: order?.id }, 'api/merchant/orders');

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

    if (status === 'completed') {
      await emitServerEvent(authAddress, 'ORDER_COMPLETED', { order_id: result.rows[0]?.id }, 'api/merchant/orders');
    }

    // Phase 1B: refunding an order revokes any digital downloads issued for it (chargeback protection).
    // Best-effort — a revocation hiccup must not fail the refund itself.
    if (status === 'refunded') {
      try {
        await query(
          `UPDATE merchant_digital_deliveries SET revoked = true, revoked_at = NOW(), revoke_reason = 'order_refunded'
            WHERE order_id = $1 AND revoked = false`,
          [id],
        );
      } catch (e) {
        logger.warn('[Orders PATCH] digital revoke-on-refund failed (non-fatal)', { order_id: id, error: e instanceof Error ? e.message : String(e) });
      }
    }

    return NextResponse.json({ order: result.rows[0] });
  } catch (error) {
    logger.error('[Orders PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
export const PATCH = withAuth(patchHandler);
