import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { requireAuth } from '@/lib/auth/middleware';
import { logger } from '@/lib/logger';

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{3,64}$/;
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase();
}

function isAddressLike(value: string): boolean {
  return ADDRESS_PATTERN.test(value);
}

function parseStrictIntegerParam(value: string | null): number | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return Number.parseInt(trimmed, 10);
}

function isDatabaseUnavailableError(error: unknown): boolean {
  const stack: unknown[] = [error];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    const asRecord = typeof current === 'object' ? current as Record<string, unknown> : null;
    const message = current instanceof Error
      ? current.message.toLowerCase()
      : String(current).toLowerCase();
    const code = typeof asRecord?.code === 'string' ? asRecord.code.toLowerCase() : '';

    if (
      code === 'econnrefused' ||
      code === '57p01' ||
      code === '28p01' ||
      code === '42p01' ||
      code === '42703' ||
      message.includes('econnrefused') ||
      message.includes('database query failed') ||
      message.includes('password authentication failed') ||
      message.includes('connect') ||
      message.includes('connection terminated') ||
      message.includes('timeout expired') ||
      message.includes('does not exist')
    ) {
      return true;
    }

    const cause = asRecord?.cause;
    if (cause) stack.push(cause);

    const errors = asRecord?.errors;
    if (Array.isArray(errors)) {
      for (const nested of errors) stack.push(nested);
    }
  }

  return false;
}

function toOptionalNonNegativeInteger(value: unknown): number | null | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (!Number.isInteger(value) || Number(value) < 0) {
    return null;
  }

  return Number(value);
}

/**
 * GET /api/leaderboard/monthly
 * Fetch monthly leaderboard with rankings and prize pool info
 */
