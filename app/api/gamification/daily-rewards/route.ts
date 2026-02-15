import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';

const DAILY_REWARDS = [
  { day: 1, vfide: 15, xp: 50 },
  { day: 2, vfide: 15, xp: 50 },
  { day: 3, vfide: 20, xp: 75, bonus: true },
  { day: 4, vfide: 15, xp: 50 },
  { day: 5, vfide: 15, xp: 50 },
  { day: 6, vfide: 15, xp: 50 },
  { day: 7, vfide: 50, xp: 200, bonus: true },
];

const DAY_MS = 24 * 60 * 60 * 1000;

type DailyRewardRow = {
  user_id: number;
  last_claim_at: string | null;
  streak: number;
  total_claims: number;
};

function buildWeekRewards(streak: number) {
  const boundedStreak = Math.max(0, Math.min(streak, 7));
  return DAILY_REWARDS.map((reward) => ({
    ...reward,
    claimed: reward.day <= boundedStreak,
  }));
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const userResult = await query<{ id: number }>(
      'SELECT id FROM users WHERE wallet_address = $1',
      [authResult.user.address.toLowerCase()]
    );

    const userId = userResult.rows[0]?.id;
    if (!userId) {
      return NextResponse.json({
        canClaim: true,
        streak: 0,
        nextClaimAt: null,
        rewards: buildWeekRewards(0),
      });
    }

    const rewardResult = await query<DailyRewardRow>(
      'SELECT user_id, last_claim_at, streak, total_claims FROM user_daily_rewards WHERE user_id = $1',
      [userId]
    );

    let row = rewardResult.rows[0];
    if (!row) {
      await query(
        `INSERT INTO user_daily_rewards (user_id, last_claim_at, streak, total_claims, created_at, updated_at)
         VALUES ($1, NULL, 0, 0, NOW(), NOW())`,
        [userId]
      );
      row = { user_id: userId, last_claim_at: null, streak: 0, total_claims: 0 };
    }

    const lastClaimAt = row.last_claim_at ? new Date(row.last_claim_at).getTime() : null;
    const now = Date.now();
    const diff = lastClaimAt ? now - lastClaimAt : null;
    const canClaim = diff === null || diff >= DAY_MS;
    const nextClaimAt = !canClaim && lastClaimAt ? lastClaimAt + DAY_MS : null;

    const streak = diff !== null && diff > DAY_MS * 2 ? 0 : row.streak;

    return NextResponse.json({
      canClaim,
      streak,
      nextClaimAt,
      rewards: buildWeekRewards(streak),
    });
  } catch (error) {
    console.error('[Daily Rewards GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch daily rewards' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const userResult = await query<{ id: number }>(
      'SELECT id FROM users WHERE wallet_address = $1',
      [authResult.user.address.toLowerCase()]
    );

    const userId = userResult.rows[0]?.id;
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Atomic claim: SELECT FOR UPDATE locks the row to prevent concurrent double-claims
    const rewardResult = await query<DailyRewardRow>(
      'SELECT user_id, last_claim_at, streak, total_claims FROM user_daily_rewards WHERE user_id = $1 FOR UPDATE',
      [userId]
    );

    const row = rewardResult.rows[0];
    const lastClaimAt = row?.last_claim_at ? new Date(row.last_claim_at).getTime() : null;
    const now = Date.now();

    if (lastClaimAt !== null && now - lastClaimAt < DAY_MS) {
      return NextResponse.json(
        { error: 'Reward already claimed', nextClaimAt: lastClaimAt + DAY_MS },
        { status: 400 }
      );
    }

    const withinStreakWindow = lastClaimAt !== null && now - lastClaimAt <= DAY_MS * 2;
    const currentStreak = row?.streak ?? 0;
    const newStreak = withinStreakWindow ? Math.min(currentStreak + 1, 7) : 1;

    const reward = DAILY_REWARDS[newStreak - 1] ?? DAILY_REWARDS[0]!;

    if (row) {
      // Atomic update with WHERE guard for last_claim_at to prevent TOCTOU
      const updateResult = await query(
        `UPDATE user_daily_rewards
         SET last_claim_at = NOW(), streak = $2, total_claims = total_claims + 1, updated_at = NOW()
         WHERE user_id = $1 AND (last_claim_at IS NULL OR last_claim_at < NOW() - INTERVAL '24 hours')`,
        [userId, newStreak]
      );
      if (updateResult.rowCount === 0) {
        return NextResponse.json(
          { error: 'Reward already claimed' },
          { status: 400 }
        );
      }
    } else {
      // First-time claim: INSERT with ON CONFLICT to handle race conditions.
      // Use RETURNING to verify this request actually performed the insert.
      const insertResult = await query(
        `INSERT INTO user_daily_rewards (user_id, last_claim_at, streak, total_claims, created_at, updated_at)
         VALUES ($1, NOW(), $2, 1, NOW(), NOW())
         ON CONFLICT (user_id) DO UPDATE
           SET last_claim_at = NOW(), streak = EXCLUDED.streak, total_claims = user_daily_rewards.total_claims + 1, updated_at = NOW()
           WHERE user_daily_rewards.last_claim_at IS NULL OR user_daily_rewards.last_claim_at < NOW() - INTERVAL '24 hours'
         RETURNING user_id`,
        [userId, newStreak]
      );
      if (insertResult.rowCount === 0) {
        return NextResponse.json(
          { error: 'Reward already claimed' },
          { status: 400 }
        );
      }
    }

    await query(
      `INSERT INTO user_rewards (user_id, amount, reward_type, reason, status, earned_at)
       VALUES ($1, $2, 'daily_reward', 'Daily reward claim', 'pending', NOW())`,
      [userId, reward.vfide]
    );

    return NextResponse.json({
      success: true,
      reward,
      streak: newStreak,
      nextClaimAt: now + DAY_MS,
      rewards: buildWeekRewards(newStreak),
    });
  } catch (error) {
    console.error('[Daily Rewards POST] Error:', error);
    return NextResponse.json({ error: 'Failed to claim daily reward' }, { status: 500 });
  }
}
