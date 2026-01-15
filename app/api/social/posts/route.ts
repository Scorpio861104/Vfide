import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rateLimit';
import { validateAddress, validateLimit, validateOffset, createErrorResponse } from '@/lib/inputValidation';

/**
 * GET /api/social/posts?userAddress=0x...&limit=50&offset=0
 * Get social posts
 */
export async function GET(request: NextRequest) {
  // Rate limiting: 60 requests per minute
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(clientId, { maxRequests: 60, windowMs: 60000 });
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const userAddress = searchParams.get('userAddress');
    const limit = validateLimit(searchParams.get('limit'));
    const offset = validateOffset(searchParams.get('offset'));

    const client = await getClient();

    try {
      let queryText = `
        SELECT 
          p.*,
          u.wallet_address as author_address,
          u.username as author_username,
          u.avatar_url as author_avatar,
          COUNT(DISTINCT pl.id) as like_count,
          COUNT(DISTINCT pc.id) as comment_count
        FROM social_posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN post_likes pl ON p.id = pl.post_id
        LEFT JOIN post_comments pc ON p.id = pc.post_id
      `;
      
      const params: (string | number)[] = [];
      let paramCount = 1;

      if (userAddress) {
        queryText += ` WHERE u.wallet_address = $${paramCount}`;
        params.push(validateAddress(userAddress));
        paramCount++;
      }

      queryText += ` 
        GROUP BY p.id, u.id
        ORDER BY p.created_at DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;
      params.push(limit, offset);

      const result = await client.query(queryText, params);

      return NextResponse.json({
        posts: result.rows,
        count: result.rows.length,
        limit,
        offset,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Posts GET API] Error:', error);
    return NextResponse.json(
      createErrorResponse(error as Error),
      { status: 500 }
    );
  }
}

/**
 * POST /api/social/posts
 * Create a new post
 */
export async function POST(request: NextRequest) {
  // Rate limiting: 20 requests per minute (prevent spam)
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(clientId, { maxRequests: 20, windowMs: 60000 });
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  const client = await getClient();
  
  try {
    const body = await request.json();
    const { userAddress, content, mediaUrl, mediaType } = body;

    // Validate inputs
    const validatedAddress = validateAddress(userAddress);
    
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        createErrorResponse('Post content is required'),
        { status: 400 }
      );
    }

    if (content.length > 5000) {
      return NextResponse.json(
        createErrorResponse('Post content must not exceed 5000 characters'),
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Get user ID
    const userResult = await client.query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [validatedAddress]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        createErrorResponse('User not found'),
        { status: 404 }
      );
    }

    const userId = userResult.rows[0].id;

    // Create post
    const postResult = await client.query(
      `INSERT INTO social_posts (user_id, content, media_url, media_type, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [userId, content.trim(), mediaUrl || null, mediaType || null]
    );

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      post: postResult.rows[0],
    }, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Posts POST API] Error:', error);
    return NextResponse.json(
      createErrorResponse(error as Error),
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
