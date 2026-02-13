import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { requireAdmin, requireAuth } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;

  // Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    // Validate parsed number
    if (isNaN(limit) || limit < 0) {
      return NextResponse.json(
        { error: 'Invalid limit parameter' },
        { status: 400 }
      );
    }

    let sql = `SELECT * FROM error_logs`;
    const params: (string | number)[] = [];

    if (severity) {
      params.push(severity);
      sql += ` WHERE severity = $1`;
    }

    params.push(limit);
    sql += ` ORDER BY timestamp DESC LIMIT $${params.length}`;

    const result = await query(sql, params);

    return NextResponse.json({ errors: result.rows, total: result.rows.length });
  } catch (error) {
    console.error('[Errors GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch errors' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'write');
  if (rateLimit) return rateLimit;

  // Require authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const { severity, message, stack, metadata } = body;

    if (!message) {
      return NextResponse.json({ error: 'message required' }, { status: 400 });
    }

    const userResult = await query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [authResult.user.address.toLowerCase()]
    );

    const userId = userResult.rows[0]?.id || null;

    const result = await query(
      `INSERT INTO error_logs (user_id, severity, message, stack, metadata, timestamp)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [userId, severity || 'error', message, stack, JSON.stringify(metadata || {})]
    );

    return NextResponse.json({ success: true, error: result.rows[0] });
  } catch (error) {
    console.error('[Errors POST] Error:', error);
    return NextResponse.json({ error: 'Failed to log error' }, { status: 500 });
  }
}
