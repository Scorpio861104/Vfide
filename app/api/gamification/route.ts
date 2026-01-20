import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { validateBody, awardXpSchema } from '@/lib/auth/validation';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('userAddress');

    if (!userAddress) {
      return NextResponse.json(
        { error: 'User address is required' },
        { status: 400 }
      );
    }

    // Get user gamification data with achievements
    const result = await query(
      `SELECT g.*, 
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', a.id,
                    'name', a.name,
                    'description', a.description,
                    'icon', a.icon,
                    'earnedAt', ua.earned_at
                  ) ORDER BY ua.earned_at DESC
                ) FILTER (WHERE a.id IS NOT NULL), '[]'
              ) as achievements
       FROM user_gamification g
       JOIN users u ON g.user_id = u.id
       LEFT JOIN user_achievements ua ON g.user_id = ua.user_id
       LEFT JOIN achievements a ON ua.achievement_id = a.id
       WHERE u.wallet_address = $1
       GROUP BY g.user_id, g.xp, g.level, g.streak, g.last_active`,
      [userAddress.toLowerCase()]
    );

    let userData;
    if (result.rows.length === 0) {
      // Create default entry
      const insertResult = await query(
        `INSERT INTO user_gamification (user_id, xp, level, streak, last_active)
         SELECT id, 0, 1, 0, NOW()
         FROM users
         WHERE wallet_address = $1
         RETURNING *`,
        [userAddress.toLowerCase()]
      );
      userData = insertResult.rows[0] || {
        xp: 0,
        level: 1,
        streak: 0,
        last_active: new Date(),
        achievements: [],
      };
    } else {
      userData = result.rows[0];
    }

    if (!userData) {
      return NextResponse.json(
        { error: 'User data not found' },
        { status: 404 }
      );
    }

    // Calculate progress to next level
    const xpForNextLevel = Math.pow(userData.level, 2) * 100;
    const xpProgress = userData.xp - (Math.pow(userData.level - 1, 2) * 100);

    return NextResponse.json({
      ...userData,
      xpForNextLevel,
      xpProgress,
    });
  } catch (error) {
    console.error('[Gamification GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gamification data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  // Require admin access - only admins can award XP
  const authResult = requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    // Validate request body
    const validation = await validateBody(request, awardXpSchema);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.details },
        { status: 400 }
      );
    }

    const { userAddress, xpAmount, reason } = validation.data;

    if (!userAddress || !xpAmount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update XP and calculate new level
    const result = await query(
      `UPDATE user_gamification g
       SET xp = xp + $2,
           level = FLOOR(SQRT((xp + $2) / 100.0)) + 1,
           last_active = NOW()
       FROM users u
       WHERE g.user_id = u.id AND u.wallet_address = $1
       RETURNING g.*, (FLOOR(SQRT((xp + $2) / 100.0)) + 1) > g.level as leveled_up`,
      [userAddress.toLowerCase(), xpAmount]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = result.rows[0];
    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    const leveledUp = userData.leveled_up;

    return NextResponse.json({
      success: true,
      xpAwarded: xpAmount,
      reason,
      newXP: userData.xp,
      newLevel: userData.level,
      leveledUp,
      ...userData,
    });
  } catch (error) {
    console.error('[Gamification POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to award XP' },
      { status: 500 }
    );
  }
}
