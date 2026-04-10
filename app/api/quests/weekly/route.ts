import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import { isAdmin, requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase();
}

function isAddressLike(value: string): boolean {
  return ADDRESS_PATTERN.test(value);
}

/**
 * GET /api/quests/weekly
 * Fetch weekly challenges with user progress
 */
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const requesterAddress = typeof authResult.user?.address === 'string'
    ? normalizeAddress(authResult.user.address)
    : '';
  if (!requesterAddress || !isAddressLike(requesterAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const userAddressParam = searchParams.get('userAddress');

    if (!userAddressParam || userAddressParam.trim().length === 0) {
      return NextResponse.json({ error: 'User address required' }, { status: 400 });
    }

    const targetAddress = normalizeAddress(userAddressParam);
    if (!isAddressLike(targetAddress)) {
      return NextResponse.json({ error: 'Invalid user address format' }, { status: 400 });
    }

    const canAccess = requesterAddress === targetAddress || isAdmin(authResult.user);
    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const client = await getClient();

    try {
      // Get user ID
      const userResult = await client.query(
        'SELECT id FROM users WHERE wallet_address = $1',
        [targetAddress]
      );

      if (userResult.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const userId = userResult.rows[0].id;

      // Get current week's challenges with user progress
      const challengesResult = await client.query(`
        SELECT 
          wc.id,
          wc.challenge_key,
          wc.title,
          wc.description,
          wc.category,
          wc.target_value as target,
          wc.reward_xp,
          wc.reward_vfide,
          wc.icon,
          wc.week_start,
          wc.week_end,
          COALESCE(uwp.progress, 0) as progress,
          COALESCE(uwp.completed, false) as completed,
          COALESCE(uwp.claimed, false) as claimed
        FROM weekly_challenges wc
        LEFT JOIN user_weekly_progress uwp ON wc.id = uwp.challenge_id 
          AND uwp.user_id = $1 
          AND uwp.week_start = wc.week_start
        WHERE wc.is_active = true
          AND wc.week_start <= CURRENT_DATE
          AND wc.week_end >= CURRENT_DATE
        ORDER BY wc.category, wc.challenge_key
      `, [userId]);

      const challenges = challengesResult.rows.map(row => ({
        id: row.id,
        challengeKey: row.challenge_key,
        title: row.title,
        description: row.description,
        category: row.category,
        target: row.target,
        progress: row.progress,
        rewardXp: row.reward_xp,
        icon: row.icon,
        weekStart: row.week_start,
        weekEnd: row.week_end,
        completed: row.completed,
        claimed: row.claimed,
      }));

      return NextResponse.json({ challenges });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error fetching weekly challenges:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weekly challenges' },
      { status: 500 }
    );
  }
}
