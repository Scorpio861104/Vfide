import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rateLimit';
import { validatePositiveInteger, validateEnum, createErrorResponse } from '@/lib/inputValidation';

const ALLOWED_STATUSES = ['pending', 'completed', 'rejected', 'cancelled'] as const;

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
    
    // Validate payment request ID
    const validatedId = validatePositiveInteger(id, 'Payment request ID');
    
    // Validate status is one of allowed values
    const validatedStatus = validateEnum(status, 'Status', ALLOWED_STATUSES);
    
    // Validate txHash format if provided
    if (txHash && !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return NextResponse.json({ error: 'Invalid transaction hash format' }, { status: 400 });
    }

    const result = await query(
      `UPDATE payment_requests
       SET status = $2, tx_hash = $3, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [validatedId, validatedStatus, txHash]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, request: result.rows[0] });
  } catch (error) {
    console.error('[Payment Request PATCH] Error:', error);
    return NextResponse.json(
      createErrorResponse(error as Error),
      { status: error instanceof Error && error.message.includes('must be') ? 400 : 500 }
    );
  }
}
