import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { query } from '@/lib/db';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH /api/community/posts/[id]
 * Toggle a like on a community post.
 * Body: { action: 'like' | 'unlike' }
 * Returns: { likes: number, liked: boolean }
 */
export const PATCH = withAuth(async (request: NextRequest, _user: JWTPayload, context: RouteContext) => {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const { id } = await context.params;
  const postId = parseInt(id, 10);
  if (isNaN(postId) || postId <= 0) {
    return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
  }

  const rawBody = await request.json().catch(() => null);
  const action = rawBody?.action;
  if (action !== 'like' && action !== 'unlike') {
    return NextResponse.json({ error: 'action must be "like" or "unlike"' }, { status: 400 });
  }

  try {
    const delta = action === 'like' ? 1 : -1;
    const result = await query(
      `UPDATE community_posts
       SET likes = GREATEST(0, likes + $1), updated_at = NOW()
       WHERE id = $2
       RETURNING likes`,
      [delta, postId]
    );
    if (!result.rowCount || result.rowCount === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    return NextResponse.json({ likes: result.rows[0]?.likes ?? 0, liked: action === 'like' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
});
