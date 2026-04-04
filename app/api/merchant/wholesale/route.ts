import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireOwnership } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,198}$/;

type WholesaleTier = {
  minQty: number;
  price: number;
};

function normalizeAddress(value: string | null): string | null {
  const address = value?.trim().toLowerCase() || '';
  return ADDRESS_REGEX.test(address) ? address : null;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseObject(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return typeof parsed === 'object' && parsed && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : null;
    } catch {
      return null;
    }
  }
  return null;
}

function deriveDefaultTiers(basePrice: number): WholesaleTier[] {
  if (!Number.isFinite(basePrice) || basePrice <= 0) {
    return [];
  }

  return [
    { minQty: 10, price: roundCurrency(basePrice * 0.9) },
    { minQty: 25, price: roundCurrency(basePrice * 0.85) },
    { minQty: 50, price: roundCurrency(basePrice * 0.8) },
  ];
}

function parseWholesaleTiers(raw: unknown, basePrice: number): WholesaleTier[] {
  const objectValue = parseObject(raw);
  const source = Array.isArray(raw)
    ? raw
    : Array.isArray(objectValue?.wholesale_tiers)
      ? objectValue.wholesale_tiers
      : Array.isArray(objectValue?.wholesaleTiers)
        ? objectValue.wholesaleTiers
        : [];

  const parsed = source
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const row = entry as Record<string, unknown>;
      const minQty = Number(row.min_qty ?? row.minQty ?? 0);
      const price = Number(row.price ?? row.unit_price ?? 0);
      if (!Number.isFinite(minQty) || minQty <= 0 || !Number.isFinite(price) || price <= 0) {
        return null;
      }
      return { minQty: Math.floor(minQty), price: roundCurrency(price) };
    })
    .filter((tier): tier is WholesaleTier => Boolean(tier))
    .sort((left, right) => left.minQty - right.minQty)
    .filter((tier, index, all) => all.findIndex((candidate) => candidate.minQty === tier.minQty) === index);

  return parsed.length > 0 ? parsed : deriveDefaultTiers(basePrice);
}

function resolveUnitPrice(basePrice: number, tiers: WholesaleTier[], quantity: number): number {
  const matchedTier = [...tiers].reverse().find((tier) => quantity >= tier.minQty);
  return roundCurrency(matchedTier?.price ?? basePrice);
}

function serializeProduct(row: Record<string, unknown>) {
  const retailPrice = Number(row.price ?? row.retailPrice ?? 0);
  const tiers = parseWholesaleTiers(row.metadata ?? row.tiers, retailPrice);

  return {
    id: Number(row.id ?? 0),
    name: String(row.name ?? ''),
    retailPrice,
    tiers,
    merchantName: String(row.merchant_name ?? row.merchantName ?? row.merchant_address ?? ''),
    merchantAddress: String(row.merchant_address ?? row.merchantAddress ?? ''),
    merchantScore: Number(row.merchant_score ?? row.merchantScore ?? 0),
    minOrder: Number(row.min_order ?? row.minOrder ?? tiers[0]?.minQty ?? 10),
    available: Number(row.inventory_count ?? row.available ?? 0),
  };
}

function serializeGroupBuy(row: Record<string, unknown>) {
  return {
    id: String(row.id ?? ''),
    product_id: Number(row.product_id ?? 0),
    product_name: String(row.product_name ?? ''),
    merchant_name: String(row.merchant_name ?? ''),
    initiator_merchant_address: String(row.initiator_merchant_address ?? ''),
    target_quantity: Number(row.target_quantity ?? 0),
    current_quantity: Number(row.current_quantity ?? 0),
    current_unit_price: String(row.current_unit_price ?? '0'),
    status: String(row.status ?? 'open'),
    notes: row.notes ? String(row.notes) : '',
    expires_at: row.expires_at ? String(row.expires_at) : null,
    created_at: row.created_at ? String(row.created_at) : new Date().toISOString(),
  };
}

function serializeOrder(row: Record<string, unknown>) {
  return {
    id: String(row.id ?? ''),
    buyer_merchant_address: String(row.buyer_merchant_address ?? ''),
    seller_merchant_address: String(row.seller_merchant_address ?? ''),
    product_id: Number(row.product_id ?? 0),
    quantity: Number(row.quantity ?? 0),
    unit_price: String(row.unit_price ?? '0'),
    total: String(row.total ?? '0'),
    status: String(row.status ?? 'submitted'),
    created_at: row.created_at ? String(row.created_at) : new Date().toISOString(),
  };
}

async function resolveMerchantAddress(identifier: string): Promise<string | null> {
  if (ADDRESS_REGEX.test(identifier)) {
    return identifier.toLowerCase();
  }

  if (!SLUG_REGEX.test(identifier)) {
    return null;
  }

  const result = await query(
    'SELECT merchant_address FROM merchant_profiles WHERE slug = $1 LIMIT 1',
    [identifier],
  );

  return result.rows[0]?.merchant_address ? String(result.rows[0].merchant_address).toLowerCase() : null;
}

