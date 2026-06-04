import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { query } from '@/lib/db';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

type RouteContext = { params: Promise<{ id: string }> };

const ADDRESS_LIKE_REGEX = /^0x[a-f0-9]{40}$/;

/**
 * PATCH /api/community/posts/[id]
 * Toggle the authenticated user's like on a community post.
 * Body: { action: 'like' | 'unlike' }
 * Returns: { likes: number, liked: boolean }
 *
 * Likes are tracked per user in `post_likes` (UNIQUE(post_id, user_id)), so the
 * action is idempotent: replaying 'like' or 'unlike' cannot inflate or deflate
 * the count. The cached community_posts.likes counter is recomputed from the
 * authoritative per-user rows on every change.
 */
export const PATCH = withAuth(async (request: NextRequest, user: JWTPayload, context: RouteContext) => {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  // A like belongs to the caller; resolve and scope to the authenticated wallet.
  const authAddress = typeof user?.address === 'string' ? user.address.trim().toLowerCase() : '';
  if (!ADDRESS_LIKE_REGEX.test(authAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
    // Resolve the caller's user id (the like row is keyed to this id, never to
    // a client-supplied value).
    const userRes = await query<{ id: number }>(
      'SELECT id FROM users WHERE wallet_address = $1',
      [authAddress]
    );
    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 403 });
    }
    const userId = userRes.rows[0]!.id;

    // Ensure the post exists (clean 404, distinct from a no-op like/unlike).
    const postRes = await query<{ id: number }>(
      'SELECT id FROM community_posts WHERE id = $1',
      [postId]
    );
    if (postRes.rows.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Idempotent per-user like/unlike. The UNIQUE(post_id, user_id) PK makes a
    // repeat 'like' a no-op and an 'unlike' of a never-liked post a no-op.
    if (action === 'like') {
      await query(
        `INSERT INTO post_likes (post_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT (post_id, user_id) DO NOTHING`,
        [postId, userId]
      );
    } else {
      await query(
        'DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2',
        [postId, userId]
      );
    }

    // Recompute the cached counter from the authoritative per-user rows. A
    // single UPDATE with a COUNT subquery is race-safe and self-healing (no
    // read-modify-write drift).
    const recount = await query<{ likes: number }>(
      `UPDATE community_posts
         SET likes = (SELECT COUNT(*) FROM post_likes WHERE post_id = $1),
             updated_at = NOW()
       WHERE id = $1
       RETURNING likes`,
      [postId]
    );

    const likes = recount.rows[0]?.likes ?? 0;
    return NextResponse.json({ likes: Number(likes), liked: action === 'like' });
  } catch (error) {
    logger.error('[Community post like] Error:', error);
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
});
