import { NextRequest, NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db';

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
  try {
    const { searchParams } = new URL(request.url);
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
        const viewsResult = await query<{ story_id: number }>(
          `SELECT story_id FROM story_views WHERE viewer_id = $1`,
          [viewerResult.rows[0].id]
        );
        viewedStoryIds = new Set(viewsResult.rows.map(r => r.story_id));
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
      acc[story.authorId].stories.push(story);
      if (!story.isViewed) {
        acc[story.authorId].hasUnviewed = true;
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
    console.error('Error fetching stories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
      userId = insertUser.rows[0].id;
    } else {
      userId = userResult.rows[0].id;
      userInfo = {
        username: userResult.rows[0].username || authorName,
        avatar_url: userResult.rows[0].avatar_url,
        proof_score: userResult.rows[0].proof_score,
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

    const newStory = {
      id: `story_${storyResult.rows[0].id}`,
      authorId,
      authorName: userInfo.username || `User_${authorId.substring(0, 8)}`,
      authorAvatar: userInfo.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${authorId}`,
      authorProofScore: userInfo.proof_score,
      mediaUrl,
      mediaType: mediaType || 'image',
      caption,
      viewCount: 0,
      reactions: { fire: 0, heart: 0, rocket: 0, clap: 0 },
      createdAt: storyResult.rows[0].created_at,
      expiresAt: storyResult.rows[0].expires_at,
      isViewed: false,
    };

    return NextResponse.json({ story: newStory }, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating story:', error);
    return NextResponse.json(
      { error: 'Failed to create story' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
