import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { isAddress } from 'viem';
import { requireAuth } from '@/lib/auth/middleware';

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

    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    // Verify user is requesting their own balance
    if (authResult.user.address.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
