import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import { requireAuth, checkOwnership } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { validateBody, claimQuestSchema } from '@/lib/auth/validation';

/**
 * POST /api/quests/claim
 * Claim a completed daily quest reward
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
    const validation = await validateBody(request, claimQuestSchema);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.details },
        { status: 400 }
      );
    }

    const { questId, userAddress } = validation.data;

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

      // Get quest progress
      const progressResult = await client.query(`
        SELECT uqp.*, dq.reward_xp, dq.reward_vfide, dq.title
        FROM user_quest_progress uqp
        JOIN daily_quests dq ON uqp.quest_id = dq.id
        WHERE uqp.user_id = $1 
          AND uqp.quest_id = $2
          AND uqp.quest_date = CURRENT_DATE
          AND uqp.completed = true
          AND uqp.claimed = false
      `, [userId, questId]);

      if (progressResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Quest not completed or already claimed' },
          { status: 400 }
        );
      }

      const quest = progressResult.rows[0];

      // Mark as claimed
      await client.query(`
        UPDATE user_quest_progress
        SET claimed = true, claimed_at = NOW()
        WHERE user_id = $1 AND quest_id = $2 AND quest_date = CURRENT_DATE
      `, [userId, questId]);

      // Add XP to user
      await client.query(`
        UPDATE user_gamification
        SET xp = xp + $1,
            total_xp = total_xp + $1,
            level = (xp + $1) / 100,
            updated_at = NOW()
        WHERE user_id = $2
      `, [quest.reward_xp, userId]);

      // Create reward record
      await client.query(`
        INSERT INTO daily_rewards (user_id, reward_date, reward_type, xp_earned, vfide_earned, description, claimed, claimed_at)
        VALUES ($1, CURRENT_DATE, 'quest_completion', $2, $3, $4, true, NOW())
      `, [userId, quest.reward_xp, quest.reward_vfide, `Completed quest: ${quest.title}`]);

      // Create achievement notification
      await client.query(`
        INSERT INTO achievement_notifications (user_id, notification_type, title, message, icon, reward_xp, reward_vfide)
        VALUES ($1, 'quest_complete', $2, $3, '✅', $4, $5)
      `, [
        userId,
        'Quest Complete!',
        `You've completed ${quest.title}`,
        quest.reward_xp,
        quest.reward_vfide,
      ]);

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        reward: {
          xp: quest.reward_xp,
          vfide: quest.reward_vfide,
        },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error claiming quest reward:', error);
    return NextResponse.json(
      { error: 'Failed to claim reward' },
      { status: 500 }
    );
  }
}
