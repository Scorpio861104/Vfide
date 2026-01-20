import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';

export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    // Validate parsed number
    if (isNaN(limit) || limit < 0) {
      return NextResponse.json(
        { error: 'Invalid limit parameter' },
        { status: 400 }
      );
    }

    const result = await query(
      `SELECT * FROM security_violations ORDER BY detected_at DESC LIMIT $1`,
      [limit]
    );

    return NextResponse.json({ violations: result.rows });
  } catch (error) {
    console.error('[Security Violations] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch violations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;

  try {
    const body = await request.json();
    const { userId, violationType, severity, description, ipAddress } = body;

    const result = await query(
      `INSERT INTO security_violations (user_id, violation_type, severity, description, ip_address, detected_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [userId, violationType, severity, description, ipAddress]
    );

    return NextResponse.json({ success: true, violation: result.rows[0] });
  } catch (error) {
    console.error('[Security Violations POST] Error:', error);
    return NextResponse.json({ error: 'Failed to log violation' }, { status: 500 });
  }
}
