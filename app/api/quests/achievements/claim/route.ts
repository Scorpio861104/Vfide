import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import { checkOwnership, withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { z } from 'zod4';

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;

const claimAchievementSchema = z.object({
  milestoneId: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]),
  userAddress: z.string().trim().regex(ADDRESS_LIKE_REGEX),
});

function parsePositiveInteger(value: unknown): number | null {
  const parsed = typeof value === 'number'
    ? value
    : (typeof value === 'string' ? Number.parseInt(value, 10) : NaN);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

/**
 * POST /api/quests/achievements/claim
 * Claim achievement milestone rewards
 * 
 * Security:
 * - Requires authentication
 * - Rate limited (5 claims per hour)
 * - User can only claim their own rewards
 */
async function postHandler(request: NextRequest, user: JWTPayload) {
  // Rate limit - strict for claiming rewards
  const rateLimitResponse = await withRateLimit(request, 'claim');
  if (rateLimitResponse) return rateLimitResponse;

  const requesterAddress = typeof user.address === 'string'
    ? user.address.trim().toLowerCase()
    : '';
  if (!requesterAddress || !ADDRESS_LIKE_REGEX.test(requesterAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof claimAchievementSchema>;
  try {
    const rawBody = await request.json();
    const parsed = claimAchievementSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    body = parsed.data;
  } catch (error) {
    logger.debug('[Quests Achievements Claim] Invalid JSON body', error);
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  try {
    const { milestoneId, userAddress } = body;

    if (!milestoneId || !userAddress) {
      return NextResponse.json(
        { error: 'Milestone ID and user address required' },
        { status: 400 }
      );
    }

    const normalizedUserAddress = userAddress.trim().toLowerCase();
    if (!ADDRESS_LIKE_REGEX.test(normalizedUserAddress)) {
      return NextResponse.json(
        { error: 'Invalid user address format' },
        { status: 400 }
      );
    }

    const parsedMilestoneId = parsePositiveInteger(milestoneId);
    if (!parsedMilestoneId) {
      return NextResponse.json(
        { error: 'Milestone ID must be a positive integer' },
        { status: 400 }
      );
    }

    // Verify user is claiming their own rewards
    if (!checkOwnership(user, normalizedUserAddress)) {
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
        [normalizedUserAddress]
      );

      if (userResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const userId = userResult.rows[0].id;

      // Check if achievement is unlocked and not claimed
      const progressResult = await client.query(`
        SELECT uap.*, am.reward_xp, am.reward_vfide, am.reward_badge, am.title
        FROM user_achievement_progress uap
        JOIN achievement_milestones am ON uap.milestone_id = am.id
        WHERE uap.user_id = $1 
          AND uap.milestone_id = $2
          AND uap.unlocked = true 
          AND uap.claimed = false
      `, [userId, parsedMilestoneId]);

      if (progressResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Achievement not unlocked or already claimed' },
          { status: 400 }
        );
      }

      const achievement = progressResult.rows[0];

      // Mark achievement as claimed
      await client.query(`
        UPDATE user_achievement_progress
        SET claimed = true, claimed_at = NOW()
        WHERE user_id = $1 AND milestone_id = $2
      `, [userId, parsedMilestoneId]);

      // Add XP to user
      await client.query(`
        UPDATE user_gamification
        SET xp = xp + $1, 
            total_xp = total_xp + $1,
            level = (xp + $1) / 100,
            updated_at = NOW()
        WHERE user_id = $2
      `, [achievement.reward_xp, userId]);

      // Award badge if specified
      if (achievement.reward_badge) {
        await client.query(`
          INSERT INTO user_badges (user_id, badge_id, earned_at)
          SELECT $1, id, NOW()
          FROM badges
          WHERE badge_key = $2
          ON CONFLICT (user_id, badge_id) DO NOTHING
        `, [userId, achievement.reward_badge]);
      }

      // Create reward record (vfide_earned is 0 — XP-only rewards; token distributions are not offered)
      await client.query(`
        INSERT INTO daily_rewards 
        (user_id, reward_date, reward_type, xp_earned, vfide_earned, description, claimed, claimed_at)
        VALUES ($1, CURRENT_DATE, 'achievement_milestone', $2, 0, $3, true, NOW())
      `, [
        userId,
        achievement.reward_xp,
        `Unlocked achievement: ${achievement.title}`,
      ]);

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        reward: {
          xp: achievement.reward_xp,
          badge: achievement.reward_badge,
        },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error claiming achievement:', error);
    return NextResponse.json(
      { error: 'Failed to claim achievement' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(postHandler);
