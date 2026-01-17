import { NextRequest, NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db';
import { checkRateLimit, getClientIdentifier } from '@/lib/rateLimit';
import { validateQueryParams } from '@/lib/api-validation';
import { apiLogger } from '@/lib/logger.service';
import { requireAuth } from '@/lib/auth-middleware';

/**
 * Community Stories API - PostgreSQL Database
 * GET - Retrieve active stories (24-hour ephemeral content)
 * POST - Create a new story
 */

interface StoryRow {
  id: number;
  author_id: number;
  wallet_address: string;
  username: string | null;
  avatar_url: string | null;
  proof_score: number;
  media_url: string;
  media_type: string;
  caption: string | null;
  view_count: number;
  reactions_fire: number;
  reactions_heart: number;
  reactions_rocket: number;
  reactions_clap: number;
  created_at: string;
  expires_at: string;
}

export async function GET(request: NextRequest) {
  // Rate limiting
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`stories:${clientId}`, { windowMs: 60000, maxRequests: 60 });
  if (!rateLimit.success) {
    return rateLimit.errorResponse;
  }

  try {
    const { searchParams } = new URL(request.url);
    
    // Validate optional parameters
    const validation = validateQueryParams(searchParams, {
      authorId: { required: false, type: 'address' },
      viewerId: { required: false, type: 'address' }
    });
    if (!validation.valid) {
      return validation.errorResponse;
    }

    const authorId = searchParams.get('authorId');
    const viewerId = searchParams.get('viewerId'); // For tracking viewed status

    // Query active stories (not expired)
    let queryText = `
      SELECT 
        s.id,
        s.author_id,
        u.wallet_address,
        COALESCE(u.username, CONCAT('User_', SUBSTRING(u.wallet_address, 1, 8))) as username,
        u.avatar_url,
        COALESCE(u.proof_score, 0) as proof_score,
        s.media_url,
        s.media_type,
        s.caption,
        s.view_count,
        COALESCE(s.reactions_fire, 0) as reactions_fire,
        COALESCE(s.reactions_heart, 0) as reactions_heart,
        COALESCE(s.reactions_rocket, 0) as reactions_rocket,
        COALESCE(s.reactions_clap, 0) as reactions_clap,
        s.created_at,
        s.expires_at
      FROM stories s
      JOIN users u ON s.author_id = u.id
      WHERE s.expires_at > NOW()
    `;
    const params: string[] = [];
    let paramIndex = 1;

    if (authorId) {
      params.push(authorId.toLowerCase());
      queryText += ` AND LOWER(u.wallet_address) = $${paramIndex++}`;
    }

    queryText += ` ORDER BY s.created_at DESC`;

    const result = await query<StoryRow>(queryText, params);

    // Check which stories user has viewed
    let viewedStoryIds: Set<number> = new Set();
    if (viewerId) {
      const viewerResult = await query<{ id: number }>(
        `SELECT u.id FROM users WHERE LOWER(wallet_address) = $1`,
        [viewerId.toLowerCase()]
      );
      if (viewerResult.rows.length > 0) {
        const viewerRow = viewerResult.rows[0];
        if (viewerRow) {
          const viewsResult = await query<{ story_id: number }>(
            `SELECT story_id FROM story_views WHERE viewer_id = $1`,
            [viewerRow.id]
          );
          viewedStoryIds = new Set(viewsResult.rows.map(r => r.story_id));
        }
      }
    }

    const stories = result.rows.map(row => ({
      id: `story_${row.id}`,
      authorId: row.wallet_address,
      authorName: row.username || `User_${row.wallet_address.substring(0, 8)}`,
      authorAvatar: row.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${row.wallet_address}`,
      authorProofScore: row.proof_score,
      mediaUrl: row.media_url,
      mediaType: row.media_type as 'image' | 'video',
      caption: row.caption,
      viewCount: row.view_count,
      reactions: {
        fire: row.reactions_fire,
        heart: row.reactions_heart,
        rocket: row.reactions_rocket,
        clap: row.reactions_clap,
      },
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      isViewed: viewedStoryIds.has(row.id),
    }));

    // Group by author for story rings
    const groupedByAuthor = stories.reduce((acc, story) => {
      if (!acc[story.authorId]) {
        acc[story.authorId] = {
          authorId: story.authorId,
          authorName: story.authorName,
          authorAvatar: story.authorAvatar,
          authorProofScore: story.authorProofScore,
          stories: [],
          hasUnviewed: false,
        };
      }
      const authorStories = acc[story.authorId];
      if (authorStories) {
        authorStories.stories.push(story);
        if (!story.isViewed) {
          authorStories.hasUnviewed = true;
        }
      }
      return acc;
    }, {} as Record<string, {
      authorId: string;
      authorName: string;
      authorAvatar: string;
      authorProofScore: number;
      stories: typeof stories;
      hasUnviewed: boolean;
    }>);

    return NextResponse.json({
      stories,
      storyRings: Object.values(groupedByAuthor),
      total: stories.length,
    });
  } catch (error) {
    apiLogger.error('Error fetching stories', { error });
    return NextResponse.json(
      { error: 'Failed to fetch stories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Rate limiting - stricter for POST
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`stories-post:${clientId}`, { windowMs: 60000, maxRequests: 10 });
  if (!rateLimit.success) {
    return rateLimit.errorResponse;
  }

  // Require authentication
  const auth = await requireAuth(request);
  if (!auth.authenticated) {
    return auth.errorResponse;
  }

  const client = await getClient();

  try {
    const body = await request.json();
    const { authorId, authorName, mediaUrl, mediaType, caption } = body;

    if (!authorId || !mediaUrl) {
      return NextResponse.json(
        { error: 'authorId and mediaUrl are required' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Get or create user
    const userResult = await client.query<{ id: number; username: string | null; avatar_url: string | null; proof_score: number }>(
      'SELECT id, username, avatar_url, COALESCE(proof_score, 0) as proof_score FROM users WHERE LOWER(wallet_address) = $1',
      [authorId.toLowerCase()]
    );

    let userId: number;
    let userInfo = { username: authorName, avatar_url: null as string | null, proof_score: 0 };

    if (userResult.rows.length === 0) {
      const insertUser = await client.query<{ id: number }>(
        'INSERT INTO users (wallet_address, username) VALUES ($1, $2) RETURNING id',
        [authorId.toLowerCase(), authorName || null]
      );
      const insertedRow = insertUser.rows[0];
      if (!insertedRow) {
        throw new Error('Failed to insert user');
      }
      userId = insertedRow.id;
    } else {
      const userRow = userResult.rows[0];
      if (!userRow) {
        throw new Error('User row not found');
      }
      userId = userRow.id;
      userInfo = {
        username: userRow.username || authorName,
        avatar_url: userRow.avatar_url,
        proof_score: userRow.proof_score,
      };
    }

    // Insert story with 24-hour expiration
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const storyResult = await client.query<{ id: number; created_at: string; expires_at: string }>(
      `INSERT INTO stories (author_id, media_url, media_type, caption, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, created_at, expires_at`,
      [userId, mediaUrl, mediaType || 'image', caption || null, expiresAt]
    );

    await client.query('COMMIT');

    const storyRow = storyResult.rows[0];
    if (!storyRow) {
      throw new Error('Failed to insert story');
    }

    const newStory = {
      id: `story_${storyRow.id}`,
      authorId,
      authorName: userInfo.username || `User_${authorId.substring(0, 8)}`,
      authorAvatar: userInfo.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${authorId}`,
      authorProofScore: userInfo.proof_score,
      mediaUrl,
      mediaType: mediaType || 'image',
      caption,
      viewCount: 0,
      reactions: { fire: 0, heart: 0, rocket: 0, clap: 0 },
      createdAt: storyRow.created_at,
      expiresAt: storyRow.expires_at,
      isViewed: false,
    };

    return NextResponse.json({ story: newStory }, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    apiLogger.error('Error creating story', { error });
    return NextResponse.json(
      { error: 'Failed to create story' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function DELETE(request: NextRequest) {
  // Rate limiting
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`stories-delete:${clientId}`, { windowMs: 60000, maxRequests: 20 });
  if (!rateLimit.success) {
    return rateLimit.errorResponse;
  }

  // Require authentication
  const auth = await requireAuth(request);
  if (!auth.authenticated) {
    return auth.errorResponse;
  }

  const client = await getClient();
  
  try {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');
    const authorId = searchParams.get('authorId');

    if (!storyId || !authorId) {
      return NextResponse.json(
        { error: 'storyId and authorId are required' },
        { status: 400 }
      );
    }

    const numericId = parseInt(storyId.replace('story_', ''));

    await client.query('BEGIN');

    // Verify ownership
    const ownerCheck = await client.query<{ wallet_address: string }>(
      `SELECT u.wallet_address 
       FROM stories s 
       JOIN users u ON s.author_id = u.id 
       WHERE s.id = $1`,
      [numericId]
    );

    if (ownerCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    if (ownerCheck.rows[0].wallet_address.toLowerCase() !== authorId.toLowerCase()) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete story views first
    await client.query('DELETE FROM story_views WHERE story_id = $1', [numericId]);
    await client.query('DELETE FROM stories WHERE id = $1', [numericId]);

    await client.query('COMMIT');

    return NextResponse.json({ success: true, deleted: storyId });
  } catch (error) {
    await client.query('ROLLBACK');
    apiLogger.error('Error deleting story', { error });
    return NextResponse.json(
      { error: 'Failed to delete story' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
