/**
 * Merchant Invoice API
 * 
 * GET    — List invoices for authenticated merchant
 * POST   — Create a new invoice with line items
 * PATCH  — Update invoice status (send, cancel, mark paid)
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { query, getClient } from '@/lib/db';
import { withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { dispatchWebhook } from '@/lib/webhooks/merchantWebhookDispatcher';
import { logger } from '@/lib/logger';
import { z } from 'zod4';

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;
const VALID_STATUSES = ['draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled', 'refunded'] as const;

const invoiceItemSchema = z.object({
  description: z.string().trim().min(1).max(500),
  quantity: z.coerce.number().positive(),
  unit_price: z.coerce.number().positive(),
});

const createInvoiceSchema = z.object({
  customer_address: z.string().trim().toLowerCase().regex(ADDRESS_LIKE_REGEX).optional(),
  customer_email: z.string().email().max(255).optional(),
  customer_name: z.string().max(200).optional(),
  token: z.string().regex(ADDRESS_LIKE_REGEX),
  items: z.array(invoiceItemSchema).min(1).max(50),
  tax_rate: z.coerce.number().min(0).max(100).optional(),
  memo: z.string().max(2000).optional(),
  due_date: z.string().optional(),
  currency_display: z.string().max(10).optional(),
  send_immediately: z.boolean().optional(),
});

const updateInvoiceSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(VALID_STATUSES),
  tx_hash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
});

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
}

function generateInvoiceNumber(): string {
  const date = new Date();
  const prefix = `INV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const suffix = randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${suffix}`;
}

function generatePaymentLinkId(): string {
  return randomBytes(16).toString('hex');
}

function getAuthAddress(user: JWTPayload): string | null {
  const address = typeof user.address === 'string'
    ? user.address.trim().toLowerCase()
    : '';
  if (!address || !ADDRESS_LIKE_REGEX.test(address)) {
    return null;
  }
  return address;
}

// ─────────────────────────── GET: List invoices
async function getHandler(request: NextRequest, user: JWTPayload) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = getAuthAddress(user);
  if (!authAddress) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);
    const offset = Math.max(Number(searchParams.get('offset')) || 0, 0);

    let sql = `SELECT i.*,
              COALESCE(
                (SELECT json_agg(sub ORDER BY sub.sort_order)
                 FROM (
                   SELECT ii.* FROM merchant_invoice_items ii
                   WHERE ii.invoice_id = i.id ORDER BY ii.sort_order
                 ) sub),
                '[]'::json
              ) AS items
       FROM merchant_invoices i WHERE i.merchant_address = $1`;
    const params: (string | number | boolean | null)[] = [authAddress];

    if (status && VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
      sql += ` AND i.status = $2`;
      params.push(status);
    }

    sql += ` ORDER BY i.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const invoicesResult = await query(sql, params);

    // Get summary counts
    const countsResult = await query(
      `SELECT status, COUNT(*) as count, COALESCE(SUM(total), 0) as total_value
       FROM merchant_invoices WHERE merchant_address = $1
       GROUP BY status`,
      [authAddress]
    );

    return NextResponse.json({
      invoices: invoicesResult.rows,
      summary: countsResult.rows,
      pagination: { limit, offset },
    });
  } catch (error) {
    logger.error('[Invoices GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

// ─────────────────────────── POST: Create invoice
async function postHandler(request: NextRequest, user: JWTPayload) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = getAuthAddress(user);
  if (!authAddress) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const parsedBody = createInvoiceSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const body = parsedBody.data;
    const {
      customer_address,
      customer_email,
      customer_name,
      token,
      items,
      tax_rate,
      memo,
      due_date,
      currency_display,
      send_immediately,
    } = body;

    const validatedItems: InvoiceItem[] = [];
    for (const item of items) {
      const qty = Number(item.quantity) || 1;
      const price = Number(item.unit_price);
      validatedItems.push({
        description: item.description,
        quantity: qty,
        unit_price: price,
      });
    }

    // Calculate totals
    const subtotal = validatedItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const taxRateNum = tax_rate ?? 0;
    const taxAmount = subtotal * (taxRateNum / 100);
    const total = subtotal + taxAmount;

    const invoiceNumber = generateInvoiceNumber();
    const paymentLinkId = generatePaymentLinkId();
    const status = send_immediately ? 'sent' : 'draft';

    // Validate due date
    let dueDateValue: Date | null = null;
    if (due_date) {
      dueDateValue = new Date(due_date);
      if (isNaN(dueDateValue.getTime())) {
        return NextResponse.json({ error: 'Invalid due date' }, { status: 400 });
      }
    }

    // Insert invoice + line items in a transaction
    const client = await getClient();
    let invoice: Record<string, unknown>;
    let itemsRows: Record<string, unknown>[];
    try {
      await client.query('BEGIN');

      const invoiceResult = await client.query(
        `INSERT INTO merchant_invoices
         (invoice_number, merchant_address, customer_address, customer_email, customer_name,
          status, token, subtotal, tax_rate, tax_amount, total, currency_display, memo, due_date, payment_link_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING *`,
        [
          invoiceNumber,
          authAddress,
          customer_address ?? null,
          customer_email ?? null,
          customer_name ?? null,
          status,
          token,
          subtotal,
          taxRateNum,
          taxAmount,
          total,
          currency_display ?? 'VFIDE',
          memo ?? null,
          dueDateValue,
          paymentLinkId,
        ]
      );

      invoice = invoiceResult.rows[0]!;

      // Insert line items
      for (let i = 0; i < validatedItems.length; i++) {
        const item = validatedItems[i]!;
        await client.query(
          `INSERT INTO merchant_invoice_items
           (invoice_id, description, quantity, unit_price, amount, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [invoice.id, item.description, item.quantity, item.unit_price, item.quantity * item.unit_price, i]
        );
      }

      // Fetch items back
      const itemsResult = await client.query(
        'SELECT * FROM merchant_invoice_items WHERE invoice_id = $1 ORDER BY sort_order',
        [invoice.id]
      );
      itemsRows = itemsResult.rows;

      await client.query('COMMIT');
    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }

    // Dispatch webhook (outside transaction)
    dispatchWebhook(authAddress, 'invoice.created', {
      invoice_number: invoiceNumber,
      total,
      currency: currency_display,
      customer_address,
      payment_link: `/checkout/${paymentLinkId}`,
    });

    return NextResponse.json({
      invoice: { ...invoice, items: itemsRows },
      payment_url: `/checkout/${paymentLinkId}`,
    }, { status: 201 });
  } catch (error) {
    logger.error('[Invoices POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
  }
}

// ─────────────────────────── PATCH: Update invoice status
async function patchHandler(request: NextRequest, user: JWTPayload) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = getAuthAddress(user);
  if (!authAddress) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const parsedBody = updateInvoiceSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const body = parsedBody.data;
    const { id, status, tx_hash } = body;

    // Verify ownership
    const existing = await query(
      'SELECT * FROM merchant_invoices WHERE id = $1 AND merchant_address = $2',
      [id, authAddress]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const invoice = existing.rows[0]!;

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      draft: ['sent', 'cancelled'],
      sent: ['viewed', 'paid', 'overdue', 'cancelled'],
      viewed: ['paid', 'overdue', 'cancelled'],
      overdue: ['paid', 'cancelled'],
      paid: ['refunded'],
    };

    const allowed = validTransitions[invoice.status as string];
    if (!allowed || !allowed.includes(status)) {
      return NextResponse.json({
        error: `Cannot transition from '${invoice.status}' to '${status}'`,
      }, { status: 400 });
    }

    const updates: string[] = ['status = $1', 'updated_at = NOW()'];
    const params: (string | number | boolean | null)[] = [status];

    if (status === 'paid') {
      updates.push(`paid_at = NOW()`);
      if (typeof tx_hash === 'string' && /^0x[a-fA-F0-9]{64}$/.test(tx_hash)) {
        updates.push(`tx_hash = $${params.length + 1}`);
        params.push(tx_hash);
      }
    }

    params.push(id);
    const result = await query(
      `UPDATE merchant_invoices SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );

    // Dispatch webhook for status changes
    if (status === 'paid') {
      dispatchWebhook(authAddress, 'invoice.paid', {
        invoice_number: invoice.invoice_number,
        total: invoice.total,
        tx_hash,
      });
    }

    return NextResponse.json({ invoice: result.rows[0] });
  } catch (error) {
    logger.error('[Invoices PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
export const PATCH = withAuth(patchHandler);
