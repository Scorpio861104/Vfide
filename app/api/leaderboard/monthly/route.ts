import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/leaderboard/monthly
 * Fetch monthly leaderboard with rankings and prize pool info
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const monthYear = searchParams.get('month') || new Date().toISOString().slice(0, 7); // Default to current month
    const userAddress = searchParams.get('userAddress');
    const limit = parseInt(searchParams.get('limit') || '100');

    const client = await pool.connect();

    try {
      // Get prize pool info
      const poolResult = await client.query(`
        SELECT total_pool, distributed_amount, distribution_complete, distribution_date
        FROM monthly_prize_pool
        WHERE month_year = $1
      `, [monthYear]);

      const prizePool = poolResult.rows[0] || {
        total_pool: '0',
        distributed_amount: '0',
        distribution_complete: false,
        distribution_date: null,
      };

      // Get leaderboard
      const leaderboardResult = await client.query(`
        SELECT 
          ml.user_id,
          u.username,
          u.wallet_address,
          ml.total_xp_earned,
          ml.quests_completed,
          ml.challenges_completed,
          ml.current_streak,
          ml.transactions_count,
          ml.social_interactions,
          ml.governance_votes,
          ml.activity_score,
          ml.final_rank,
          ml.prize_amount,
          ml.prize_claimed,
          pt.tier_name
        FROM monthly_leaderboard ml
        JOIN users u ON ml.user_id = u.id
        LEFT JOIN prize_tiers pt ON ml.final_rank >= pt.rank_start AND ml.final_rank <= pt.rank_end
        WHERE ml.month_year = $1
        ORDER BY ml.activity_score DESC, ml.updated_at ASC
        LIMIT $2
      `, [monthYear, limit]);

      const leaderboard = leaderboardResult.rows.map((row, index) => ({
        rank: index + 1,
        userId: row.user_id,
        username: row.username,
        walletAddress: row.wallet_address,
        stats: {
          totalXp: row.total_xp_earned,
          questsCompleted: row.quests_completed,
          challengesCompleted: row.challenges_completed,
          currentStreak: row.current_streak,
          transactionsCount: row.transactions_count,
          socialInteractions: row.social_interactions,
          governanceVotes: row.governance_votes,
        },
        activityScore: row.activity_score,
        finalRank: row.final_rank,
        tier: row.tier_name,
        prizeAmount: (BigInt(row.prize_amount || '0') / BigInt(10 ** 18)).toString(),
        prizeClaimed: row.prize_claimed,
      }));

      // Get user's position if userAddress provided
      let userPosition = null;
      if (userAddress) {
        const userResult = await client.query(`
          SELECT 
            ml.*,
            pt.tier_name,
            ROW_NUMBER() OVER (ORDER BY ml.activity_score DESC, ml.updated_at ASC) as current_rank
          FROM monthly_leaderboard ml
          JOIN users u ON ml.user_id = u.id
          LEFT JOIN prize_tiers pt ON ml.final_rank >= pt.rank_start AND ml.final_rank <= pt.rank_end
          WHERE ml.month_year = $1 AND u.wallet_address = $2
        `, [monthYear, userAddress]);

        if (userResult.rows.length > 0) {
          const user = userResult.rows[0];
          userPosition = {
            rank: parseInt(user.current_rank),
            finalRank: user.final_rank,
            activityScore: user.activity_score,
            tier: user.tier_name,
            prizeAmount: (BigInt(user.prize_amount || '0') / BigInt(10 ** 18)).toString(),
            prizeClaimed: user.prize_claimed,
            stats: {
              totalXp: user.total_xp_earned,
              questsCompleted: user.quests_completed,
              challengesCompleted: user.challenges_completed,
              currentStreak: user.current_streak,
              transactionsCount: user.transactions_count,
              socialInteractions: user.social_interactions,
              governanceVotes: user.governance_votes,
            },
          };
        }
      }

      return NextResponse.json({
        monthYear,
        prizePool: {
          total: (BigInt(prizePool.total_pool || '0') / BigInt(10 ** 18)).toString(),
          distributed: (BigInt(prizePool.distributed_amount || '0') / BigInt(10 ** 18)).toString(),
          distributionComplete: prizePool.distribution_complete,
          distributionDate: prizePool.distribution_date,
        },
        leaderboard,
        userPosition,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching monthly leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monthly leaderboard' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/leaderboard/monthly
 * Update user's monthly stats
 */
export async function POST(request: NextRequest) {
  try {
    const {
      userAddress,
      questsCompleted,
      challengesCompleted,
      currentStreak,
      transactionsCount,
      socialInteractions,
      governanceVotes,
    } = await request.json();

    if (!userAddress) {
      return NextResponse.json({ error: 'User address required' }, { status: 400 });
    }

    const monthYear = new Date().toISOString().slice(0, 7);
    const client = await pool.connect();

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

      // Get user's total XP for the month
      const xpResult = await client.query(
        'SELECT COALESCE(SUM(xp_earned), 0) as total_xp FROM daily_rewards WHERE user_id = $1 AND reward_date >= DATE_TRUNC(\'month\', CURRENT_DATE)',
        [userId]
      );
      const totalXp = xpResult.rows[0].total_xp;

      // Upsert leaderboard entry
      await client.query(`
        INSERT INTO monthly_leaderboard 
        (user_id, month_year, total_xp_earned, quests_completed, challenges_completed, 
         current_streak, transactions_count, social_interactions, governance_votes, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (user_id, month_year) 
        DO UPDATE SET 
          total_xp_earned = COALESCE($3, monthly_leaderboard.total_xp_earned),
          quests_completed = COALESCE($4, monthly_leaderboard.quests_completed),
          challenges_completed = COALESCE($5, monthly_leaderboard.challenges_completed),
          current_streak = COALESCE($6, monthly_leaderboard.current_streak),
          transactions_count = COALESCE($7, monthly_leaderboard.transactions_count),
          social_interactions = COALESCE($8, monthly_leaderboard.social_interactions),
          governance_votes = COALESCE($9, monthly_leaderboard.governance_votes),
          updated_at = NOW()
      `, [
        userId,
        monthYear,
        totalXp,
        questsCompleted,
        challengesCompleted,
        currentStreak,
        transactionsCount,
        socialInteractions,
        governanceVotes,
      ]);

      // Calculate activity score
      await client.query(
        'UPDATE monthly_leaderboard SET activity_score = calculate_activity_score($1, $2) WHERE user_id = $1 AND month_year = $2',
        [userId, monthYear]
      );

      await client.query('COMMIT');

      return NextResponse.json({ success: true });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating monthly leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to update monthly leaderboard' },
      { status: 500 }
    );
  }
}
