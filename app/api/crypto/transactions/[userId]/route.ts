import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/api-validation';
import { apiLogger } from '@/lib/logger.service';

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const clientId = request.headers.get('x-forwarded-for') || 'anonymous';

  // Rate limiting
  const rateLimit = checkRateLimit(`transactions:${clientId}`, { maxRequests: 60, windowMs: 60000 });
  if (!rateLimit.success) {
    return rateLimit.errorResponse;
  }

  try {
    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    const result = await query(
      `SELECT t.* FROM transactions t
       WHERE t.user_id = $1
       ORDER BY t.timestamp DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return NextResponse.json({ transactions: result.rows, total: result.rows.length });
  } catch (error) {
    apiLogger.error('Failed to fetch transactions', { error });
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}
