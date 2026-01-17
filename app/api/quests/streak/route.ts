import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import { validateQueryParams, validateAddress, checkRateLimit, validateRequest } from '@/lib/api-validation';
import { requireAuth } from '@/lib/auth-middleware';
import { apiLogger } from '@/lib/logger.service';

/**
 * GET /api/quests/streak
 * Get user's login streak information
 */
export async function GET(request: NextRequest) {
  // Rate limiting
  const clientId = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimit = checkRateLimit(`quest-streak:${clientId}`, { maxRequests: 60, windowMs: 60000 });
  if (!rateLimit.success) {
    return rateLimit.errorResponse;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const userAddress = searchParams.get('userAddress');

    // Validate required parameter
    const validation = validateQueryParams(searchParams, {
      userAddress: { required: true, type: 'string' }
    });
    if (!validation.valid) {
      return validation.errorResponse;
    }

    // Validate address format
    const addressValidation = validateAddress(userAddress!);
    if (!addressValidation.valid) {
      return addressValidation.errorResponse;
    }

    const client = await getClient();

    try {
      // Get user ID
      const userResult = await client.query(
        'SELECT id FROM users WHERE wallet_address = $1',
        [userAddress]
      );

      if (userResult.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

    const userId = userResult.rows[0]?.id;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found' },
        { status: 500 }
      );
    }

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
    apiLogger.error('Error fetching streak', { error });
    return NextResponse.json(
      { error: 'Failed to fetch streak' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/quests/streak
 * Manually update streak (for testing or specific events)
 */
export async function POST(request: NextRequest) {
  // Rate limiting
  const clientId = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimit = checkRateLimit(`quest-streak-update:${clientId}`, { maxRequests: 30, windowMs: 60000 });
  if (!rateLimit.success) {
    return rateLimit.errorResponse;
  }

  // Authentication required
  const auth = await requireAuth(request);
  if (!auth.authenticated) {
    return auth.errorResponse;
  }

  try {
    const body = await request.json();
    const { userAddress, streakType = 'login' } = body;

    // Validate required field
    const validation = validateRequest(body, {
      userAddress: { required: true, type: 'string' }
    });
    if (!validation.valid) {
      return validation.errorResponse;
    }

    // Validate address format
    const addressValidation = validateAddress(userAddress);
    if (!addressValidation.valid) {
      return addressValidation.errorResponse;
    }

    const client = await getClient();

    try {
      // Get user ID
      const userResult = await client.query(
        'SELECT id FROM users WHERE wallet_address = $1',
        [userAddress]
      );

      if (userResult.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

    const userId = userResult.rows[0]?.id;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found' },
        { status: 500 }
      );
    }

      // Update streak
      await client.query(
        'SELECT update_user_streak($1, $2)',
        [userId, streakType]
      );

      // Fetch updated streak
      const streakResult = await client.query(
        'SELECT * FROM user_streaks WHERE user_id = $1 AND streak_type = $2',
        [userId, streakType]
      );

      const streak = streakResult.rows[0];

      // Check for milestone rewards
      await client.query(
        'SELECT check_streak_milestones($1, $2, $3)',
        [userId, streakType, streak.current_streak]
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
    apiLogger.error('Error updating streak', { error });
    return NextResponse.json(
      { error: 'Failed to update streak' },
      { status: 500 }
    );
  }
}
