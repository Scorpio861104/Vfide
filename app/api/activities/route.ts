import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';

// Constants
const MAX_ACTIVITIES_LIMIT = 100;
const DEFAULT_ACTIVITIES_LIMIT = 50;

interface Activity {
  id: number;
  user_id: number;
  activity_type: string;
  title: string;
  description: string;
  data: Record<string, unknown>;
  created_at: string;
  user_address?: string;
  user_username?: string;
  user_avatar?: string;
}

/**
 * GET /api/activities?userAddress=0x...&type=vote&limit=50&offset=0
 * Get activity feed
 */
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;

  // Authentication - required to prevent unauthenticated access to user activity data
  // which includes wallet addresses, usernames, and activity metadata
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const searchParams = request.nextUrl.searchParams;
    const userAddress = searchParams.get('userAddress');
    const activityType = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || DEFAULT_ACTIVITIES_LIMIT.toString(), 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Validate parsed numbers - check for positive values and reasonable limits
    if (isNaN(limit) || isNaN(offset) || limit <= 0 || offset < 0 || limit > MAX_ACTIVITIES_LIMIT) {
      return NextResponse.json(
        { error: `Invalid limit or offset parameter. Limit must be 1-${MAX_ACTIVITIES_LIMIT}, offset must be >= 0` },
        { status: 400 }
      );
    }

    let queryText = `
      SELECT 
        a.*,
        u.wallet_address as user_address,
        u.username as user_username,
        u.avatar_url as user_avatar
      FROM activities a
      JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];
    let paramCount = 1;

    if (userAddress) {
      // API-08 Fix: Only allow querying own activities (IDOR prevention)
      if (authResult.user.address.toLowerCase() !== userAddress.toLowerCase()) {
        return NextResponse.json(
          { error: 'Cannot view other users\' activities' },
          { status: 403 }
        );
      }
      queryText += ` AND u.wallet_address = $${paramCount}`;
      params.push(userAddress.toLowerCase());
      paramCount++;
    }

    if (activityType) {
      queryText += ` AND a.activity_type = $${paramCount}`;
      params.push(activityType);
      paramCount++;
    }

    queryText += ` ORDER BY a.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await query<Activity>(queryText, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM activities a JOIN users u ON a.user_id = u.id WHERE 1=1';
    const countParams: (string | number)[] = [];
    let countParamCount = 1;

    if (userAddress) {
      countQuery += ` AND u.wallet_address = $${countParamCount}`;
      countParams.push(userAddress.toLowerCase());
      countParamCount++;
    }

    if (activityType) {
      countQuery += ` AND a.activity_type = $${countParamCount}`;
      countParams.push(activityType);
    }

    const countResult = await query<{ count: string }>(countQuery, countParams);

    const totalCount = parseInt(countResult.rows[0]?.count || '0', 10);
    if (isNaN(totalCount)) {
      return NextResponse.json(
        { error: 'Failed to get total count' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      activities: result.rows,
      total: totalCount,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[Activities GET API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/activities
 * Create a new activity entry
 */
export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'write');
  if (rateLimit) return rateLimit;

  // Authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const { userAddress, activityType, title, description, data } = body;

    if (!userAddress || !activityType || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: userAddress, activityType, title' },
        { status: 400 }
      );
    }

    if (authResult.user.address.toLowerCase() !== userAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

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

    // Insert activity
    const result = await query<Activity>(
      `INSERT INTO activities (user_id, activity_type, title, description, data)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, activityType, title, description || '', data ? JSON.stringify(data) : null]
    );

    return NextResponse.json({
      success: true,
      activity: result.rows[0],
    }, { status: 201 });
  } catch (error) {
    console.error('[Activities POST API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create activity' },
      { status: 500 }
    );
  }
}
