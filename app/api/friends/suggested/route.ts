import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { isAddress } from 'viem';
import { requireAuth } from '@/lib/auth/middleware';

const MAX_LIMIT = 20;
const DEFAULT_LIMIT = 6;

interface SuggestedUserRow {
  wallet_address: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean | null;
}

export async function GET(request: NextRequest) {
  const rateLimit = await withRateLimit(request, 'read');
  if (rateLimit) return rateLimit;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const searchParams = request.nextUrl.searchParams;
    const userAddress = searchParams.get('userAddress') ?? authResult.user.address;
    const limitParam = searchParams.get('limit');

    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10), 1), MAX_LIMIT) : DEFAULT_LIMIT;

    if (!userAddress || !isAddress(userAddress)) {
      return NextResponse.json({ users: [] });
    }

    if (authResult.user.address.toLowerCase() !== userAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const result = await query<SuggestedUserRow>(
      `SELECT u.wallet_address, u.username, u.display_name, u.avatar_url, u.bio, u.is_verified
       FROM users u
       WHERE u.wallet_address <> $1
         AND NOT EXISTS (
           SELECT 1
           FROM friendships f
           JOIN users u1 ON f.user_id = u1.id
           JOIN users u2 ON f.friend_id = u2.id
           WHERE (u1.wallet_address = $1 AND u2.wallet_address = u.wallet_address)
              OR (u2.wallet_address = $1 AND u1.wallet_address = u.wallet_address)
         )
       ORDER BY u.proof_score DESC NULLS LAST
       LIMIT $2`,
      [userAddress.toLowerCase(), limit]
    );

    return NextResponse.json({
      users: result.rows.map((row) => ({
        address: row.wallet_address,
        name: row.display_name ?? row.username ?? row.wallet_address,
        avatar: row.avatar_url ?? '👤',
        bio: row.bio ?? 'VFIDE community member',
        followers: 0,
        mutualFriends: 0,
        verified: Boolean(row.is_verified),
      })),
    });
  } catch (error) {
    console.error('[Friends Suggested GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
  }
}
