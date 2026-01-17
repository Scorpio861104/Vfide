import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { validateQueryParams, validateAddress, checkRateLimit } from '@/lib/api-validation';
import { requireAuth } from '@/lib/auth-middleware';
import { apiLogger } from '@/lib/logger.service';

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
  try {
    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = checkRateLimit(`activities:${clientId}`, { maxRequests: 60, windowMs: 60000 });
    if (!rateLimit.success) {
      return rateLimit.errorResponse;
    }

    const searchParams = request.nextUrl.searchParams;
    const userAddress = searchParams.get('userAddress');
    const activityType = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Validate address if provided
    if (userAddress) {
      const addressValidation = validateAddress(userAddress);
      if (!addressValidation.valid) {
        return addressValidation.errorResponse;
      }
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
    const params: any[] = [];
    let paramCount = 1;

    if (userAddress) {
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
    const countParams: any[] = [];
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

    return NextResponse.json({
      activities: result.rows,
      total: parseInt(countResult.rows[0]?.count || '0'),
      limit,
      offset,
    });
  } catch (error) {
    apiLogger.error('Failed to fetch activities', { error });
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
  try {
    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = checkRateLimit(`activities:post:${clientId}`, { maxRequests: 20, windowMs: 60000 });
    if (!rateLimit.success) {
      return rateLimit.errorResponse;
    }

    // Authentication required
    const auth = await requireAuth(request);
    if (!auth.authenticated) {
      return auth.errorResponse;
    }

    const body = await request.json();
    const { userAddress, activityType, title, description, data } = body;

    if (!userAddress || !activityType || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: userAddress, activityType, title' },
        { status: 400 }
      );
    }

    // Validate address
    const addressValidation = validateAddress(userAddress);
    if (!addressValidation.valid) {
      return addressValidation.errorResponse;
    }

    // Verify ownership
    if (auth.user?.address.toLowerCase() !== userAddress.toLowerCase()) {
      return NextResponse.json(
        { error: 'Cannot create activity for another user' },
        { status: 403 }
      );
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
        { error: 'User ID not found' },
        { status: 500 }
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
    apiLogger.error('Failed to create activity', { error });
    return NextResponse.json(
      { error: 'Failed to create activity' },
      { status: 500 }
    );
  }
}