async function getProductById(productId: number) {
  const result = await query(
    `SELECT p.id, p.name, p.price, p.inventory_count, p.metadata, p.merchant_address,
            COALESCE(mp.display_name, p.merchant_address) AS merchant_name
       FROM merchant_products p
       LEFT JOIN merchant_profiles mp ON mp.merchant_address = p.merchant_address
      WHERE p.id = $1
        AND p.status = 'active'
      LIMIT 1`,
    [productId],
  );

  return result.rows[0] as Record<string, unknown> | undefined;
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(request.url);
  const merchant = searchParams.get('merchant')?.trim() || '';
  const search = searchParams.get('q')?.trim() || '';
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit')) || 12));

  try {
    const conditions = ["p.status = 'active'", "p.product_type = 'physical'"];
    const params: Array<string | number> = [];
    let paramIndex = 1;

    if (merchant) {
      const merchantAddress = await resolveMerchantAddress(merchant);
      if (!merchantAddress) {
        return NextResponse.json({ error: 'Invalid merchant parameter' }, { status: 400 });
      }
      conditions.push(`p.merchant_address = $${paramIndex++}`);
      params.push(merchantAddress);
    }

    if (search) {
      conditions.push(`(p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex += 1;
    }

    params.push(limit);
    const productsResult = await query(
      `SELECT p.id, p.name, p.price, p.inventory_count, p.metadata, p.merchant_address,
              COALESCE(mp.display_name, p.merchant_address) AS merchant_name,
              COALESCE(u.proof_score, 0) AS merchant_score
         FROM merchant_products p
         LEFT JOIN merchant_profiles mp ON mp.merchant_address = p.merchant_address
         LEFT JOIN users u ON lower(u.wallet_address) = lower(p.merchant_address)
        WHERE ${conditions.join(' AND ')}
        ORDER BY p.featured DESC, p.sold_count DESC, p.created_at DESC
        LIMIT $${paramIndex}`,
      params,
    );

    let groupBuyRows: Array<Record<string, unknown>> = [];
    try {
      const groupBuysResult = await query(
        `SELECT gb.id, gb.product_id, gb.initiator_merchant_address, gb.target_quantity,
                gb.current_quantity, gb.current_unit_price, gb.status, gb.notes,
                gb.expires_at, gb.created_at, p.name AS product_name,
                COALESCE(mp.display_name, p.merchant_address) AS merchant_name
           FROM merchant_wholesale_group_buys gb
           JOIN merchant_products p ON p.id = gb.product_id
           LEFT JOIN merchant_profiles mp ON mp.merchant_address = p.merchant_address
          WHERE gb.status IN ('open', 'funded')
          ORDER BY gb.created_at DESC
          LIMIT 20`,
        [],
      );
      groupBuyRows = groupBuysResult.rows as Array<Record<string, unknown>>;
    } catch (error) {
      logger.warn('[Merchant Wholesale GET] Group-buy table unavailable or unreadable', error);
    }

    return NextResponse.json({
      products: productsResult.rows.map((row) => serializeProduct(row as Record<string, unknown>)),
      groupBuys: groupBuyRows.map((row) => serializeGroupBuy(row)),
    });
  } catch (error) {
    logger.error('[Merchant Wholesale GET] Error:', error);
    return NextResponse.json({ error: 'Failed to load wholesale catalog' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();
    const merchantAddress = normalizeAddress(typeof body?.merchantAddress === 'string' ? body.merchantAddress : null);
    const action = typeof body?.action === 'string' ? body.action.trim() : '';
    const quantity = Math.max(1, Math.floor(Number(body?.quantity ?? 0)));

    if (!merchantAddress || !action || !Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ error: 'merchantAddress, action, and quantity are required' }, { status: 400 });
    }

    const authResult = await requireOwnership(request, merchantAddress);
    if (authResult instanceof NextResponse) return authResult;

    if (action === 'joinGroupBuy') {
      const groupBuyId = typeof body?.groupBuyId === 'string' ? body.groupBuyId.trim() : '';
      if (!groupBuyId) {
        return NextResponse.json({ error: 'groupBuyId required' }, { status: 400 });
      }

      const existingResult = await query(
        `SELECT gb.id, gb.product_id, gb.initiator_merchant_address, gb.target_quantity,
                gb.current_quantity, gb.current_unit_price, gb.status, gb.notes,
                gb.expires_at, gb.created_at, p.name AS product_name, p.price, p.metadata,
                COALESCE(mp.display_name, p.merchant_address) AS merchant_name
           FROM merchant_wholesale_group_buys gb
           JOIN merchant_products p ON p.id = gb.product_id
           LEFT JOIN merchant_profiles mp ON mp.merchant_address = p.merchant_address
          WHERE gb.id = $1
          LIMIT 1`,
        [groupBuyId],
      );

      if (existingResult.rows.length === 0) {
        return NextResponse.json({ error: 'Group buy not found' }, { status: 404 });
      }

      const existing = existingResult.rows[0] as Record<string, unknown>;
      if (String(existing.status ?? 'open') === 'closed') {
        return NextResponse.json({ error: 'Group buy is closed' }, { status: 400 });
      }

      const basePrice = Number(existing.price ?? existing.current_unit_price ?? 0);
      const tiers = parseWholesaleTiers(existing.metadata, basePrice);
      const nextQuantity = Number(existing.current_quantity ?? 0) + quantity;
      const nextUnitPrice = resolveUnitPrice(basePrice, tiers, nextQuantity);
      const nextStatus = nextQuantity >= Number(existing.target_quantity ?? 0) ? 'funded' : 'open';

      const updateResult = await query(
        `UPDATE merchant_wholesale_group_buys
            SET current_quantity = $2,
                current_unit_price = $3,
                status = $4
          WHERE id = $1
          RETURNING id, product_id, initiator_merchant_address, target_quantity,
                    current_quantity, current_unit_price, status, notes, expires_at, created_at`,
        [groupBuyId, nextQuantity, nextUnitPrice, nextStatus],
      );

      await query(
        `INSERT INTO merchant_wholesale_group_buy_participants (
           group_buy_id, merchant_address, quantity, pledged_total
         ) VALUES ($1, $2, $3, $4)
         ON CONFLICT (group_buy_id, merchant_address)
         DO UPDATE SET quantity = merchant_wholesale_group_buy_participants.quantity + EXCLUDED.quantity,
                       pledged_total = merchant_wholesale_group_buy_participants.pledged_total + EXCLUDED.pledged_total`,
        [groupBuyId, merchantAddress, quantity, roundCurrency(nextUnitPrice * quantity)],
      );

      const merged = {
        ...(updateResult.rows[0] as Record<string, unknown>),
        product_name: existing.product_name,
        merchant_name: existing.merchant_name,
      };

      return NextResponse.json({ success: true, groupBuy: serializeGroupBuy(merged) });
    }

    const productId = Math.floor(Number(body?.productId ?? 0));
    if (!Number.isFinite(productId) || productId <= 0) {
      return NextResponse.json({ error: 'productId required' }, { status: 400 });
    }

    const product = await getProductById(productId);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const sellerAddress = String(product.merchant_address ?? '').toLowerCase();
    if (!sellerAddress || sellerAddress === merchantAddress) {
      return NextResponse.json({ error: 'Wholesale orders require a different merchant seller' }, { status: 400 });
    }

    const availableInventory = Number(product.inventory_count ?? 0);
    if (availableInventory > 0 && quantity > availableInventory) {
      return NextResponse.json({ error: 'Requested quantity exceeds available inventory' }, { status: 400 });
    }

    const basePrice = Number(product.price ?? 0);
    const tiers = parseWholesaleTiers(product.metadata, basePrice);
    const unitPrice = resolveUnitPrice(basePrice, tiers, quantity);
    const total = roundCurrency(unitPrice * quantity);

    if (action === 'createOrder') {
      const orderResult = await query(
        `INSERT INTO merchant_wholesale_orders (
           buyer_merchant_address, seller_merchant_address, product_id, quantity,
           unit_price, total, status
         ) VALUES ($1, $2, $3, $4, $5, $6, 'submitted')
         RETURNING id, buyer_merchant_address, seller_merchant_address, product_id,
                   quantity, unit_price, total, status, created_at`,
        [merchantAddress, sellerAddress, productId, quantity, unitPrice, total],
      );

      return NextResponse.json({
        success: true,
        order: serializeOrder(orderResult.rows[0] as Record<string, unknown>),
      });
    }

    if (action === 'createGroupBuy') {
      const requestedTarget = Math.floor(Number(body?.targetQty ?? 0));
      const targetQuantity = Math.max(quantity, requestedTarget || tiers[0]?.minQty || quantity);
      const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 300) : null;
      const status = quantity >= targetQuantity ? 'funded' : 'open';

      const groupBuyResult = await query(
        `INSERT INTO merchant_wholesale_group_buys (
           product_id, initiator_merchant_address, target_quantity, current_quantity,
           current_unit_price, status, notes
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, product_id, initiator_merchant_address, target_quantity,
                   current_quantity, current_unit_price, status, notes, expires_at, created_at`,
        [productId, merchantAddress, targetQuantity, quantity, unitPrice, status, note],
      );

      await query(
        `INSERT INTO merchant_wholesale_group_buy_participants (
           group_buy_id, merchant_address, quantity, pledged_total
         ) VALUES ($1, $2, $3, $4)`,
        [groupBuyResult.rows[0]?.id, merchantAddress, quantity, total],
      );

      const groupBuy = {
        ...(groupBuyResult.rows[0] as Record<string, unknown>),
        product_name: product.name,
        merchant_name: product.merchant_name,
      };

      return NextResponse.json({ success: true, groupBuy: serializeGroupBuy(groupBuy) });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    logger.error('[Merchant Wholesale POST] Error:', error);
    return NextResponse.json({ error: 'Failed to process wholesale action' }, { status: 500 });
  }
}
