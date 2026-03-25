/**
 * Hosted Checkout API
 * 
 * GET   — Fetch invoice by payment link ID (public, no auth required to view)
 * PATCH — Update invoice status (view, pay)
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { dispatchWebhook } from '@/lib/webhooks/merchantWebhookDispatcher';
import { logger } from '@/lib/logger';

const TX_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;

// ─────────────────────────── GET: Public invoice view
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const { id: paymentLinkId } = await params;

  if (!paymentLinkId || paymentLinkId.length > 40) {
    return NextResponse.json({ error: 'Invalid payment link' }, { status: 400 });
  }

  try {
    const invoiceResult = await query(
      `SELECT id, invoice_number, merchant_address, customer_address, customer_name,
              status, token, subtotal, tax_rate, tax_amount, total, currency_display,
              memo, due_date, paid_at, tx_hash, created_at
       FROM merchant_invoices
       WHERE payment_link_id = $1`,
      [paymentLinkId]
    );

    if (invoiceResult.rows.length === 0) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const invoice = invoiceResult.rows[0]!;

    // Fetch line items
    const itemsResult = await query(
      'SELECT description, quantity, unit_price, amount FROM merchant_invoice_items WHERE invoice_id = $1 ORDER BY sort_order',
      [invoice.id]
    );

    // Don't expose internal ID in public response
    const { id: _id, ...publicInvoice } = invoice as Record<string, unknown>;

    return NextResponse.json({
      invoice: { ...publicInvoice, items: itemsResult.rows },
    });
  } catch (error) {
    logger.error('[Checkout GET] Error:', error);
    return NextResponse.json({ error: 'Failed to load checkout' }, { status: 500 });
  }
}

// ─────────────────────────── PATCH: Status updates
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const { id: paymentLinkId } = await params;

  if (!paymentLinkId || paymentLinkId.length > 40) {
    return NextResponse.json({ error: 'Invalid payment link' }, { status: 400 });
  }

  try {
    const body = await request.json() as Record<string, unknown>;
    const { action, tx_hash } = body;

    // Fetch invoice
    const invoiceResult = await query(
      'SELECT * FROM merchant_invoices WHERE payment_link_id = $1',
      [paymentLinkId]
    );

    if (invoiceResult.rows.length === 0) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const invoice = invoiceResult.rows[0]!;

    if (action === 'view') {
      // Mark as viewed (only if currently 'sent')
      if (invoice.status === 'sent') {
        await query(
          "UPDATE merchant_invoices SET status = 'viewed', updated_at = NOW() WHERE id = $1",
          [invoice.id]
        );
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'pay') {
      // Mark as pending confirmation (requires valid tx_hash for on-chain verification)
      if (invoice.status === 'paid') {
        return NextResponse.json({ error: 'Already paid' }, { status: 400 });
      }
      if (invoice.status === 'cancelled') {
        return NextResponse.json({ error: 'Invoice cancelled' }, { status: 400 });
      }

      // Require a valid transaction hash — payment confirmation should be verified on-chain
      if (typeof tx_hash !== 'string' || !TX_HASH_REGEX.test(tx_hash)) {
        return NextResponse.json({ error: 'Valid tx_hash required' }, { status: 400 });
      }

      // Mark as pending_confirmation, not paid — merchant or backend job verifies on-chain
      await query(
        `UPDATE merchant_invoices
         SET status = 'pending_confirmation', tx_hash = $1, updated_at = NOW()
         WHERE id = $2 AND status NOT IN ('paid', 'cancelled')`,
        [tx_hash, invoice.id]
      );

      // Dispatch webhook
      dispatchWebhook(
        invoice.merchant_address as string,
        'payment.completed',
        {
          invoice_number: invoice.invoice_number,
          total: invoice.total,
          currency: invoice.currency_display,
          tx_hash: tx_hash,
          customer_address: invoice.customer_address,
        }
      );

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    logger.error('[Checkout PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update checkout' }, { status: 500 });
  }
}
