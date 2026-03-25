import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{3,64}$/;

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase();
}

function isAddressLike(value: string): boolean {
  return ADDRESS_PATTERN.test(value);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  // Rate limiting
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  // Require authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const authenticatedAddress = typeof authResult.user?.address === 'string'
    ? normalizeAddress(authResult.user.address)
    : '';
  if (!authenticatedAddress || !isAddressLike(authenticatedAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const resolvedParams = await params;
    const userId = resolvedParams?.userId;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid userId parameter' },
        { status: 400 }
      );
    }

    const ownerResult = await query<{ wallet_address: string }>(
      'SELECT wallet_address FROM users WHERE id = $1',
      [userId]
    );

    const ownerAddress = ownerResult.rows[0]?.wallet_address;
    if (!ownerAddress) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (authenticatedAddress !== ownerAddress.toLowerCase()) {
      return NextResponse.json(
        { error: 'You do not have permission to access this resource' },
        { status: 403 }
      );
    }

    const result = await query(
      `SELECT * FROM user_rewards
       WHERE user_id = $1
       ORDER BY earned_at DESC`,
      [userId]
    );

    const parseAmount = (value: unknown): number => {
      const amount = typeof value === 'number' ? value : parseFloat(String(value ?? '0'));
      return Number.isFinite(amount) && amount > 0 ? amount : 0;
    };

    const total = result.rows.reduce((sum, r) => sum + parseAmount(r.amount), 0);
    const totalUnclaimed = result.rows
      .filter((r) => r.status === 'pending' || !r.claimed)
      .reduce((sum, r) => sum + parseAmount(r.amount), 0);

    return NextResponse.json({
      rewards: result.rows,
      total,
      totalUnclaimed: totalUnclaimed.toString(),
      unclaimed: totalUnclaimed,
      claimed: total - totalUnclaimed
    });
  } catch (error) {
    logger.error('[Rewards GET] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch rewards';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