export async function GET(request: NextRequest) {
  // Rate limiting for read operations
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const searchParams = request.nextUrl.searchParams;
    const rawMonthYear = searchParams.get('month');
    const monthYear = rawMonthYear?.trim() || new Date().toISOString().slice(0, 7); // Default to current month
    const rawUserAddress = searchParams.get('userAddress');
    const userAddress = typeof rawUserAddress === 'string' && rawUserAddress.trim().length > 0
      ? normalizeAddress(rawUserAddress)
      : null;
    const parsedLimit = parseStrictIntegerParam(searchParams.get('limit'));
    if (searchParams.get('limit') !== null && parsedLimit === null) {
      return NextResponse.json(
        { error: 'Invalid limit parameter (must be >= 1)' },
        { status: 400 }
      );
    }

    const limit = Math.min(parsedLimit ?? 50, 100); // Cap at 100, default to 50

    // Validate parsed number - require at least 1 for leaderboard (0 would be meaningless)
    if (limit < 1) {
      return NextResponse.json(
        { error: 'Invalid limit parameter (must be >= 1)' },
        { status: 400 }
      );
    }

    if (!MONTH_PATTERN.test(monthYear)) {
      return NextResponse.json(
        { error: 'Invalid month parameter. Expected YYYY-MM.' },
        { status: 400 }
      );
    }

    if (userAddress && !isAddressLike(userAddress)) {
      return NextResponse.json(
        { error: 'Invalid userAddress format' },
        { status: 400 }
      );
    }

    const client = await getClient();

    try {
      // Parallel execution of prize pool and leaderboard queries for better performance
      const [poolResult, leaderboardResult] = await Promise.all([
        // Get prize pool info
        client.query(`
          SELECT total_pool, distributed_amount, distribution_complete, distribution_date
          FROM monthly_prize_pool
          WHERE month_year = $1
        `, [monthYear]),
        
        // Get leaderboard with optimized query - only select necessary columns
        client.query(`
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
          INNER JOIN users u ON ml.user_id = u.id
          LEFT JOIN prize_tiers pt ON ml.final_rank >= pt.rank_start AND ml.final_rank <= pt.rank_end
          WHERE ml.month_year = $1
          ORDER BY ml.activity_score DESC, ml.updated_at ASC
          LIMIT $2
        `, [monthYear, limit])
      ]);

      const prizePool = poolResult.rows[0] || {
        total_pool: '0',
        distributed_amount: '0',
        distribution_complete: false,
        distribution_date: null,
      };

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

      // Get user's position if userAddress provided - check in leaderboard first
      let userPosition = null;
      if (userAddress) {
        // First check if user is in the top results we already fetched
        const userInLeaderboard = leaderboard.find(
            entry => entry.walletAddress.toLowerCase() === userAddress
        );
        
        if (userInLeaderboard) {
          // User is already in the top results, no need for another query
          userPosition = {
            rank: userInLeaderboard.rank,
            finalRank: userInLeaderboard.finalRank,
            activityScore: userInLeaderboard.activityScore,
            tier: userInLeaderboard.tier,
            prizeAmount: userInLeaderboard.prizeAmount,
            prizeClaimed: userInLeaderboard.prizeClaimed,
            stats: userInLeaderboard.stats,
          };
        } else {
          // User is not in top results, fetch their specific position
          const userResult = await client.query(`
            SELECT 
              ml.*,
              pt.tier_name,
              (
                SELECT COUNT(*) + 1 
                FROM monthly_leaderboard ml2 
                WHERE ml2.month_year = $1 
                  AND (ml2.activity_score > ml.activity_score 
                    OR (ml2.activity_score = ml.activity_score AND ml2.updated_at < ml.updated_at))
              ) as current_rank
            FROM monthly_leaderboard ml
            INNER JOIN users u ON ml.user_id = u.id
            LEFT JOIN prize_tiers pt ON ml.final_rank >= pt.rank_start AND ml.final_rank <= pt.rank_end
            WHERE ml.month_year = $1 AND u.wallet_address = $2
          `, [monthYear, userAddress]);

          if (userResult.rows.length > 0) {
            const user = userResult.rows[0];
            const currentRank = parseInt(user.current_rank, 10);
            
            if (isNaN(currentRank) || !isFinite(currentRank)) {
              throw new Error('Invalid rank data');
            }
            
            userPosition = {
              rank: currentRank,
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
    logger.error('Error fetching monthly leaderboard:', error);

    // Graceful degradation for local/offline environments where DB is unavailable.
    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json({
        monthYear: new Date().toISOString().slice(0, 7),
        prizePool: {
          total: '0',
          distributed: '0',
          distributionComplete: false,
          distributionDate: null,
        },
        leaderboard: [],
        userPosition: null,
        degraded: true,
      });
    }

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
  // Rate limiting for write operations
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  // Require authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!isRecord(body)) {
      return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 });
    }

    const {
      userAddress: rawUserAddress,
      questsCompleted: rawQuestsCompleted,
      challengesCompleted: rawChallengesCompleted,
      currentStreak: rawCurrentStreak,
      transactionsCount: rawTransactionsCount,
      socialInteractions: rawSocialInteractions,
      governanceVotes: rawGovernanceVotes,
    } = body;

    if (typeof rawUserAddress !== 'string' || rawUserAddress.trim().length === 0) {
      return NextResponse.json({ error: 'User address required' }, { status: 400 });
    }

    const userAddress = normalizeAddress(rawUserAddress);
    if (!isAddressLike(userAddress)) {
      return NextResponse.json({ error: 'Invalid user address format' }, { status: 400 });
    }

    const questsCompleted = toOptionalNonNegativeInteger(rawQuestsCompleted);
    const challengesCompleted = toOptionalNonNegativeInteger(rawChallengesCompleted);
    const currentStreak = toOptionalNonNegativeInteger(rawCurrentStreak);
    const transactionsCount = toOptionalNonNegativeInteger(rawTransactionsCount);
    const socialInteractions = toOptionalNonNegativeInteger(rawSocialInteractions);
    const governanceVotes = toOptionalNonNegativeInteger(rawGovernanceVotes);

    if (
      questsCompleted === null ||
      challengesCompleted === null ||
      currentStreak === null ||
      transactionsCount === null ||
      socialInteractions === null ||
      governanceVotes === null
    ) {
      return NextResponse.json(
        { error: 'Activity counters must be non-negative integers when provided' },
        { status: 400 }
      );
    }

    if (!authResult.user?.address || !isAddressLike(authResult.user.address)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Users may only update their own leaderboard stats
    if (normalizeAddress(authResult.user.address) !== userAddress) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const monthYear = new Date().toISOString().slice(0, 7);
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
    logger.error('Error updating monthly leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to update monthly leaderboard' },
      { status: 500 }
    );
  }
}
