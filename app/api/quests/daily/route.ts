import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import { isAdmin, withAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import type { JWTPayload } from '@/lib/auth/jwt';

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase();
}

function isAddressLike(value: string): boolean {
  return ADDRESS_PATTERN.test(value);
}

/**
 * GET /api/quests/daily
 * Fetch daily quests with user progress
 */
export const GET = withAuth(async (request: NextRequest, user: JWTPayload) => {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;
  const requesterAddress = typeof user?.address === 'string'
    ? normalizeAddress(user.address)
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

    const canAccess = requesterAddress === targetAddress || isAdmin(user);
    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const client = await getClient();

    try {
      // Get user ID from address
      const userResult = await client.query(
        'SELECT id FROM users WHERE wallet_address = $1',
        [targetAddress]
      );

      if (userResult.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const userId = userResult.rows[0].id;

      // Get daily quests with user progress
      const questsResult = await client.query(`
        SELECT 
          dq.id,
          dq.quest_key,
          dq.title,
          dq.description,
          dq.category,
          dq.difficulty,
          dq.target_value as target,
          dq.reward_xp,
          dq.reward_vfide,
          dq.icon,
          COALESCE(uqp.progress, 0) as progress,
          COALESCE(uqp.completed, false) as completed,
          COALESCE(uqp.claimed, false) as claimed
        FROM daily_quests dq
        LEFT JOIN user_quest_progress uqp ON dq.id = uqp.quest_id 
          AND uqp.user_id = $1 
          AND uqp.quest_date = CURRENT_DATE
        WHERE dq.is_active = true
        ORDER BY dq.difficulty, dq.quest_key
      `, [userId]);

      const quests = questsResult.rows.map(row => ({
        id: row.id,
        questKey: row.quest_key,
        title: row.title,
        description: row.description,
        category: row.category,
        difficulty: row.difficulty,
        target: row.target,
        progress: row.progress,
        rewardXp: row.reward_xp,

        icon: row.icon,
        completed: row.completed,
        claimed: row.claimed,
      }));

      return NextResponse.json({ quests });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error fetching daily quests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily quests' },
      { status: 500 }
    );
  }
});
