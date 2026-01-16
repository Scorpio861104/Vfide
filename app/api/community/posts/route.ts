import { NextRequest, NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db';

/**
 * Community Posts API - PostgreSQL Database
 * GET - Retrieve community posts from database
 * POST - Create a new post in database
 */

interface PostRow {
  id: number;
  author_id: number;
  wallet_address: string;
  username: string | null;
  avatar_url: string | null;
  proof_score: number;
  content: string;
  media_urls: string[] | null;
  likes: number;
  comments: number;
  reposts: number;
  tips: string;
  tags: string[] | null;
  is_pinned: boolean;
  is_verified: boolean;
  created_at: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const tag = searchParams.get('tag');
    const authorId = searchParams.get('authorId');
    const offset = (page - 1) * limit;

    // Build dynamic query
    let queryText = `
      SELECT 
        p.id,
        p.author_id,
        u.wallet_address,
        COALESCE(u.username, CONCAT('User_', SUBSTRING(u.wallet_address, 1, 8))) as username,
        u.avatar_url,
        COALESCE(u.proof_score, 0) as proof_score,
        p.content,
        p.media_urls,
        p.likes,
        p.comments,
        p.reposts,
        p.tips,
        p.tags,
        p.is_pinned,
        p.is_verified,
        p.created_at
      FROM community_posts p
      JOIN users u ON p.author_id = u.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (authorId) {
      params.push(authorId.toLowerCase());
      queryText += ` AND LOWER(u.wallet_address) = $${paramIndex++}`;
    }

    if (tag) {
      params.push(tag);
      queryText += ` AND $${paramIndex++} = ANY(p.tags)`;
    }

    queryText += ` ORDER BY p.is_pinned DESC, p.created_at DESC`;
    
    params.push(limit);
    queryText += ` LIMIT $${paramIndex++}`;
    
    params.push(offset);
    queryText += ` OFFSET $${paramIndex}`;

    const result = await query<PostRow>(queryText, params);

    const posts = result.rows.map(row => ({
      id: `post_${row.id}`,
      authorId: row.wallet_address,
      authorName: row.username || `User_${row.wallet_address.substring(0, 8)}`,
      authorAvatar: row.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${row.wallet_address}`,
      authorProofScore: row.proof_score,
      content: row.content,
      mediaUrls: row.media_urls || [],
      likes: row.likes,
      comments: row.comments,
      reposts: row.reposts,
      tips: parseFloat(row.tips || '0'),
      tags: row.tags || [],
      isPinned: row.is_pinned,
      isVerified: row.is_verified,
      createdAt: row.created_at,
    }));

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM community_posts p JOIN users u ON p.author_id = u.id WHERE 1=1';
    const countParams: string[] = [];
    
    if (authorId) {
      countParams.push(authorId.toLowerCase());
      countQuery += ` AND LOWER(u.wallet_address) = $${countParams.length}`;
    }
    if (tag) {
      countParams.push(tag);
      countQuery += ` AND $${countParams.length} = ANY(p.tags)`;
    }

    const countResult = await query<{ count: string }>(countQuery, countParams);
    const countRow = countResult.rows[0];
    if (!countRow) {
      throw new Error('Failed to get post count');
    }
    const total = parseInt(countRow.count);

    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const client = await getClient();
  
  try {
    const body = await request.json();
    const { authorId, authorName, content, mediaUrls, tags } = body;

    if (!authorId || !content) {
      return NextResponse.json(
        { error: 'authorId and content are required' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Get or create user by wallet address
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

    // Insert the post
    const postResult = await client.query<{ id: number; created_at: string }>(
      `INSERT INTO community_posts (author_id, content, media_urls, tags)
       VALUES ($1, $2, $3, $4)
       RETURNING id, created_at`,
      [userId, content, mediaUrls || [], tags || []]
    );

    await client.query('COMMIT');

    const postRow = postResult.rows[0];
    if (!postRow) {
      throw new Error('Failed to insert post');
    }

    const newPost = {
      id: `post_${postRow.id}`,
      authorId,
      authorName: userInfo.username || `User_${authorId.substring(0, 8)}`,
      authorAvatar: userInfo.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${authorId}`,
      authorProofScore: userInfo.proof_score,
      content,
      mediaUrls: mediaUrls || [],
      likes: 0,
      comments: 0,
      reposts: 0,
      tips: 0,
      tags: tags || [],
      isPinned: false,
      isVerified: false,
      createdAt: postRow.created_at,
    };

    return NextResponse.json({ post: newPost }, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
