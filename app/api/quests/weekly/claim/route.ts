import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import { requireAuth, checkOwnership } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';

/**
 * POST /api/quests/weekly/claim
 * Claim weekly challenge rewards
 * 
 * Security:
 * - Requires authentication
 * - Rate limited (5 claims per hour)
 * - User can only claim their own rewards
 */
export async function POST(request: NextRequest) {
  // Rate limit - strict for claiming rewards
  const rateLimitResponse = await withRateLimit(request, 'claim');
  if (rateLimitResponse) return rateLimitResponse;

  // Require authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { challengeId, userAddress } = await request.json();

    if (!challengeId || !userAddress) {
      return NextResponse.json(
        { error: 'Challenge ID and user address required' },
        { status: 400 }
      );
    }

    // Verify user is claiming their own rewards
    if (!checkOwnership(authResult.user, userAddress)) {
      return NextResponse.json(
        { error: 'You can only claim your own rewards' },
        { status: 403 }
      );
    }

    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Get user ID
      const userResult = await client.query(
        'SELECT id FROM users WHERE wallet_address = $1',
        [userAddress]
      );

      if (userResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const userId = userResult.rows[0].id;

      // Check if challenge is completed and not claimed
      const progressResult = await client.query(`
        SELECT uwp.*, wc.reward_xp, wc.reward_vfide, wc.title, wc.week_start
        FROM user_weekly_progress uwp
        JOIN weekly_challenges wc ON uwp.challenge_id = wc.id
        WHERE uwp.user_id = $1 
          AND uwp.challenge_id = $2
          AND uwp.completed = true 
          AND uwp.claimed = false
      `, [userId, challengeId]);

      if (progressResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Challenge not completed or already claimed' },
          { status: 400 }
        );
      }

      const challenge = progressResult.rows[0];

      // Mark challenge as claimed
      await client.query(`
        UPDATE user_weekly_progress
        SET claimed = true, claimed_at = NOW()
        WHERE user_id = $1 AND challenge_id = $2 AND week_start = $3
      `, [userId, challengeId, challenge.week_start]);

      // Add XP to user (also updates level)
      await client.query(`
        UPDATE user_gamification
        SET xp = xp + $1, 
            total_xp = total_xp + $1,
            level = (xp + $1) / 100,
            updated_at = NOW()
        WHERE user_id = $2
      `, [challenge.reward_xp, userId]);

      // Create reward record
      await client.query(`
        INSERT INTO daily_rewards 
        (user_id, reward_date, reward_type, xp_earned, vfide_earned, description, claimed, claimed_at)
        VALUES ($1, CURRENT_DATE, 'weekly_challenge', $2, $3, $4, true, NOW())
      `, [
        userId,
        challenge.reward_xp,
        challenge.reward_vfide,
        `Completed weekly challenge: ${challenge.title}`,
      ]);

      // Create achievement notification
      await client.query(`
        INSERT INTO achievement_notifications 
        (user_id, notification_type, title, message, icon, reward_xp, reward_vfide)
        VALUES ($1, 'challenge_complete', 'Weekly Challenge Complete!', $2, '🏆', $3, $4)
      `, [
        userId,
        `You've completed ${challenge.title}`,
        challenge.reward_xp,
        challenge.reward_vfide,
      ]);

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        reward: {
          xp: challenge.reward_xp,
          vfide: challenge.reward_vfide,
        },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error claiming weekly challenge:', error);
    return NextResponse.json(
      { error: 'Failed to claim weekly challenge' },
      { status: 500 }
    );
  }
}
