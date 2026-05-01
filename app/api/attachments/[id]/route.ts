import { query } from '@/lib/db';
import { withAuth } from '@/lib/auth/middleware';
import { NextRequest, NextResponse } from 'next/server';
import type { JWTPayload } from '@/lib/auth/jwt';

import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { z } from 'zod4';

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;
const attachmentParamsSchema = z.object({
  id: z.string().trim().regex(/^\d+$/),
});

function parsePositiveInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export const GET = withAuth(async (request: NextRequest, user: JWTPayload, context?: { params: Promise<Record<string, string>> | Record<string, string> }) => {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;
  const authAddress = typeof user?.address === 'string'
    ? user.address.trim().toLowerCase()
    : '';
  if (!authAddress || !ADDRESS_LIKE_REGEX.test(authAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const resolvedParams = await context!.params;
    const parsedParams = attachmentParamsSchema.safeParse(resolvedParams ?? {});
    if (!parsedParams.success) {
      return NextResponse.json(
        { error: 'Invalid id parameter' },
        { status: 400 }
      );
    }

    const id = parsePositiveInteger(parsedParams.data.id);
    if (!id) {
      return NextResponse.json({ error: 'Invalid id parameter' }, { status: 400 });
    }

    const userResult = await query('SELECT id FROM users WHERE LOWER(wallet_address) = LOWER($1)', [authAddress]);
    const userId = userResult.rows[0]?.id;
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const result = await query(`SELECT * FROM attachments WHERE id = $1 AND uploaded_by = $2`, [id, userId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    return NextResponse.json({ attachment: result.rows[0] });
  } catch (error) {
    logger.error('[Attachments GET] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch attachment';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (request: NextRequest, user: JWTPayload, context?: { params: Promise<Record<string, string>> | Record<string, string> }) => {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'write');
  if (rateLimit) return rateLimit;
  const authAddress = typeof user?.address === 'string'
    ? user.address.trim().toLowerCase()
    : '';
  if (!authAddress || !ADDRESS_LIKE_REGEX.test(authAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const resolvedParams = await context!.params;
    const parsedParams = attachmentParamsSchema.safeParse(resolvedParams ?? {});
    if (!parsedParams.success) {
      return NextResponse.json(
        { error: 'Invalid id parameter' },
        { status: 400 }
      );
    }

    const id = parsePositiveInteger(parsedParams.data.id);
    if (!id) {
      return NextResponse.json({ error: 'Invalid id parameter' }, { status: 400 });
    }

    // Always verify ownership before deletion
    const userResult = await query('SELECT id FROM users WHERE LOWER(wallet_address) = LOWER($1)', [authAddress]);
    const userId = userResult.rows[0]?.id;
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const result = await query(`DELETE FROM attachments WHERE id = $1 AND uploaded_by = $2 RETURNING *`, [id, userId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Attachment not found or not owned by user' }, { status: 404 });
    }

    return NextResponse.json({ success: true, attachment: result.rows[0] });
  } catch (error) {
    logger.error('[Attachments DELETE] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete attachment';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
});
