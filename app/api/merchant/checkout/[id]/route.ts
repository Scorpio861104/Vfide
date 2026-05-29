/**
 * /api/merchant/checkout/[id]
 *
 * Public hosted checkout route.
 *
 * GET  — fetch invoice details + merchant identity (joined from merchant_profiles)
 *         id field is excluded from the public response.
 *
 * PATCH action='pay' — submit payment intent:
 *   1. Rate-limit check
 *   2. Fetch invoice (reject if not found)
 *   3. Reject with 409 if already pending_confirmation
 *   4. Verify tx_hash on-chain via viem (503 if no RPC, 400 if unconfirmed)
 *   5. Move invoice to pending_confirmation (only from sent/viewed) — 409 on TOCTOU
 *
 * POST — legacy alias for PATCH
 */
import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET ────────────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Missing checkout id' }, { status: 400 });

  try {
    // Try invoice by invoice_number (payment link slugs are non-numeric strings)
    const res = await query(
      `SELECT
         i.invoice_number, i.merchant_address, i.customer_address, i.customer_name,
         i.status, i.token, i.subtotal, i.tax_rate, i.tax_amount, i.total,
         i.currency_display, i.memo, i.due_date, i.paid_at, i.tx_hash, i.created_at,
         i.items,
         mp.display_name AS merchant_name
       FROM invoices i
       LEFT JOIN merchant_profiles mp ON mp.merchant_address = i.merchant_address
       WHERE i.invoice_number = $1
       LIMIT 1`,
      [id]
    );
    const row = res.rows[0];
    if (row) {
      // Parse items JSON if stored as string
      if (typeof row.items === 'string') {
        try { (row as Record<string, unknown>).items = JSON.parse(row.items as string); } catch { (row as Record<string, unknown>).items = []; }
      }
      // Strip internal numeric `id` — public checkout response must not expose DB row ids
      const { id: _dbId, ...publicInvoice } = row as Record<string, unknown>;
      void _dbId;
      return NextResponse.json({ invoice: publicInvoice });
    }

    // Try payment_links table
    const plRes = await query(
      `SELECT * FROM payment_links WHERE id::text = $1 OR slug = $1 LIMIT 1`,
      [id]
    ).catch(() => ({ rows: [] as Record<string, unknown>[] }));
    const pl = plRes.rows[0];
    if (pl) return NextResponse.json({ payment_link: pl });

    return NextResponse.json({ error: 'Checkout not found' }, { status: 404 });
  } catch (err) {
    console.error('[checkout/GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function verifySubmittedTransaction(txHash: string): Promise<
  | { ok: true }
  | { ok: false; status: 503; error: string }
  | { ok: false; status: 400; error: string }
> {
  const rpcUrl =
    process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC ||
    process.env.NEXT_PUBLIC_RPC_URL ||
    process.env.RPC_URL;

  if (!rpcUrl) {
    return { ok: false, status: 503, error: 'Transaction verification temporarily unavailable — no RPC configured' };
  }

  try {
    const client = createPublicClient({ transport: http(rpcUrl) });
    const receipt = await client.getTransactionReceipt({
      hash: txHash as `0x${string}`,
    });
    if (!receipt || receipt.status !== 'success') {
      return { ok: false, status: 400, error: 'Transaction not confirmed on-chain' };
    }
    return { ok: true };
  } catch {
    return { ok: false, status: 400, error: 'Transaction not confirmed on-chain' };
  }
}

// ─── PATCH ──────────────────────────────────────────────────────────────────

async function handlePay(req: NextRequest, id: string, body: Record<string, unknown>): Promise<NextResponse> {
  // 1. Rate limit
  const limited = await withRateLimit(req, 'write');
  if (limited) return limited;

  const txHash = body.tx_hash as string | undefined;
  if (!txHash) {
    return NextResponse.json({ error: 'tx_hash is required' }, { status: 400 });
  }

  // 2. Fetch invoice
  const fetchRes = await query(
    `SELECT id, status, customer_address FROM invoices WHERE invoice_number = $1 LIMIT 1`,
    [id]
  );
  const invoice = fetchRes.rows[0];
  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  // 3. Reject if already pending_confirmation
  if (invoice.status === 'pending_confirmation') {
    return NextResponse.json({ error: 'Invoice is pending confirmation' }, { status: 409 });
  }

  // 4. Verify tx on-chain
  const verification = await verifySubmittedTransaction(txHash);
  if (!verification.ok) {
    return NextResponse.json({ error: verification.error }, { status: verification.status });
  }

  // 5. Move to pending_confirmation — only from sent/viewed (TOCTOU guard)
  const updateRes = await query(
    `UPDATE invoices
     SET status = 'pending_confirmation', tx_hash = $1, pending_confirmation_at = NOW()
     WHERE id = $2 AND status IN ('sent', 'viewed')
     RETURNING id`,
    [txHash, invoice.id]
  );
  if (!updateRes.rowCount && !updateRes.rows.length) {
    return NextResponse.json(
      { error: 'Invoice no longer allows payment update' },
      { status: 409 }
    );
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Missing checkout id' }, { status: 400 });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* no body */ }

  const action = body.action as string | undefined;

  if (!action || action === 'pay') {
    return handlePay(req, id, body);
  }

  // Legacy: action='mark_paid' — direct paid update (no on-chain check)
  const paidAt = (body.paid_at as string | undefined) ?? new Date().toISOString();
  const txHashLegacy = body.tx_hash as string | undefined;

  await query(
    `UPDATE invoices SET status='paid', paid_at=$1,
     tx_hash=COALESCE($3, tx_hash)
     WHERE invoice_number=$2 AND status!='paid'`,
    [paidAt, id, txHashLegacy ?? null]
  ).catch(() => null);

  await query(
    `UPDATE payment_links SET last_used_at=$1, uses_count=COALESCE(uses_count,0)+1
     WHERE id::text=$2 OR slug=$2`,
    [paidAt, id]
  ).catch(() => null);

  return NextResponse.json({ success: true, paid_at: paidAt });
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  return PATCH(req, ctx);
}
