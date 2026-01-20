import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { isAddress } from 'viem';

export async function GET(request: NextRequest, { params }: { params: Promise<{ address: string }> }) {
  // Rate limiting: 100 requests per minute for balance lookups
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const resolvedParams = await params;
    const address = resolvedParams?.address;

    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        { error: 'Invalid address parameter' },
        { status: 400 }
      );
    }

    // Validate address format
    if (!isAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid Ethereum address format' },
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
    console.error('[Balance API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch balances';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
