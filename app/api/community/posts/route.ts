import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod4';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

const createPostSchema = z.object({
  authorAddress: z.string().trim().regex(ADDRESS_REGEX).optional(),
  content: z.string().trim().min(1).max(5000),
  imageUrl: z.string().url().optional().or(z.literal('')),
  type: z.enum(['post', 'story']).optional(),
});

export async function GET() {
  try {
    const result = await query(
      `SELECT p.*, u.name as author_name, u.proof_score as author_score
       FROM community_posts p LEFT JOIN users u ON p.author_address = u.address
       ORDER BY p.created_at DESC LIMIT 50`
    );
    return NextResponse.json({ posts: result.rows });
  } catch (error) {
    logger.error('[Community Posts GET] Error:', error);
    return NextResponse.json({ posts: [] });
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const rawBody = await request.json().catch(() => null);
    const parsed = createPostSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { authorAddress, content, imageUrl } = parsed.data;
    const authenticatedAddress = authResult.user.address.toLowerCase();

    if (authorAddress && authorAddress.toLowerCase() !== authenticatedAddress) {
      return NextResponse.json({ error: 'You can only post as your authenticated wallet' }, { status: 403 });
    }

    const result = await query(
      `INSERT INTO community_posts (author_address, content, image_url) VALUES ($1, $2, $3) RETURNING *`,
      [authenticatedAddress, content, imageUrl || null]
    );
    return NextResponse.json({ post: result.rows[0] }, { status: 201 });
  } catch (error) {
    logger.error('[Community Posts POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
