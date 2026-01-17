import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import { validateRequest, validateAddress, checkRateLimit } from '@/lib/api-validation';
import { requireAuth } from '@/lib/auth-middleware';
import { apiLogger } from '@/lib/logger.service';

/**
 * POST /api/quests/claim
 * Claim a completed daily quest reward
 */
export async function POST(request: NextRequest) {
  // Rate limiting
  const clientId = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimit = checkRateLimit(`quest-claim:${clientId}`, { maxRequests: 20, windowMs: 60000 });
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
    const { questId, userAddress } = body;

    // Validate required fields
    const validation = validateRequest(body, {
      questId: { required: true, type: 'string' },
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

    const userId = userResult.rows[0]?.id;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found' },
        { status: 500 }
      );
    }

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
    apiLogger.error('Error claiming quest reward', { error });
    return NextResponse.json(
      { error: 'Failed to claim reward' },
      { status: 500 }
    );
  }
}
