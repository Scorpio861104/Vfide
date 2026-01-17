import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { validateAddress } from '@/lib/validation';
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rateLimit';
import { apiLogger } from '@/lib/logger.service';

export async function GET(request: NextRequest, { params }: { params: Promise<{ address: string }> }) {
  // Rate limiting
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(clientId, { maxRequests: 60, windowMs: 60000 });
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const { address } = await params;
    
    // Validate address
    const addressValidation = validateAddress(address);
    if (!addressValidation.valid) {
      return NextResponse.json(
        { error: `Invalid address: ${addressValidation.error}` },
        { status: 400 }
      );
    }

    const result = await query(
      `SELECT tb.* FROM token_balances tb
       JOIN users u ON tb.user_id = u.id
       WHERE u.wallet_address = $1`,
      [address.toLowerCase()]
    );

    return NextResponse.json({ balances: result.rows });
  } catch (error) {
    apiLogger.error('Balance fetch failed', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return NextResponse.json({ error: 'Failed to fetch balances' }, { status: 500 });
  }
}
