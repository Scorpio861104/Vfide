import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';
import { validateRequest, validateAddress, checkRateLimit } from '@/lib/api-validation';
import { apiLogger } from '@/services/logger.service';

/**
 * POST /api/leaderboard/claim-prize
 * Claim monthly competition prize
 */
export async function POST(request: NextRequest) {
  // Rate limiting
  const clientId = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimit = checkRateLimit(`leaderboard-claim-prize:${clientId}`, { maxRequests: 10, windowMs: 60000 });
  if (!rateLimit.success) return rateLimit.errorResponse;

  // Authentication required
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.errorResponse;

  try {
    const { userAddress, monthYear } = await request.json();

    // Validation
    const addressValidation = validateAddress(userAddress);
    if (!addressValidation.valid) return addressValidation.errorResponse;

    const validation = validateRequest({ monthYear }, {
      monthYear: { required: true, type: 'string' }
    });
    if (!validation.valid) return validation.errorResponse;

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

      // Check if user has unclaimed prize
      const leaderboardResult = await client.query(`
        SELECT ml.*, pt.tier_name
        FROM monthly_leaderboard ml
        LEFT JOIN prize_tiers pt ON ml.final_rank >= pt.rank_start AND ml.final_rank <= pt.rank_end
        WHERE ml.user_id = $1 
          AND ml.month_year = $2
          AND ml.prize_claimed = false
          AND ml.prize_amount > 0
          AND ml.final_rank IS NOT NULL
      `, [userId, monthYear]);

      if (leaderboardResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'No prize available to claim or already claimed' },
          { status: 400 }
        );
      }

      const leaderboard = leaderboardResult.rows[0];

      // Check if distribution is complete
      const poolResult = await client.query(
        'SELECT distribution_complete FROM monthly_prize_pool WHERE month_year = $1',
        [monthYear]
      );

      if (poolResult.rows.length === 0 || !poolResult.rows[0].distribution_complete) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Prize distribution not yet complete for this month' },
          { status: 400 }
        );
      }

      // Mark prize as claimed
      await client.query(`
        UPDATE monthly_leaderboard
        SET prize_claimed = true, updated_at = NOW()
        WHERE user_id = $1 AND month_year = $2
      `, [userId, monthYear]);

      // Create reward record
      await client.query(`
        INSERT INTO daily_rewards 
        (user_id, reward_date, reward_type, xp_earned, vfide_earned, description, claimed, claimed_at)
        VALUES ($1, CURRENT_DATE, 'monthly_competition', 0, $2, $3, true, NOW())
      `, [
        userId,
        leaderboard.prize_amount,
        `Monthly competition reward - Rank ${leaderboard.final_rank} (${leaderboard.tier_name})`,
      ]);

      // Create achievement notification
      await client.query(`
        INSERT INTO achievement_notifications 
        (user_id, notification_type, title, message, icon, reward_xp, reward_vfide)
        VALUES ($1, 'monthly_prize', 'Monthly Prize Won!', $2, '🏆', 0, $3)
      `, [
        userId,
        `Congratulations! You ranked #${leaderboard.final_rank} and won ${(BigInt(leaderboard.prize_amount) / BigInt(10 ** 18)).toString()} VFIDE!`,
        leaderboard.prize_amount,
      ]);

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        prize: {
          rank: leaderboard.final_rank,
          tier: leaderboard.tier_name,
          amount: leaderboard.prize_amount,
          amountFormatted: (BigInt(leaderboard.prize_amount) / BigInt(10 ** 18)).toString(),
        },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    apiLogger.error('Error claiming monthly prize', { error });
    return NextResponse.json(
      { error: 'Failed to claim monthly prize' },
      { status: 500 }
    );
  }
}
