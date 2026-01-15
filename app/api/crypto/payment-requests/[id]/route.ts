import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rateLimit';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Rate limiting: 20 requests per minute
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(clientId, { maxRequests: 20, windowMs: 60000 });
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { status, txHash } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status required' }, { status: 400 });
    }

    const result = await query(
      `UPDATE payment_requests
       SET status = $2, tx_hash = $3, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, status, txHash]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, request: result.rows[0] });
  } catch (error) {
    console.error('[Payment Request PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }
}
