import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, requireAdmin, requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { validateBody, awardBadgeSchema } from '@/lib/auth/validation';

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{3,40}$/;

function isAddressLike(value: string): boolean {
  return ADDRESS_LIKE_REGEX.test(value.trim());
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
      message.includes('econnrefused') ||
      message.includes('database query failed') ||
      message.includes('connect') ||
      message.includes('connection terminated') ||
      message.includes('timeout expired')
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

interface Badge {
  id: number;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  requirements: Record<string, unknown>;
  created_at: string;
}

interface UserBadge {
  id: number;
  user_id: number;
  badge_id: number;
  earned_at: string;
  badge_name?: string;
  badge_description?: string;
  badge_icon?: string;
  badge_rarity?: string;
}

/**
 * GET /api/badges?userAddress=0x...
 * Get all badges or user's earned badges
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userAddressParam = searchParams.get('userAddress');

    if (userAddressParam) {
      const targetAddress = userAddressParam.trim().toLowerCase();
      if (!isAddressLike(targetAddress)) {
        return NextResponse.json(
          { error: 'Invalid userAddress format' },
          { status: 400 }
        );
      }

      const authResult = await requireAuth(request);
      if (authResult instanceof NextResponse) {
        return authResult;
      }

      const requesterAddress = typeof authResult.user?.address === 'string'
        ? authResult.user.address.trim().toLowerCase()
        : '';
      if (!requesterAddress || !isAddressLike(requesterAddress)) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const canRead = requesterAddress === targetAddress || isAdmin(authResult.user);
      if (!canRead) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }

      // Get user's earned badges
      const result = await query<UserBadge>(
        `SELECT 
          ub.*,
          b.name as badge_name,
          b.description as badge_description,
          b.icon as badge_icon,
          b.rarity as badge_rarity
         FROM user_badges ub
         JOIN badges b ON ub.badge_id = b.id
         JOIN users u ON ub.user_id = u.id
         WHERE u.wallet_address = $1
         ORDER BY ub.earned_at DESC`,
        [targetAddress]
      );

      return NextResponse.json({
        badges: result.rows,
        count: result.rows.length,
      });
    } else {
      // Get all available badges
      const result = await query<Badge>(
        'SELECT * FROM badges ORDER BY rarity, name',
        []
      );

      return NextResponse.json({
        badges: result.rows,
        count: result.rows.length,
      });
    }
  } catch (error) {
    console.error('[Badges GET API] Error:', error);

    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json({
        badges: [],
        count: 0,
        degraded: true,
      });
    }

    return NextResponse.json(
      { error: 'Failed to fetch badges' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/badges
 * Award a badge to a user (admin only)
 */
export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  // Require admin access
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    // Validate request body
    const validation = await validateBody(request, awardBadgeSchema);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.details },
        { status: 400 }
      );
    }

    const { userAddress, badgeType: badgeId } = validation.data;

    // Get user ID
    const userResult = await query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [userAddress.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = userResult.rows[0]?.id;
    if (!userId) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if badge exists
    const badgeResult = await query(
      'SELECT * FROM badges WHERE id = $1',
      [badgeId]
    );

    if (badgeResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Badge not found' },
        { status: 404 }
      );
    }

    // Check if user already has this badge
    const existingResult = await query(
      'SELECT * FROM user_badges WHERE user_id = $1 AND badge_id = $2',
      [userId, badgeId]
    );

    if (existingResult.rows.length > 0) {
      return NextResponse.json(
        { error: 'User already has this badge' },
        { status: 400 }
      );
    }

    // Award badge
    const result = await query<UserBadge>(
      `INSERT INTO user_badges (user_id, badge_id)
       VALUES ($1, $2)
       RETURNING *`,
      [userId, badgeId]
    );

    // Create notification
    const badge = badgeResult.rows[0];
    if (badge) {
      await query(
        `INSERT INTO notifications (user_id, type, title, message, data)
         VALUES ($1, 'badge_earned', 'New Badge Earned!', $2, $3)`,
        [
          userId,
          `You earned the "${badge.name}" badge!`,
          JSON.stringify({ badgeId, badgeName: badge.name })
        ]
      );
    }

    return NextResponse.json({
      success: true,
      userBadge: result.rows[0],
    }, { status: 201 });
  } catch (error) {
    console.error('[Badges POST API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to award badge' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/badges?userAddress=0x...&badgeId=123
 * Remove a badge from a user (admin only)
 */
export async function DELETE(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  // Require admin access
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const userAddress = searchParams.get('userAddress');
    const badgeId = searchParams.get('badgeId');

    if (!userAddress || !badgeId) {
      return NextResponse.json(
        { error: 'Missing required fields: userAddress, badgeId' },
        { status: 400 }
      );
    }

    const normalizedUserAddress = userAddress.trim().toLowerCase();
    if (!isAddressLike(normalizedUserAddress)) {
      return NextResponse.json(
        { error: 'Invalid userAddress format' },
        { status: 400 }
      );
    }

    const parsedBadgeId = Number.parseInt(badgeId, 10);
    if (!Number.isInteger(parsedBadgeId) || parsedBadgeId <= 0) {
      return NextResponse.json(
        { error: 'Invalid badgeId format' },
        { status: 400 }
      );
    }

    // Get user ID
    const userResult = await query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [normalizedUserAddress]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = userResult.rows[0]?.id;
    if (!userId) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Remove badge
    const result = await query(
      'DELETE FROM user_badges WHERE user_id = $1 AND badge_id = $2',
      [userId, parsedBadgeId]
    );

    return NextResponse.json({
      success: true,
      message: 'Badge removed',
      deleted: result.rowCount || 0,
    });
  } catch (error) {
    console.error('[Badges DELETE API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to remove badge' },
      { status: 500 }
    );
  }
}
