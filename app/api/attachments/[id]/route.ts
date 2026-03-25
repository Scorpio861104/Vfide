import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{3,40}$/;

function parsePositiveInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const authAddress = typeof authResult.user?.address === 'string'
    ? authResult.user.address.trim().toLowerCase()
    : '';
  if (!authAddress || !ADDRESS_LIKE_REGEX.test(authAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const resolvedParams = await params;
    const idParam = resolvedParams?.id;

    if (!idParam || typeof idParam !== 'string') {
      return NextResponse.json(
        { error: 'Invalid id parameter' },
        { status: 400 }
      );
    }

    const id = parsePositiveInteger(idParam);
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
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'write');
  if (rateLimit) return rateLimit;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const authAddress = typeof authResult.user?.address === 'string'
    ? authResult.user.address.trim().toLowerCase()
    : '';
  if (!authAddress || !ADDRESS_LIKE_REGEX.test(authAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const resolvedParams = await params;
    const idParam = resolvedParams?.id;

    if (!idParam || typeof idParam !== 'string') {
      return NextResponse.json(
        { error: 'Invalid id parameter' },
        { status: 400 }
      );
    }

    const id = parsePositiveInteger(idParam);
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
}
