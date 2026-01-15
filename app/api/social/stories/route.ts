import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rateLimit';
import { validateAddress, validateLimit, validateOffset, createErrorResponse } from '@/lib/inputValidation';

/**
 * GET /api/social/stories?userAddress=0x...&limit=50&offset=0
 * Get social stories (24-hour temporary posts)
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
          s.*,
          u.wallet_address as author_address,
          u.username as author_username,
          u.avatar_url as author_avatar,
          COUNT(DISTINCT sv.id) as view_count
        FROM social_stories s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN story_views sv ON s.id = sv.story_id
        WHERE s.created_at > NOW() - INTERVAL '24 hours'
      `;
      
      const params: (string | number)[] = [];
      let paramCount = 1;

      if (userAddress) {
        queryText += ` AND u.wallet_address = $${paramCount}`;
        params.push(validateAddress(userAddress));
        paramCount++;
      }

      queryText += ` 
        GROUP BY s.id, u.id
        ORDER BY s.created_at DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;
      params.push(limit, offset);

      const result = await client.query(queryText, params);

      return NextResponse.json({
        stories: result.rows,
        count: result.rows.length,
        limit,
        offset,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Stories GET API] Error:', error);
    return NextResponse.json(
      createErrorResponse(error as Error),
      { status: 500 }
    );
  }
}

/**
 * POST /api/social/stories
 * Create a new story (expires in 24 hours)
 */
export async function POST(request: NextRequest) {
  // Rate limiting: 10 requests per minute (stories are more resource-intensive)
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(clientId, { maxRequests: 10, windowMs: 60000 });
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  const client = await getClient();
  
  try {
    const body = await request.json();
    const { userAddress, mediaUrl, mediaType, caption } = body;

    // Validate inputs
    const validatedAddress = validateAddress(userAddress);
    
    if (!mediaUrl) {
      return NextResponse.json(
        createErrorResponse('Story media URL is required'),
        { status: 400 }
      );
    }

    if (!mediaType || !['image', 'video'].includes(mediaType)) {
      return NextResponse.json(
        createErrorResponse('Media type must be "image" or "video"'),
        { status: 400 }
      );
    }

    if (caption && caption.length > 500) {
      return NextResponse.json(
        createErrorResponse('Caption must not exceed 500 characters'),
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

    // Create story
    const storyResult = await client.query(
      `INSERT INTO social_stories (user_id, media_url, media_type, caption, created_at, expires_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '24 hours')
       RETURNING *`,
      [userId, mediaUrl, mediaType, caption || null]
    );

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      story: storyResult.rows[0],
    }, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Stories POST API] Error:', error);
    return NextResponse.json(
      createErrorResponse(error as Error),
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * DELETE /api/social/stories?storyId=123&userAddress=0x...
 * Delete a story (author only)
 */
export async function DELETE(request: NextRequest) {
  // Rate limiting: 30 requests per minute
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(clientId, { maxRequests: 30, windowMs: 60000 });
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  const client = await getClient();
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const storyId = searchParams.get('storyId');
    const userAddress = searchParams.get('userAddress');

    if (!storyId) {
      return NextResponse.json(
        createErrorResponse('Story ID is required'),
        { status: 400 }
      );
    }

    const validatedAddress = validateAddress(userAddress);

    await client.query('BEGIN');

    // Verify ownership and delete
    const result = await client.query(
      `DELETE FROM social_stories 
       WHERE id = $1 
       AND user_id = (SELECT id FROM users WHERE wallet_address = $2)
       RETURNING id`,
      [parseInt(storyId), validatedAddress]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        createErrorResponse('Story not found or unauthorized'),
        { status: 404 }
      );
    }

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      message: 'Story deleted successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Stories DELETE API] Error:', error);
    return NextResponse.json(
      createErrorResponse(error as Error),
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
