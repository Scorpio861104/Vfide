import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, validateRequest } from '@/lib/api-validation';
import { requireAuth } from '@/lib/auth-middleware';
import { apiLogger } from '@/lib/logger.service';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Rate limiting
  const clientId = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimit = checkRateLimit(`payment-request-update:${clientId}`, { maxRequests: 30, windowMs: 60000 });
  if (!rateLimit.success) {
    return rateLimit.errorResponse;
  }

  // Authentication required
  const auth = await requireAuth(request);
  if (!auth.authenticated) {
    return auth.errorResponse;
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { status, txHash } = body;

    // Validate required fields
    const validation = validateRequest(body, {
      status: { required: true, type: 'string' }
    });
    if (!validation.valid) {
      return validation.errorResponse;
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
    apiLogger.error('[Payment Request PATCH] Error', { error });
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }
}
