import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const resolvedParams = await params;
    const userId = resolvedParams?.userId;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid userId parameter' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await query(
      `SELECT t.* FROM transactions t
       WHERE t.user_id = $1
       ORDER BY t.timestamp DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return NextResponse.json({ transactions: result.rows, total: result.rows.length });
  } catch (error) {
    console.error('[Transactions API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch transactions';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
