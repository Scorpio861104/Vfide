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
import { createPublicClient, decodeEventLog, getAddress, http, parseAbiItem, parseUnits } from 'viem';
import { CONTRACT_ADDRESSES, StablecoinRegistryABI, isConfiguredContractAddress } from '@/lib/contracts';
import { z } from 'zod4';

const TX_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;
const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;
const checkoutActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('view') }),
  z.object({ action: z.literal('pay'), tx_hash: z.string().regex(TX_HASH_REGEX) }),
]);

const PAYMENT_PROCESSED_EVENT = parseAbiItem(
  'event PaymentProcessed(address indexed customer, address indexed merchant, address token, uint256 amount, uint256 fee, string orderId, uint16 customerScore, uint8 channel)'
);
const DEFAULT_MIN_CONFIRMATIONS = 2n;

function getMerchantPortalAddress(): string | null {
  if (isConfiguredContractAddress(CONTRACT_ADDRESSES.MerchantPortal)) {
    return CONTRACT_ADDRESSES.MerchantPortal;
  }
  const value = process.env.MERCHANT_PORTAL_ADDRESS?.trim();
  return value && /^0x[a-fA-F0-9]{40}$/.test(value) ? value : null;
}

function getMinConfirmations(): bigint {
  const configured = process.env.MERCHANT_PAYMENT_MIN_CONFIRMATIONS;
  if (!configured || !/^\d+$/.test(configured)) return DEFAULT_MIN_CONFIRMATIONS;
  const parsed = BigInt(configured);
  return parsed < 1n ? DEFAULT_MIN_CONFIRMATIONS : parsed;
}

function decimalStringToUnits(value: string | number, decimals: number): bigint | null {
  const text = String(value).trim();
  if (!/^[0-9]+(\.[0-9]+)?$/.test(text)) return null;
  const [intPart, fracRaw = ''] = text.split('.');
  const frac = fracRaw.replace(/0+$/, '');
  if (frac.length > decimals) return null;
  try {
    const units = parseUnits((frac ? `${intPart}.${frac}` : intPart) as `${number}`, decimals);
    return units > 0n ? units : null;
  } catch {
    return null;
  }
}

async function isAcceptedSettlementToken(
  client: ReturnType<typeof createPublicClient>,
  token: string,
): Promise<boolean> {
  const normalized = getAddress(token);
  if (
    isConfiguredContractAddress(CONTRACT_ADDRESSES.VFIDEToken) &&
    getAddress(CONTRACT_ADDRESSES.VFIDEToken) === normalized
  ) {
    return true;
  }
  if (!isConfiguredContractAddress(CONTRACT_ADDRESSES.StablecoinRegistry)) return false;
  try {
    const allowed = await client.readContract({
      address: CONTRACT_ADDRESSES.StablecoinRegistry,
      abi: StablecoinRegistryABI,
      functionName: 'isAllowed',
      args: [normalized],
    });
    return Boolean(allowed);
  } catch {
    return false;
  }
}

type InvoiceForVerify = {
  id: number | string;
  merchant_address: string;
  token: string;
  total: string;
  customer_address: string | null;
  status: string;
};

async function verifyInvoicePaymentOnChain(
  invoice: InvoiceForVerify,
  txHash: string,
): Promise<
  | { ok: true }
  | { ok: false; status: 503 | 422 | 400; error: string }
