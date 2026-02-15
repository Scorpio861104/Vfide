import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { isAddress } from 'viem';
import { requireAuth } from '@/lib/auth/middleware';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

interface TimeLockRow {
  id: number;
  token: string;
  recipient_address: string;
  amount: string;
  created_at: string;
  unlock_at: string;
  status: string;
}

export async function GET(request: NextRequest) {
  const rateLimit = await withRateLimit(request, 'read');
  if (rateLimit) return rateLimit;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const searchParams = request.nextUrl.searchParams;
    const userAddress = searchParams.get('userAddress');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    if (!userAddress || !isAddress(userAddress)) {
      return NextResponse.json({ error: 'Valid user address required' }, { status: 400 });
    }

    if (authResult.user.address.toLowerCase() !== userAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10), 1), MAX_LIMIT) : DEFAULT_LIMIT;
    const offset = offsetParam ? Math.max(parseInt(offsetParam, 10), 0) : 0;

    const result = await query<TimeLockRow>(
      `SELECT tl.id, tl.token, tl.recipient_address, tl.amount, tl.created_at, tl.unlock_at, tl.status
       FROM time_locks tl
       JOIN users u ON tl.user_id = u.id
       WHERE u.wallet_address = $1
       ORDER BY tl.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userAddress.toLowerCase(), limit, offset]
    );

    return NextResponse.json({
      timeLocks: result.rows.map((row) => ({
        id: row.id,
        token: row.token,
        to: row.recipient_address,
        amount: row.amount,
        createdAt: row.created_at,
        unlockAt: row.unlock_at,
        status: row.status,
      })),
      limit,
      offset,
    });
  } catch (error) {
    console.error('[Time Locks GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch time locks' }, { status: 500 });
  }
}
