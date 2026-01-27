import { query } from '@/lib/db';
import { log } from '@/lib/logging';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  // Rate limiting: 100 requests per minute
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  // Require authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  if (!authResult.user?.address) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const resolvedParams = await params;
    const userIdParam = resolvedParams?.userId;

    if (!userIdParam || typeof userIdParam !== 'string') {
      return NextResponse.json(
        { error: 'Invalid userId parameter' },
        { status: 400 }
      );
    }

    // Verify authenticated user matches requested userId
    const userResult = await query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [authResult.user.address.toLowerCase()]
    );

    const userId = userResult.rows[0]?.id;
    if (userResult.rows.length === 0 || !userId || userId.toString() !== userIdParam) {
      return NextResponse.json(
        { error: 'You can only view your own transactions' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limitParam = parseInt(searchParams.get('limit') || '50', 10);
    const offsetParam = parseInt(searchParams.get('offset') || '0', 10);

    // Validate parsed numbers
    if (isNaN(limitParam) || isNaN(offsetParam) || !isFinite(limitParam) || !isFinite(offsetParam)) {
      return NextResponse.json(
        { error: 'Invalid limit or offset parameter' },
        { status: 400 }
      );
    }

    const limit = Math.min(limitParam, 100); // Max 100
    const offset = Math.max(offsetParam, 0);

    const result = await query(
      `SELECT t.* FROM transactions t
       WHERE t.user_id = $1
       ORDER BY t.timestamp DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return NextResponse.json({ transactions: result.rows, total: result.rows.length });
  } catch (error) {
    log.error('[Transactions API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch transactions';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
