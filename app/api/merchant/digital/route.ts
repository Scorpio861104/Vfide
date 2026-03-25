/**
 * Merchant Digital Goods Delivery API
 *
 * GET   — Retrieve download link (customer, with token validation)
 * POST  — Upload digital asset metadata (merchant)
 * PATCH — Update asset (merchant)
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{3,40}$/;

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

// ─────────────────────────── GET: Retrieve download via token
export async function GET(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(request.url);
  const downloadToken = searchParams.get('token');
  const assetView = searchParams.get('asset_id'); // merchant view

  // Customer: download via token
  if (downloadToken && typeof downloadToken === 'string' && downloadToken.length === 64) {
    try {
      const deliveryResult = await query(
        `SELECT dd.*, da.file_name, da.file_url, da.file_type, da.download_limit, da.expires_hours
         FROM merchant_digital_deliveries dd
         JOIN merchant_digital_assets da ON dd.asset_id = da.id
         WHERE dd.download_token = $1`,
        [downloadToken]
      );

      if (deliveryResult.rows.length === 0) {
        return NextResponse.json({ error: 'Invalid download link' }, { status: 404 });
      }

      const delivery = deliveryResult.rows[0]!;

      // Check expiry
      if (delivery.expires_at && new Date(delivery.expires_at as string) < new Date()) {
        return NextResponse.json({ error: 'Download link expired' }, { status: 410 });
      }

      // Check download limit
      if (delivery.download_limit !== null && Number(delivery.download_count) >= Number(delivery.download_limit)) {
        return NextResponse.json({ error: 'Download limit reached' }, { status: 410 });
      }

      // Increment download count
      await query(
        'UPDATE merchant_digital_deliveries SET download_count = download_count + 1 WHERE id = $1',
        [delivery.id]
      );

      return NextResponse.json({
        download: {
          file_name: delivery.file_name,
          file_url: delivery.file_url,
          file_type: delivery.file_type,
          license_key: delivery.license_key ?? undefined,
          downloads_remaining: delivery.download_limit !== null
            ? Math.max(0, Number(delivery.download_limit) - Number(delivery.download_count) - 1)
            : null,
        },
      });
    } catch (error) {
      logger.error('[Digital GET] Error:', error);
      return NextResponse.json({ error: 'Failed to process download' }, { status: 500 });
    }
  }

  // Merchant: view assets for a product
  if (assetView) {
    const authAddress = await getAuthAddress(request);
    if (authAddress instanceof NextResponse) return authAddress;

    try {
      const result = await query(
        `SELECT da.* FROM merchant_digital_assets da
         JOIN merchant_products p ON da.product_id = p.id
         WHERE da.product_id = $1 AND p.merchant_address = $2
         ORDER BY da.created_at DESC`,
        [Number(assetView), authAddress]
      );
      return NextResponse.json({ assets: result.rows });
    } catch (error) {
      logger.error('[Digital GET assets] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'token or asset_id required' }, { status: 400 });
}

// ─────────────────────────── POST: Register digital asset
export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = await getAuthAddress(request);
  if (authAddress instanceof NextResponse) return authAddress;

  try {
    const body = await request.json() as Record<string, unknown>;
    const { product_id, file_name, file_url, file_type, file_size_bytes,
            download_limit, expires_hours, license_key_pool } = body;

    if (typeof product_id !== 'number') {
      return NextResponse.json({ error: 'product_id required' }, { status: 400 });
    }
    if (typeof file_name !== 'string' || !file_name.trim()) {
      return NextResponse.json({ error: 'file_name required' }, { status: 400 });
    }
    if (typeof file_url !== 'string' || !file_url.trim()) {
      return NextResponse.json({ error: 'file_url required' }, { status: 400 });
    }

    // Verify product ownership and type
    const productResult = await query(
      "SELECT id FROM merchant_products WHERE id = $1 AND merchant_address = $2 AND product_type = 'digital'",
      [product_id, authAddress]
    );
    if (productResult.rows.length === 0) {
      return NextResponse.json({ error: 'Digital product not found' }, { status: 404 });
    }

    // Validate license keys if provided
    let safeKeyPool: string[] | null = null;
    if (Array.isArray(license_key_pool)) {
      safeKeyPool = (license_key_pool as unknown[])
        .filter((k): k is string => typeof k === 'string')
        .slice(0, 10000)
        .map(k => k.slice(0, 500));
    }

    const result = await query(
      `INSERT INTO merchant_digital_assets
       (product_id, file_name, file_url, file_size_bytes, file_type,
        download_limit, expires_hours, license_key_pool)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        product_id,
        file_name.trim().slice(0, 255),
        file_url.trim().slice(0, 2000),
        typeof file_size_bytes === 'number' ? file_size_bytes : null,
        typeof file_type === 'string' ? file_type.slice(0, 100) : null,
        typeof download_limit === 'number' ? Math.max(1, download_limit) : null,
        typeof expires_hours === 'number' ? Math.max(1, expires_hours) : null,
        safeKeyPool,
      ]
    );

    return NextResponse.json({ asset: result.rows[0] }, { status: 201 });
  } catch (error) {
    logger.error('[Digital POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create digital asset' }, { status: 500 });
  }
}

// ─────────────────────────── PATCH: Fulfill digital delivery (auto or manual)
export async function PATCH(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = await getAuthAddress(request);
  if (authAddress instanceof NextResponse) return authAddress;

  try {
    const body = await request.json() as Record<string, unknown>;
    const { order_id, product_id } = body;

    if (typeof order_id !== 'number' || typeof product_id !== 'number') {
      return NextResponse.json({ error: 'order_id and product_id required' }, { status: 400 });
    }

    // Verify order belongs to this merchant
    const orderResult = await query(
      "SELECT * FROM merchant_orders WHERE id = $1 AND merchant_address = $2 AND payment_status = 'paid'",
      [order_id, authAddress]
    );
    if (orderResult.rows.length === 0) {
      return NextResponse.json({ error: 'Paid order not found' }, { status: 404 });
    }

    // Get asset for product
    const assetResult = await query(
      'SELECT * FROM merchant_digital_assets WHERE product_id = $1 ORDER BY created_at DESC LIMIT 1',
      [product_id]
    );
    if (assetResult.rows.length === 0) {
      return NextResponse.json({ error: 'No digital asset found for product' }, { status: 404 });
    }

    const asset = assetResult.rows[0]!;
    const order = orderResult.rows[0]!;

    // Check if already delivered
    const existingDelivery = await query(
      'SELECT id FROM merchant_digital_deliveries WHERE asset_id = $1 AND order_id = $2',
      [asset.id, order_id]
    );
    if (existingDelivery.rows.length > 0) {
      return NextResponse.json({ error: 'Already delivered' }, { status: 409 });
    }

    // Pop license key from pool if available
    let licenseKey: string | null = null;
    const keyPool = asset.license_key_pool as string[] | null;
    if (keyPool && keyPool.length > 0) {
      licenseKey = keyPool[0]!;
      await query(
        'UPDATE merchant_digital_assets SET license_key_pool = license_key_pool[2:] WHERE id = $1',
        [asset.id]
      );
    }

    const downloadToken = randomBytes(32).toString('hex');
    const expiresAt = asset.expires_hours
      ? new Date(Date.now() + Number(asset.expires_hours) * 3600000)
      : null;

    const result = await query(
      `INSERT INTO merchant_digital_deliveries
       (asset_id, order_id, customer_address, download_token, license_key, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [
        asset.id,
        order_id,
        order.customer_address,
        downloadToken,
        licenseKey,
        expiresAt,
      ]
    );

    return NextResponse.json({
      delivery: result.rows[0],
      download_url: `/api/merchant/digital?token=${downloadToken}`,
    });
  } catch (error) {
    logger.error('[Digital PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to fulfill delivery' }, { status: 500 });
  }
}
