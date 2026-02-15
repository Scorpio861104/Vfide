import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { requireAuth } from '@/lib/auth/middleware';
import { isAddress } from 'viem';

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

interface PostRow {
  id: number;
  activity_type: string;
  title: string | null;
  description: string | null;
  data: unknown;
  created_at: string;
  wallet_address: string;
  username: string | null;
  avatar_url: string | null;
  proof_score: number | null;
  is_verified: boolean | null;
}

const toPost = (row: PostRow) => {
  const data: Record<string, unknown> =
    row.data && typeof row.data === 'object' && !Array.isArray(row.data)
      ? (row.data as Record<string, unknown>)
      : {};

  return {
    id: `post-${row.id}`,
    author: {
      address: row.wallet_address,
      name: row.username ?? row.wallet_address,
      avatar: row.avatar_url ?? '👤',
      verified: Boolean(row.is_verified),
      proofScore: row.proof_score ?? 0,
    },
    content: typeof data.content === 'string' ? data.content : row.description ?? '',
    media: Array.isArray(data.media) ? data.media : undefined,
    timestamp: new Date(row.created_at).getTime(),
    likes: Number(data.likes ?? 0),
    comments: Number(data.comments ?? 0),
    shares: Number(data.shares ?? 0),
    views: Number(data.views ?? 0),
    liked: Boolean(data.liked ?? false),
    bookmarked: Boolean(data.bookmarked ?? false),
    isFollowing: Boolean(data.isFollowing ?? false),
    tags: Array.isArray(data.tags) ? data.tags : undefined,
  };
};

export async function GET(request: NextRequest) {
  const rateLimit = await withRateLimit(request, 'read');
  if (rateLimit) return rateLimit;

  try {
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10), 1), MAX_LIMIT) : DEFAULT_LIMIT;
    const offset = offsetParam ? Math.max(parseInt(offsetParam, 10), 0) : 0;

    const result = await query<PostRow>(
      `SELECT a.id, a.activity_type, a.title, a.description, a.data, a.created_at,
              u.wallet_address, u.username, u.avatar_url, u.proof_score, u.is_verified
       FROM activities a
       JOIN users u ON a.user_id = u.id
       WHERE a.activity_type IN ('social_post', 'post', 'community_post')
       ORDER BY a.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return NextResponse.json({
      posts: result.rows.map(toPost),
      limit,
      offset,
    });
  } catch (error) {
    console.error('[Community Posts GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch community posts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const rateLimit = await withRateLimit(request, 'write');
  if (rateLimit) return rateLimit;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { content, author, media, tags } = body as {
      content?: string;
      author?: string;
      media?: Array<{ type: 'image' | 'video'; url: string }>;
      tags?: string[];
    };

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    if (!author || !isAddress(author)) {
      return NextResponse.json({ error: 'Author address required' }, { status: 400 });
    }

    if (authResult.user.address.toLowerCase() !== author.toLowerCase()) {
      return NextResponse.json({ error: 'You can only post as yourself' }, { status: 403 });
    }

    const userResult = await query<{ id: number }>(
      'SELECT id FROM users WHERE wallet_address = $1',
      [author.toLowerCase()]
    );

    const userId = userResult.rows[0]?.id;
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const payload = {
      content,
      media: Array.isArray(media) ? media : undefined,
      tags: Array.isArray(tags) ? tags : undefined,
      likes: 0,
      comments: 0,
      shares: 0,
      views: 0,
    };

    const insertResult = await query<PostRow>(
      `INSERT INTO activities (user_id, activity_type, title, description, data)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, activity_type, title, description, data, created_at`,
      [
        userId,
        'social_post',
        'Community Post',
        content.slice(0, 500),
        JSON.stringify(payload),
      ]
    );

    const postRow = insertResult.rows[0];
    if (!postRow) {
      return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
    }

    const userMeta = await query<Pick<PostRow, 'wallet_address' | 'username' | 'avatar_url' | 'proof_score' | 'is_verified'>>(
      `SELECT wallet_address, username, avatar_url, proof_score, is_verified
       FROM users WHERE id = $1`,
      [userId]
    );

    const mergedRow: PostRow = {
      ...postRow,
      wallet_address: userMeta.rows[0]?.wallet_address ?? author.toLowerCase(),
      username: userMeta.rows[0]?.username ?? null,
      avatar_url: userMeta.rows[0]?.avatar_url ?? null,
      proof_score: userMeta.rows[0]?.proof_score ?? 0,
      is_verified: userMeta.rows[0]?.is_verified ?? false,
    } as PostRow;

    return NextResponse.json({
      success: true,
      post: toPost(mergedRow),
    }, { status: 201 });
  } catch (error) {
    console.error('[Community Posts POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
