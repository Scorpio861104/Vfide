import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { requireAdmin, requireAuth } from '@/lib/auth/middleware';

const MAX_ERROR_LOG_LIMIT = 200;
const DEFAULT_ERROR_LOG_LIMIT = 100;
const MAX_ERROR_MESSAGE_LENGTH = 2000;
const MAX_ERROR_STACK_LENGTH = 20000;
const MAX_ERROR_METADATA_BYTES = 10000;
const VALID_SEVERITIES = ['error', 'warning', 'info', 'critical'] as const;

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

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
    const limitParam = parseInt(searchParams.get('limit') || String(DEFAULT_ERROR_LOG_LIMIT), 10);

    // Validate parsed number
    if (isNaN(limitParam) || limitParam < 0) {
      return NextResponse.json(
        { error: 'Invalid limit parameter' },
        { status: 400 }
      );
    }

    const limit = Math.min(limitParam, MAX_ERROR_LOG_LIMIT);

    if (severity && !VALID_SEVERITIES.includes(severity as (typeof VALID_SEVERITIES)[number])) {
      return NextResponse.json(
        { error: `Invalid severity. Must be one of: ${VALID_SEVERITIES.join(', ')}` },
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
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    if (!isObjectRecord(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { severity, message, stack, metadata } = body;

    if (typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'message required' }, { status: 400 });
    }

    if (message.length > MAX_ERROR_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `message too long. Maximum ${MAX_ERROR_MESSAGE_LENGTH} characters.` },
        { status: 400 }
      );
    }

    if (severity !== undefined && (typeof severity !== 'string' || !VALID_SEVERITIES.includes(severity as (typeof VALID_SEVERITIES)[number]))) {
      return NextResponse.json(
        { error: `Invalid severity. Must be one of: ${VALID_SEVERITIES.join(', ')}` },
        { status: 400 }
      );
    }

    if (stack !== undefined && typeof stack !== 'string') {
      return NextResponse.json(
        { error: 'Invalid stack. Must be a string if provided.' },
        { status: 400 }
      );
    }

    if (typeof stack === 'string' && stack.length > MAX_ERROR_STACK_LENGTH) {
      return NextResponse.json(
        { error: `stack too long. Maximum ${MAX_ERROR_STACK_LENGTH} characters.` },
        { status: 400 }
      );
    }

    if (metadata !== undefined && !isObjectRecord(metadata)) {
      return NextResponse.json(
        { error: 'Invalid metadata. Must be an object if provided.' },
        { status: 400 }
      );
    }

    const serializedMetadata = JSON.stringify(metadata || {});
    if (serializedMetadata.length > MAX_ERROR_METADATA_BYTES) {
      return NextResponse.json(
        { error: `metadata too large. Maximum ${MAX_ERROR_METADATA_BYTES} bytes allowed.` },
        { status: 400 }
      );
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
      [userId, severity || 'error', message, stack, serializedMetadata]
    );

    return NextResponse.json({ success: true, error: result.rows[0] });
  } catch (error) {
    console.error('[Errors POST] Error:', error);
    return NextResponse.json({ error: 'Failed to log error' }, { status: 500 });
  }
}
