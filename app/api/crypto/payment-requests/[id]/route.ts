import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const resolvedParams = await params;
    const id = resolvedParams?.id;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid id parameter' },
        { status: 400 }
      );
    }

    const result = await query(
      `SELECT * FROM payment_requests WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Payment request not found' }, { status: 404 });
    }

    const requestRow = result.rows[0];
    if (!requestRow) {
      return NextResponse.json({ error: 'Payment request not found' }, { status: 404 });
    }
    const authAddress = authResult.user.address.toLowerCase();
    const ownsRequest =
      requestRow.from_address?.toLowerCase() === authAddress ||
      requestRow.to_address?.toLowerCase() === authAddress;

    if (!ownsRequest) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({ request: requestRow });
  } catch (error) {
    console.error('[Payment Request GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch request' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const resolvedParams = await params;
    const id = resolvedParams?.id;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid id parameter' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status } = body;

    // Validate status against allowed values
    const ALLOWED_STATUSES = ['pending', 'accepted', 'rejected', 'cancelled', 'completed', 'expired'];
    if (!status || typeof status !== 'string' || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Allowed values: ${ALLOWED_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    const ownership = await query(
      `SELECT from_address, to_address FROM payment_requests WHERE id = $1`,
      [id]
    );

    if (ownership.rows.length === 0) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const authAddress = authResult.user.address.toLowerCase();
    const ownershipRow = ownership.rows[0];
    if (!ownershipRow) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    const ownsRequest =
      ownershipRow.from_address?.toLowerCase() === authAddress ||
      ownershipRow.to_address?.toLowerCase() === authAddress;

    if (!ownsRequest) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const result = await query(
      `UPDATE payment_requests
       SET status = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, status]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    return NextResponse.json({ request: result.rows[0] });
  } catch (error) {
    console.error('[Payment Request PUT] Error:', error);
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const resolvedParams = await params;
    const id = resolvedParams?.id;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid id parameter' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status, txHash } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status required' }, { status: 400 });
    }

    const ownership = await query(
      `SELECT from_address, to_address FROM payment_requests WHERE id = $1`,
      [id]
    );

    if (ownership.rows.length === 0) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const authAddress = authResult.user.address.toLowerCase();
    const ownershipRow = ownership.rows[0];
    if (!ownershipRow) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    const ownsRequest =
      ownershipRow.from_address?.toLowerCase() === authAddress ||
      ownershipRow.to_address?.toLowerCase() === authAddress;

    if (!ownsRequest) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
