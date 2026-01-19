import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;

  try {
    const { id } = await params;

    const result = await query(`SELECT * FROM attachments WHERE id = $1`, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    return NextResponse.json({ attachment: result.rows[0] });
  } catch (error) {
    console.error('[Attachments GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch attachment' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'write');
  if (rateLimit) return rateLimit;

  // Authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;

    const result = await query(`DELETE FROM attachments WHERE id = $1 RETURNING *`, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, attachment: result.rows[0] });
  } catch (error) {
    console.error('[Attachments DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to delete attachment' }, { status: 500 });
  }
}
