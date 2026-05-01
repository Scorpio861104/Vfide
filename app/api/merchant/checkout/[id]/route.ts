import type { JWTPayload } from '@/lib/auth/jwt';
/**
 * Hosted Checkout API
 * 
 * GET   — Fetch invoice by payment link ID (public, no auth required to view)
 * PATCH — Update invoice status (view, pay)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';

import { logger } from '@/lib/logger';
import { createPublicClient, http } from 'viem';
import type { Hash } from 'viem';
import { z } from 'zod4';

const TX_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;
const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;
const checkoutActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('view') }),
  z.object({ action: z.literal('pay'), tx_hash: z.string().regex(TX_HASH_REGEX) }),
]);

function getCheckoutRpcUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || process.env.NEXT_PUBLIC_RPC_URL || process.env.RPC_URL;
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function verifySubmittedTransaction(hash: string): Promise<{ verified: boolean; confirmed: boolean }> {
  const rpcUrl = getCheckoutRpcUrl();
  if (!rpcUrl) return { verified: false, confirmed: false };

  try {
    const client = createPublicClient({ transport: http(rpcUrl) });
    const receipt = await client.getTransactionReceipt({ hash: hash as Hash });
    return {
      verified: true,
      confirmed: receipt.status === 'success',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    if (message.includes('not found') || message.includes('unknown') || message.includes('missing')) {
      return { verified: true, confirmed: false };
    }

    logger.warn('[Checkout PATCH] Transaction verification RPC failure', error);
    return { verified: false, confirmed: false };
  }
}

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
export const PATCH = withAuth(async (request: NextRequest, user: JWTPayload, context?: { params: Promise<Record<string, string>> | Record<string, string> }) => {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const { id: paymentLinkId } = await context!.params;

  if (!paymentLinkId || paymentLinkId.length > 40) {
    return NextResponse.json({ error: 'Invalid payment link' }, { status: 400 });
  }

  try {
    const parsedBody = checkoutActionSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { action } = parsedBody.data;

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
      // N-H7 FIX: Only an authenticated, invoice-bound customer can move status to
      // pending_confirmation. This prevents arbitrary public-link callers from forcing
      // merchant invoices into pending states.
      const authAddress = typeof user?.address === 'string'
        ? user.address.trim().toLowerCase()
        : '';
      if (!authAddress || !ADDRESS_LIKE_REGEX.test(authAddress)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const invoiceCustomer = typeof invoice.customer_address === 'string'
        ? invoice.customer_address.trim().toLowerCase()
        : '';
      if (!invoiceCustomer || !ADDRESS_LIKE_REGEX.test(invoiceCustomer)) {
        return NextResponse.json(
          { error: 'Invoice is not bound to a verified customer address' },
          { status: 403 }
        );
      }
      if (invoiceCustomer !== authAddress) {
        return NextResponse.json(
          { error: 'Only the bound customer can submit payment confirmation' },
          { status: 403 }
        );
      }

      // Mark as pending confirmation (requires valid tx_hash for on-chain verification)
      if (invoice.status === 'paid') {
        return NextResponse.json({ error: 'Already paid' }, { status: 400 });
      }
      if (invoice.status === 'cancelled') {
        return NextResponse.json({ error: 'Invoice cancelled' }, { status: 400 });
      }
      if (invoice.status === 'pending_confirmation') {
        return NextResponse.json({ error: 'Payment already pending confirmation' }, { status: 409 });
      }

      // Require a valid transaction hash — payment confirmation should be verified on-chain
      const txHash = parsedBody.data.tx_hash;

      const txVerification = await verifySubmittedTransaction(txHash);
      if (!txVerification.verified) {
        return NextResponse.json({ error: 'Payment verification temporarily unavailable' }, { status: 503 });
      }
      if (!txVerification.confirmed) {
        return NextResponse.json({ error: 'Transaction hash not confirmed on-chain' }, { status: 400 });
      }

      // Mark as pending_confirmation, not paid — merchant or backend job verifies on-chain.
      // Restrict transition to sent/viewed to prevent tx_hash mutation once payment is pending.
      const updateResult = await query(
        `UPDATE merchant_invoices
         SET status = 'pending_confirmation', tx_hash = $1, updated_at = NOW()
         WHERE id = $2 AND status IN ('sent', 'viewed')`,
        [txHash, invoice.id]
      );

      if ((updateResult.rowCount ?? 0) === 0) {
        return NextResponse.json({ error: 'Invoice status no longer allows payment update' }, { status: 409 });
      }

      // Do not emit payment.completed here.
      // Confirmation flow dispatches webhooks after on-chain event verification.

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    logger.error('[Checkout PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update checkout' }, { status: 500 });
  }
});
