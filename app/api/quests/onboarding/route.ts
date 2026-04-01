import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import { isAdmin, requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { z } from 'zod4';

const VALID_ONBOARDING_STEPS = new Set([
  'connectWallet',
  'completeProfile',
  'firstTransaction',
  'addFriend',
  'joinGroup',
  'voteProposal',
  'earnBadge',
  'depositVault',
  'giveEndorsement',
  'completeQuest',
]);
const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{3,64}$/;

const updateOnboardingStepSchema = z.object({
  step: z.string().trim().refine((value) => VALID_ONBOARDING_STEPS.has(value), {
    message: 'Invalid onboarding step',
  }),
  userAddress: z.string().trim().regex(ADDRESS_PATTERN),
});

const claimOnboardingRewardSchema = z.object({
  userAddress: z.string().trim().regex(ADDRESS_PATTERN),
});

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase();
}

function isAddressLike(value: string): boolean {
  return ADDRESS_PATTERN.test(value);
}

/**
 * GET /api/quests/onboarding
 * Fetch user onboarding progress
 */
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;

  // Authentication
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
    const userAddress = toNonEmptyString(searchParams.get('userAddress'));

    if (!userAddress) {
      return NextResponse.json({ error: 'User address required' }, { status: 400 });
    }

    const targetAddress = normalizeAddress(userAddress);
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

      // Get or create onboarding progress
      const onboardingResult = await client.query(`
        INSERT INTO user_onboarding (user_id)
        VALUES ($1)
        ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
        RETURNING *
      `, [userId]);

      const onboarding = onboardingResult.rows[0];

      return NextResponse.json({
        steps: {
          connectWallet: onboarding.step_connect_wallet,
          completeProfile: onboarding.step_complete_profile,
          firstTransaction: onboarding.step_first_transaction,
          addFriend: onboarding.step_add_friend,
          joinGroup: onboarding.step_join_group,
          voteProposal: onboarding.step_vote_proposal,
          earnBadge: onboarding.step_earn_badge,
          depositVault: onboarding.step_deposit_vault,
          giveEndorsement: onboarding.step_give_endorsement,
          completeQuest: onboarding.step_complete_quest,
        },
        completed: onboarding.onboarding_completed,
        completedAt: onboarding.onboarding_completed_at,
        rewardClaimed: onboarding.reward_claimed,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error fetching onboarding progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch onboarding progress' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/quests/onboarding
 * Update onboarding step completion
 */
export async function PATCH(request: NextRequest) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'write');
  if (rateLimit) return rateLimit;

  // Authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const requesterAddress = typeof authResult.user?.address === 'string'
    ? normalizeAddress(authResult.user.address)
    : '';
  if (!requesterAddress || !isAddressLike(requesterAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof updateOnboardingStepSchema>;
  try {
    const rawBody = await request.json();
    const parsed = updateOnboardingStepSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    body = parsed.data;
  } catch (error) {
    logger.debug('[Quests Onboarding PATCH] Invalid JSON body', error);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const step = body.step;
    const userAddress = body.userAddress;

    const targetAddress = normalizeAddress(userAddress);
    if (!isAddressLike(targetAddress)) {
      return NextResponse.json({ error: 'Invalid user address format' }, { status: 400 });
    }

    const canUpdate = requesterAddress === targetAddress || isAdmin(authResult.user);
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Get user ID
      const userResult = await client.query(
        'SELECT id FROM users WHERE wallet_address = $1',
        [targetAddress]
      );

      if (userResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const userId = userResult.rows[0].id;

      // Convert camelCase to snake_case for database column
      const columnName = `step_${step.replace(/([A-Z])/g, '_$1').toLowerCase()}`;

      // Update the specific step
      await client.query(`
        INSERT INTO user_onboarding (user_id, ${columnName})
        VALUES ($1, true)
        ON CONFLICT (user_id) 
        DO UPDATE SET ${columnName} = true, updated_at = NOW()
      `, [userId]);

      // Check if all steps are complete
      const checkResult = await client.query(`
        SELECT 
          step_connect_wallet AND
          step_complete_profile AND
          step_first_transaction AND
          step_add_friend AND
          step_join_group AND
          step_vote_proposal AND
          step_earn_badge AND
          step_deposit_vault AND
          step_give_endorsement AND
          step_complete_quest AS all_complete
        FROM user_onboarding
        WHERE user_id = $1
      `, [userId]);

      const allComplete = checkResult.rows[0].all_complete;

      // If all complete, mark onboarding as completed and create notification
      if (allComplete) {
        await client.query(`
          UPDATE user_onboarding
          SET onboarding_completed = true, 
              onboarding_completed_at = NOW()
          WHERE user_id = $1 AND onboarding_completed = false
        `, [userId]);

        // Create completion notification
        await client.query(`
          INSERT INTO achievement_notifications 
          (user_id, notification_type, title, message, icon, reward_xp, reward_vfide)
          VALUES ($1, 'onboarding_complete', 'Onboarding Complete!', 'You''ve completed all onboarding steps!', '🎉', 500, $2)
          ON CONFLICT DO NOTHING
        `, [userId, BigInt(0)]);
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        stepCompleted: step,
        allComplete,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error updating onboarding progress:', error);
    return NextResponse.json(
      { error: 'Failed to update onboarding progress' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/quests/onboarding/claim
 * Claim onboarding completion reward
 */
export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitPost = await withRateLimit(request, 'write');
  if (rateLimitPost) return rateLimitPost;

  // Authentication
  const authResultPost = await requireAuth(request);
  if (authResultPost instanceof NextResponse) return authResultPost;

  const requesterAddress = typeof authResultPost.user?.address === 'string'
    ? normalizeAddress(authResultPost.user.address)
    : '';
  if (!requesterAddress || !isAddressLike(requesterAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof claimOnboardingRewardSchema>;
  try {
    const rawBody = await request.json();
    const parsed = claimOnboardingRewardSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    body = parsed.data;
  } catch (error) {
    logger.debug('[Quests Onboarding Claim] Invalid JSON body', error);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const userAddress = body.userAddress;

    const targetAddress = normalizeAddress(userAddress);
    if (!isAddressLike(targetAddress)) {
      return NextResponse.json({ error: 'Invalid user address format' }, { status: 400 });
    }

    const canClaim = requesterAddress === targetAddress || isAdmin(authResultPost.user);
    if (!canClaim) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Get user ID
      const userResult = await client.query(
        'SELECT id FROM users WHERE wallet_address = $1',
        [targetAddress]
      );

      if (userResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const userId = userResult.rows[0].id;

      // Check if onboarding is complete and reward not claimed
      const onboardingResult = await client.query(`
        SELECT * FROM user_onboarding
        WHERE user_id = $1 
          AND onboarding_completed = true 
          AND reward_claimed = false
      `, [userId]);

      if (onboardingResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Onboarding not complete or reward already claimed' },
          { status: 400 }
        );
      }

      const rewardXp = 500;
      const rewardVfide = BigInt(0);

      // Mark reward as claimed
      await client.query(`
        UPDATE user_onboarding
        SET reward_claimed = true, reward_claimed_at = NOW()
        WHERE user_id = $1
      `, [userId]);

      // Add XP to user
      await client.query(`
        UPDATE user_gamification
        SET xp = xp + $1, 
            total_xp = total_xp + $1,
            level = (xp + $1) / 100,
            updated_at = NOW()
        WHERE user_id = $2
      `, [rewardXp, userId]);

      // Create reward record
      await client.query(`
        INSERT INTO daily_rewards 
        (user_id, reward_date, reward_type, xp_earned, vfide_earned, description, claimed, claimed_at)
        VALUES ($1, CURRENT_DATE, 'onboarding_complete', $2, $3, 'Onboarding completion XP', true, NOW())
      `, [userId, rewardXp, rewardVfide.toString()]);

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        reward: {
          xp: rewardXp,
        },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error claiming onboarding reward:', error);
    return NextResponse.json(
      { error: 'Failed to claim onboarding reward' },
      { status: 500 }
    );
  }
}