> {
  const rpcUrl =
    process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC ||
    process.env.NEXT_PUBLIC_RPC_URL ||
    process.env.RPC_URL;
  const portal = getMerchantPortalAddress();
  if (!rpcUrl || !portal) {
    return { ok: false, status: 503, error: 'Payment verification temporarily unavailable — missing chain configuration' };
  }

  let expectedMerchant: `0x${string}`;
  let expectedToken: `0x${string}`;
  let expectedPortal: `0x${string}`;
  let expectedCustomer: `0x${string}` | null = null;
  try {
    expectedMerchant = getAddress(invoice.merchant_address);
    expectedToken = getAddress(invoice.token);
    expectedPortal = getAddress(portal);
    if (invoice.customer_address && /^0x[a-fA-F0-9]{40}$/.test(invoice.customer_address)) {
      expectedCustomer = getAddress(invoice.customer_address);
    }
  } catch {
    return { ok: false, status: 422, error: 'Invoice has an invalid address configuration' };
  }

  const client = createPublicClient({ transport: http(rpcUrl) });

  let expectedAmount: bigint | null = null;
  try {
    const decimals = await client.readContract({
      address: expectedToken,
      abi: [parseAbiItem('function decimals() view returns (uint8)')],
      functionName: 'decimals',
    });
    const num = Number(decimals);
    if (!Number.isInteger(num) || num < 0 || num > 30) {
      return { ok: false, status: 422, error: 'Could not read token decimals' };
    }
    expectedAmount = decimalStringToUnits(invoice.total, num);
  } catch {
    return { ok: false, status: 422, error: 'Could not read token decimals — check token address and RPC connectivity' };
  }
  if (expectedAmount === null) {
    return { ok: false, status: 422, error: 'Invoice amount is not representable in the token unit' };
  }

  try {
    const receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` });
    if (!receipt || receipt.status !== 'success') {
      return { ok: false, status: 400, error: 'Transaction not confirmed on-chain' };
    }
    if (!receipt.to || getAddress(receipt.to) !== expectedPortal) {
      return { ok: false, status: 400, error: 'Transaction target does not match the MerchantPortal contract' };
    }

    const currentBlock = await client.getBlockNumber();
    if (currentBlock - receipt.blockNumber + 1n < getMinConfirmations()) {
      return { ok: false, status: 400, error: 'Transaction does not have enough confirmations yet' };
    }

    for (const log of receipt.logs) {
      if (getAddress(log.address) !== expectedPortal) continue;
      try {
        const decoded = decodeEventLog({ abi: [PAYMENT_PROCESSED_EVENT], data: log.data, topics: log.topics });
        if (!decoded || decoded.eventName !== 'PaymentProcessed') continue;
        const args = decoded.args as unknown as {
          customer: string; merchant: string; token: string; amount: bigint;
        };
        const eventToken = getAddress(args.token);
        if (eventToken !== expectedToken) continue;
        if (getAddress(args.merchant) !== expectedMerchant) continue;
        if (args.amount !== expectedAmount) continue;
        if (expectedCustomer && getAddress(args.customer) !== expectedCustomer) continue;
        if (!(await isAcceptedSettlementToken(client, eventToken))) {
          return { ok: false, status: 422, error: 'Token is not in the accepted settlement list' };
        }
        return { ok: true };
      } catch {
        continue;
      }
    }

    return { ok: false, status: 400, error: 'Transaction does not contain a payment matching this invoice' };
  } catch {
    return { ok: false, status: 400, error: 'Transaction not found or not yet mined' };
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
      `SELECT i.id, i.invoice_number, i.merchant_address, mp.display_name AS merchant_name,
              i.customer_address, i.customer_name,
              status, token, subtotal, tax_rate, tax_amount, total, currency_display,
              memo, due_date, paid_at, tx_hash, created_at
       FROM merchant_invoices i
       LEFT JOIN merchant_profiles mp ON mp.merchant_address = i.merchant_address
       WHERE i.payment_link_id = $1`,
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
      `SELECT id, merchant_address, token, total, customer_address, status
       FROM merchant_invoices
       WHERE payment_link_id = $1
       LIMIT 1`,
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
      const txHashLower = txHash.toLowerCase();

      // Anti-replay: a settlement tx must bind to exactly one invoice.
      let replay: { rows: unknown[] } = { rows: [] };
      try {
        replay = await query(
          `SELECT 1 FROM merchant_invoices WHERE LOWER(tx_hash) = $1 AND id != $2 LIMIT 1`,
          [txHashLower, invoice.id]
        ) as { rows: unknown[] };
      } catch {
        return NextResponse.json(
          { error: 'Payment verification temporarily unavailable — could not validate transaction uniqueness' },
          { status: 503 }
        );
      }
      if (replay.rows.length > 0) {
        return NextResponse.json({ error: 'Transaction has already been used for another invoice' }, { status: 409 });
      }

      const verification = await verifyInvoicePaymentOnChain(invoice as InvoiceForVerify, txHash);
      if (!verification.ok) {
        return NextResponse.json({ error: verification.error }, { status: verification.status });
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
