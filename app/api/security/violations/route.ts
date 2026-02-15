import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { requireAdmin } from '@/lib/auth/middleware';
import { isAddress } from 'viem';

export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;

  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

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

  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const { userAddress, violationType, severity, description, details } = body as {
      userAddress?: string;
      violationType?: string;
      severity?: string;
      description?: string;
      details?: Record<string, unknown>;
    };

    if (!userAddress || !isAddress(userAddress)) {
      return NextResponse.json({ error: 'Valid user address required' }, { status: 400 });
    }

    if (!violationType) {
      return NextResponse.json({ error: 'violationType required' }, { status: 400 });
    }
    const normalizedSeverity = severity || 'medium';
    const allowedSeverities = new Set(['low', 'medium', 'high', 'critical']);
    if (!allowedSeverities.has(normalizedSeverity)) {
      return NextResponse.json({ error: 'Invalid severity' }, { status: 400 });
    }

    const detailsPayload = details ? JSON.stringify(details) : null;
    if (detailsPayload && detailsPayload.length > 5000) {
      return NextResponse.json({ error: 'Details payload too large' }, { status: 400 });
    }

    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0]?.trim() : null;
    let userId: number | null = null;
    if (userAddress && isAddress(userAddress)) {
      const userResult = await query<{ id: number }>(
        'SELECT id FROM users WHERE wallet_address = $1',
        [userAddress.toLowerCase()]
      );
      userId = userResult.rows[0]?.id ?? null;
    }

    const result = await query(
      `INSERT INTO security_violations (user_id, violation_type, severity, description, ip_address, details, detected_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [userId, violationType, normalizedSeverity, description, ipAddress ?? null, detailsPayload]
    );

    return NextResponse.json({ success: true, violation: result.rows[0] });
  } catch (error) {
    console.error('[Security Violations POST] Error:', error);
    return NextResponse.json({ error: 'Failed to log violation' }, { status: 500 });
  }
}
