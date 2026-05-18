import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireOwnership, withAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

function normalizeAddress(value: string | null): string | null {
  const address = value?.trim().toLowerCase() || '';
  return ADDRESS_REGEX.test(address) ? address : null;
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

function serializeSupplier(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    supplier_name: String(row.supplier_name ?? ''),
    supplier_address: row.supplier_address ? String(row.supplier_address) : null,
    contact_phone: row.contact_phone ? String(row.contact_phone) : null,
    contact_email: row.contact_email ? String(row.contact_email) : null,
    notes: row.notes ? String(row.notes) : null,
  };
}

function serializePurchaseOrder(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    supplier_name: String(row.supplier_name ?? ''),
    items: parseItems(row.items),
    total: row.total != null ? String(row.total) : null,
    status: String(row.status ?? 'sent'),
    created_at: row.created_at ? String(row.created_at) : new Date().toISOString(),
    expected_delivery: row.expected_delivery ? String(row.expected_delivery) : null,
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
    const suppliers = await query(
      `SELECT id, supplier_name, supplier_address, contact_phone, contact_email, notes
         FROM merchant_suppliers
        WHERE merchant_address = $1
        ORDER BY supplier_name ASC`,
      [merchant],
    );

    const orders = await query(
      `SELECT po.id, po.items, po.total, po.status, po.created_at, po.expected_delivery, s.supplier_name
         FROM purchase_orders po
         JOIN merchant_suppliers s ON s.id = po.supplier_id
        WHERE po.merchant_address = $1
        ORDER BY po.created_at DESC
        LIMIT 50`,
      [merchant],
    );

    return NextResponse.json({
      suppliers: suppliers.rows.map((row) => serializeSupplier(row as Record<string, unknown>)),
      purchaseOrders: orders.rows.map((row) => serializePurchaseOrder(row as Record<string, unknown>)),
    });
  } catch (error) {
    logger.error('[Merchant Suppliers GET] Error:', error);
    return NextResponse.json({ error: 'Failed to load suppliers' }, { status: 500 });
  }
}

async function postHandler(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();
    const merchantAddress = normalizeAddress(typeof body?.merchantAddress === 'string' ? body.merchantAddress : null);
    if (!merchantAddress) {
      return NextResponse.json({ error: 'merchantAddress required' }, { status: 400 });
    }

    const authResult = await requireOwnership(request, merchantAddress);
    if (authResult instanceof NextResponse) return authResult;

    if (body?.createPurchaseOrder) {
      const supplierId = typeof body?.supplierId === 'string' ? body.supplierId.trim() : '';
      const items = Array.isArray(body?.items) ? body.items : [];
      const total = Number(body?.total ?? 0);
      const expectedDelivery = typeof body?.expectedDelivery === 'string' ? body.expectedDelivery : null;

      if (!supplierId || items.length === 0 || !Number.isFinite(total) || total <= 0) {
        return NextResponse.json({ error: 'supplierId, items, and total required' }, { status: 400 });
      }

      const result = await query(
        `INSERT INTO purchase_orders (
           merchant_address, supplier_id, items, total, expected_delivery
         ) VALUES ($1, $2, $3, $4, $5)
         RETURNING id, items, total, status, created_at, expected_delivery`,
        [merchantAddress, supplierId, JSON.stringify(items), total, expectedDelivery],
      );

      return NextResponse.json({
        success: true,
        purchaseOrder: serializePurchaseOrder(result.rows[0] as Record<string, unknown>),
      });
    }

    const supplierName = typeof body?.supplierName === 'string' ? body.supplierName.trim() : '';
    const supplierAddress = normalizeAddress(typeof body?.supplierAddress === 'string' ? body.supplierAddress : null);
    const contactPhone = typeof body?.contactPhone === 'string' ? body.contactPhone.trim() : '';
    const contactEmail = typeof body?.contactEmail === 'string' ? body.contactEmail.trim() : '';
    const notes = typeof body?.notes === 'string' ? body.notes.trim() : '';

    if (!supplierName) {
      return NextResponse.json({ error: 'supplierName required' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO merchant_suppliers (
         merchant_address, supplier_address, supplier_name, contact_phone, contact_email, notes
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, supplier_name, supplier_address, contact_phone, contact_email, notes`,
      [merchantAddress, supplierAddress, supplierName, contactPhone || null, contactEmail || null, notes || null],
    );

    return NextResponse.json({
      success: true,
      supplier: serializeSupplier(result.rows[0] as Record<string, unknown>),
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.toLowerCase().includes('unique')) {
      return NextResponse.json({ error: 'Supplier already exists' }, { status: 409 });
    }

    logger.error('[Merchant Suppliers POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create supplier' }, { status: 500 });
  }
}

async function patchHandler(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();
    const merchantAddress = normalizeAddress(typeof body?.merchantAddress === 'string' ? body.merchantAddress : null);
    const purchaseOrderId = typeof body?.purchaseOrderId === 'string' ? body.purchaseOrderId.trim() : '';
    const status = typeof body?.status === 'string' ? body.status.trim().toLowerCase() : '';

    if (!merchantAddress || !purchaseOrderId || !status) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const authResult = await requireOwnership(request, merchantAddress);
    if (authResult instanceof NextResponse) return authResult;

    await query(
      `UPDATE purchase_orders
          SET status = $3,
              delivered_at = CASE WHEN $3 = 'delivered' THEN NOW() ELSE delivered_at END
        WHERE id = $1 AND merchant_address = $2`,
      [purchaseOrderId, merchantAddress, status],
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[Merchant Suppliers PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update purchase order' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
export const PATCH = withAuth(patchHandler);
