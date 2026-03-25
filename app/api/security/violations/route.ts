import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { requireAuth } from '@/lib/auth/middleware';
import { logger } from '@/lib/logger';

const DEFAULT_VIOLATIONS_LIMIT = 100;
const MAX_VIOLATIONS_LIMIT = 500;
const MAX_VIOLATION_TYPE_LENGTH = 64;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_IP_LENGTH = 64;
const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{3,64}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase();
}

function isAddressLike(value: string): boolean {
  return ADDRESS_PATTERN.test(value);
}

function parsePositiveInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const authAddress = typeof authResult.user?.address === 'string'
    ? normalizeAddress(authResult.user.address)
    : '';
  if (!authAddress || !isAddressLike(authAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const rawLimit = searchParams.get('limit');
    const parsedLimit = rawLimit === null
      ? DEFAULT_VIOLATIONS_LIMIT
      : parsePositiveInteger(rawLimit);

    if (parsedLimit === null) {
      return NextResponse.json(
        { error: 'Invalid limit parameter' },
        { status: 400 }
      );
    }

    const limit = Math.min(parsedLimit, MAX_VIOLATIONS_LIMIT);

    const result = await query(
      `SELECT sv.* FROM security_violations sv
       JOIN users u ON sv.user_id = u.id
       WHERE u.wallet_address = $1
       ORDER BY sv.detected_at DESC LIMIT $2`,
      [authAddress, limit]
    );

    return NextResponse.json({ violations: result.rows });
  } catch (error) {
    logger.error('[Security Violations] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch violations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const authAddress = typeof authResult.user?.address === 'string'
    ? normalizeAddress(authResult.user.address)
    : '';
  if (!authAddress || !isAddressLike(authAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: unknown = await request.json();
    if (!isRecord(body)) {
      return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 });
    }

    const violationType = typeof body.violationType === 'string' ? body.violationType.trim() : null;
    const description = typeof body.description === 'string' ? body.description.trim() : null;
    const severity = typeof body.severity === 'string' ? body.severity.trim().toLowerCase() : null;
    const ipAddress = typeof body.ipAddress === 'string' ? body.ipAddress.trim() : null;

    if (!violationType || !description || !severity) {
      return NextResponse.json(
        { error: 'violationType, severity, and description are required' },
        { status: 400 }
      );
    }

    if (violationType.length > MAX_VIOLATION_TYPE_LENGTH) {
      return NextResponse.json(
        { error: `violationType too long (max ${MAX_VIOLATION_TYPE_LENGTH})` },
        { status: 400 }
      );
    }

    if (description.length > MAX_DESCRIPTION_LENGTH) {
      return NextResponse.json(
        { error: `description too long (max ${MAX_DESCRIPTION_LENGTH})` },
        { status: 400 }
      );
    }

    if (!VALID_SEVERITIES.includes(severity as (typeof VALID_SEVERITIES)[number])) {
      return NextResponse.json(
        { error: `Invalid severity. Allowed: ${VALID_SEVERITIES.join(', ')}` },
        { status: 400 }
      );
    }

    if (ipAddress && ipAddress.length > MAX_IP_LENGTH) {
      return NextResponse.json(
        { error: `ipAddress too long (max ${MAX_IP_LENGTH})` },
        { status: 400 }
      );
    }

    const userResult = await query<{ id: number }>(
      'SELECT id FROM users WHERE wallet_address = $1',
      [authAddress]
    );

    const userId = userResult.rows[0]?.id;
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const result = await query(
      `INSERT INTO security_violations (user_id, violation_type, severity, description, ip_address, detected_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [userId, violationType, severity, description, ipAddress]
    );

    return NextResponse.json({ success: true, violation: result.rows[0] });
  } catch (error) {
    logger.error('[Security Violations POST] Error:', error);
    return NextResponse.json({ error: 'Failed to log violation' }, { status: 500 });
  }
}
