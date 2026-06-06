/**
 * /api/social/content-access
 * Access to premium content is DERIVED from a recorded purchase
 * (content_purchases) by the authenticated caller. There is no separately
 * grantable access flag, which removes the prior "anyone can grant anyone
 * access" surface entirely.
 *
 * GET  ?contentId=   -> { hasAccess }   (caller = authenticated session)
 * POST { contentId } -> confirms access from the caller's purchase record.
 */
import { NextRequest, NextResponse } from 'next/server';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

async function callerHasAccess(contentId: string, address: string): Promise<boolean> {
  const row = (
    await query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM content_purchases
         WHERE content_id = $1 AND LOWER(buyer_address) = LOWER($2)
       ) AS exists`,
      [contentId, address],
    )
  ).rows[0];
  return Boolean(row?.exists);
}

export const GET = withAuth(async (request: NextRequest, user: JWTPayload) => {
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;

  const { searchParams } = new URL(request.url);
  const contentId = searchParams.get('contentId');
  if (!contentId) {
    return NextResponse.json({ error: 'contentId is required' }, { status: 400 });
  }
  try {
    return NextResponse.json({ hasAccess: await callerHasAccess(contentId, user.address) });
  } catch {
    return NextResponse.json({ error: 'Failed to check access' }, { status: 500 });
  }
});

export const POST = withAuth(async (request: NextRequest, user: JWTPayload) => {
  const rateLimit = await withRateLimit(request, 'write');
  if (rateLimit) return rateLimit;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const contentId = typeof body.contentId === 'string' ? body.contentId : '';
  if (!contentId) {
    return NextResponse.json({ error: 'contentId is required' }, { status: 400 });
  }
  try {
    const ok = await callerHasAccess(contentId, user.address);
    if (!ok) {
      return NextResponse.json(
        { error: 'No purchase found for this content', accessGranted: false },
        { status: 403 },
      );
    }
    return NextResponse.json({ success: true, accessGranted: true });
  } catch {
    return NextResponse.json({ error: 'Failed to confirm access' }, { status: 500 });
  }
});
