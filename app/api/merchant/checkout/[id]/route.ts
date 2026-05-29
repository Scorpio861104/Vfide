/**
 * /api/merchant/checkout/[id]
 *
 * Public hosted checkout route — no auth required for GET (customer-facing payment page).
 * Looks up an invoice or payment-link by id/slug and returns data for the checkout UI.
 *
 * GET   — fetch invoice or payment-link details
 * POST  — mark as paid (called after on-chain tx confirmed)
 * PATCH — alias for POST, used by the hosted checkout page
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Missing checkout id' }, { status: 400 });

  try {
    // Try by numeric invoice id first
    if (/^\d+$/.test(id)) {
      const res = await query(
        `SELECT *, items::text AS items_raw FROM invoices WHERE id = $1 LIMIT 1`,
        [parseInt(id, 10)]
      );
      const row = res.rows[0];
      if (row) {
        try { (row as Record<string, unknown>).items = JSON.parse((row.items_raw as string) ?? '[]'); } catch { (row as Record<string, unknown>).items = []; }
        delete (row as Record<string, unknown>).items_raw;
        return NextResponse.json({ invoice: row });
      }
    }

    // Try by invoice_number
    {
      const res = await query(
        `SELECT *, items::text AS items_raw FROM invoices WHERE invoice_number = $1 LIMIT 1`,
        [id]
      );
      const row = res.rows[0];
      if (row) {
        try { (row as Record<string, unknown>).items = JSON.parse((row.items_raw as string) ?? '[]'); } catch { (row as Record<string, unknown>).items = []; }
        delete (row as Record<string, unknown>).items_raw;
        return NextResponse.json({ invoice: row });
      }
    }

    // Try payment_links table
    {
      const res = await query(
        `SELECT * FROM payment_links WHERE id::text = $1 OR slug = $1 LIMIT 1`,
        [id]
      ).catch(() => ({ rows: [] as Record<string, unknown>[] }));
      const row = res.rows[0];
      if (row) {
        return NextResponse.json({ payment_link: row });
      }
    }

    return NextResponse.json({ error: 'Checkout not found' }, { status: 404 });
  } catch (err) {
    console.error('[checkout/GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  return _markPaid(req, id);
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  return _markPaid(req, id);
}

async function _markPaid(req: NextRequest, id: string): Promise<NextResponse> {
  if (!id) return NextResponse.json({ error: 'Missing checkout id' }, { status: 400 });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* no body */ }

  const txHash = body.tx_hash as string | undefined;
  const buyerAddress = body.buyer_address as string | undefined;
  const paidAt = (body.paid_at as string | undefined) ?? new Date().toISOString();

  try {
    // Update invoice by numeric id
    if (/^\d+$/.test(id)) {
      const r = await query(
        `UPDATE invoices SET status='paid', paid_at=$1,
         tx_hash=COALESCE($3, tx_hash),
         customer_address=COALESCE($4, customer_address)
         WHERE id=$2 AND status!='paid' RETURNING id`,
        [paidAt, parseInt(id, 10), txHash ?? null, buyerAddress ?? null]
      ).catch(() => ({ rows: [] }));
      if (r.rows.length) return NextResponse.json({ success: true, paid_at: paidAt });
    }

    // By invoice_number
    const r2 = await query(
      `UPDATE invoices SET status='paid', paid_at=$1,
       tx_hash=COALESCE($3, tx_hash)
       WHERE invoice_number=$2 AND status!='paid' RETURNING id`,
      [paidAt, id, txHash ?? null]
    ).catch(() => ({ rows: [] }));
    if (r2.rows.length) return NextResponse.json({ success: true, paid_at: paidAt });

    // Payment link — increment uses
    await query(
      `UPDATE payment_links SET last_used_at=$1, uses_count=COALESCE(uses_count,0)+1
       WHERE id::text=$2 OR slug=$2`,
      [paidAt, id]
    ).catch(() => null);

    return NextResponse.json({ success: true, paid_at: paidAt });
  } catch (err) {
    console.error('[checkout/PATCH]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
