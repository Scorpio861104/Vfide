import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import { isAdmin, withAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { z } from 'zod4';
import type { JWTPayload } from '@/lib/auth/jwt';

const STREAK_TYPE_REGEX = /^[a-z_]{1,32}$/;
const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

const updateStreakSchema = z.object({
  userAddress: z.string().trim().regex(ADDRESS_PATTERN),
  streakType: z.string().regex(STREAK_TYPE_REGEX).optional(),
});

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase();
}

function isAddressLike(value: string): boolean {
  return ADDRESS_PATTERN.test(value);
}

/**
 * GET /api/quests/streak
 * Get user's login streak information
 */
export const GET = withAuth(async (request: NextRequest, user: JWTPayload) => {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;

  // Authentication
  const requesterAddress = typeof user?.address === 'string'
    ? normalizeAddress(user.address)
    : '';
  if (!requesterAddress || !isAddressLike(requesterAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const userAddress = searchParams.get('userAddress');

    if (!userAddress) {
      return NextResponse.json({ error: 'User address required' }, { status: 400 });
    }

    if (typeof userAddress !== 'string') {
      return NextResponse.json({ error: 'User address must be a string' }, { status: 400 });
    }

    const targetAddress = normalizeAddress(userAddress);
    if (!isAddressLike(targetAddress)) {
      return NextResponse.json({ error: 'Invalid user address format' }, { status: 400 });
    }

    const canAccess = requesterAddress === targetAddress || isAdmin(user);
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

      // Get or create login streak
      const streakResult = await client.query(`
        INSERT INTO user_streaks (user_id, streak_type, current_streak, longest_streak, last_activity_date, streak_start_date, total_days)
        VALUES ($1, 'login', 1, 1, CURRENT_DATE, CURRENT_DATE, 1)
        ON CONFLICT (user_id, streak_type)
        DO UPDATE SET updated_at = NOW()
        RETURNING *
      `, [userId]);

      const streak = streakResult.rows[0];

      // Check if we need to update the streak for today
      if (streak.last_activity_date !== new Date().toISOString().split('T')[0]) {
        await client.query(
          'SELECT update_user_streak($1, $2)',
          [userId, 'login']
        );

        // Refetch updated streak
        const updatedResult = await client.query(
          'SELECT * FROM user_streaks WHERE user_id = $1 AND streak_type = $2',
          [userId, 'login']
        );

        const updatedStreak = updatedResult.rows[0];

        // Check for milestone rewards
        await client.query(
          'SELECT check_streak_milestones($1, $2, $3)',
          [userId, 'login', updatedStreak.current_streak]
        );

        return NextResponse.json({
          streak: {
            type: updatedStreak.streak_type,
            currentStreak: updatedStreak.current_streak,
            longestStreak: updatedStreak.longest_streak,
            lastActivityDate: updatedStreak.last_activity_date,
            totalDays: updatedStreak.total_days,
          },
        });
      }

      return NextResponse.json({
        streak: {
          type: streak.streak_type,
          currentStreak: streak.current_streak,
          longestStreak: streak.longest_streak,
          lastActivityDate: streak.last_activity_date,
          totalDays: streak.total_days,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error fetching streak:', error);
    return NextResponse.json(
      { error: 'Failed to fetch streak' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/quests/streak
 * Manually update streak (for testing or specific events)
 */
export const POST = withAuth(async (request: NextRequest, user: JWTPayload) => {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'write');
  if (rateLimit) return rateLimit;

  // Authentication
  const requesterAddress = typeof user?.address === 'string'
    ? normalizeAddress(user.address)
    : '';
  if (!requesterAddress || !isAddressLike(requesterAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof updateStreakSchema>;
  try {
    const rawBody = await request.json();
    const parsed = updateStreakSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    body = parsed.data;
  } catch (error) {
    logger.debug('[Quests Streak] Invalid JSON body', error);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const { userAddress, streakType = 'login' } = body;

    const streakTypeValue = streakType;

    const targetAddress = normalizeAddress(userAddress);
    if (!isAddressLike(targetAddress)) {
      return NextResponse.json({ error: 'Invalid user address format' }, { status: 400 });
    }

    const canUpdate = requesterAddress === targetAddress || isAdmin(user);
    if (!canUpdate) {
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

      // Update streak
      await client.query(
        'SELECT update_user_streak($1, $2)',
        [userId, streakTypeValue]
      );

      // Fetch updated streak
      const streakResult = await client.query(
        'SELECT * FROM user_streaks WHERE user_id = $1 AND streak_type = $2',
        [userId, streakTypeValue]
      );

      const streak = streakResult.rows[0];

      // Check for milestone rewards
      await client.query(
        'SELECT check_streak_milestones($1, $2, $3)',
        [userId, streakTypeValue, streak.current_streak]
      );

      return NextResponse.json({
        streak: {
          type: streak.streak_type,
          currentStreak: streak.current_streak,
          longestStreak: streak.longest_streak,
          lastActivityDate: streak.last_activity_date,
          totalDays: streak.total_days,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error updating streak:', error);
    return NextResponse.json(
      { error: 'Failed to update streak' },
      { status: 500 }
    );
  }
});
