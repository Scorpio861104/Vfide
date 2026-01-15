import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rateLimit';
import { validateAddress, createErrorResponse } from '@/lib/inputValidation';

export async function GET(request: NextRequest, { params }: { params: Promise<{ address: string }> }) {
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(clientId, { maxRequests: 50, windowMs: 60000 });

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const { address } = await params;
    
    // Validate address format
    const validatedAddress = validateAddress(address);

    const result = await query(
      `SELECT tb.* FROM token_balances tb
       JOIN users u ON tb.user_id = u.id
       WHERE u.wallet_address = $1`,
      [validatedAddress]
    );

    return NextResponse.json({ balances: result.rows });
  } catch (error) {
    console.error('[Balance API] Error:', error);
    return NextResponse.json(
      createErrorResponse(error as Error),
      { status: error instanceof Error && error.message.includes('Invalid') ? 400 : 500 }
    );
  }
}
