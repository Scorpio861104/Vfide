import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { requireAdmin, requireAuth } from '@/lib/auth/middleware';
import { logger } from '@/lib/logger';
import { z } from 'zod4';

const MAX_ERROR_LOG_LIMIT = 200;
const DEFAULT_ERROR_LOG_LIMIT = 100;
const MAX_ERROR_MESSAGE_LENGTH = 2000;
const MAX_ERROR_STACK_LENGTH = 20000;
const MAX_ERROR_METADATA_BYTES = 10000;
const VALID_SEVERITIES = ['error', 'warning', 'info', 'critical'] as const;
const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

const logErrorSchema = z.object({
  severity: z.enum(VALID_SEVERITIES).optional(),
  message: z.string().trim().min(1).max(MAX_ERROR_MESSAGE_LENGTH),
  stack: z.string().max(MAX_ERROR_STACK_LENGTH).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

function byteLength(value: string): number {
  return Buffer.byteLength(value, 'utf8');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase();
}

function isAddressLike(value: string): boolean {
  return ADDRESS_PATTERN.test(value);
}

function parseStrictIntegerParam(value: string | null): number | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return Number.parseInt(trimmed, 10);
}

function sanitizeStack(stack: string): string {
  return stack
    // Strip absolute Unix paths, keep filename
    .replace(/\/(?:[\w@._-]+\/){2,}([\w@._-]+)/g, '$1')
    // Strip absolute Windows paths, keep filename
    .replace(/[A-Z]:\\(?:[\w@._-]+\\){2,}([\w@._-]+)/g, '$1')
    // Redact connection strings
    .replace(/(?:postgres|mysql|redis|mongodb|amqp)s?:\/\/[^\s)]+/gi, '[REDACTED_URI]')
    // Redact env references
    .replace(/process\.env\.\w+/g, 'process.env.[REDACTED]');
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
    const severity = searchParams.get('severity')?.trim().toLowerCase() || null;
    const parsedLimit = parseStrictIntegerParam(searchParams.get('limit'));

    if (searchParams.get('limit') !== null && parsedLimit === null) {
      return NextResponse.json(
        { error: 'Invalid limit parameter' },
        { status: 400 }
      );
    }

    const limitParam = parsedLimit ?? DEFAULT_ERROR_LOG_LIMIT;

    // Validate parsed number
    if (limitParam < 0) {
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
    logger.error('[Errors GET] Error:', error);
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
    let body: z.infer<typeof logErrorSchema>;
    try {
      const rawBody = await request.json();
      if (!isRecord(rawBody)) {
        return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 });
      }

      const parsed = logErrorSchema.safeParse(rawBody);
      if (!parsed.success) {
        const hasSeverityIssue = parsed.error.issues.some((issue) => issue.path[0] === 'severity');
        if (hasSeverityIssue) {
          return NextResponse.json(
            { error: `Invalid severity. Must be one of: ${VALID_SEVERITIES.join(', ')}` },
            { status: 400 }
          );
        }

        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
      }
      body = parsed.data;
    } catch (error) {
      logger.debug('[Errors POST] Invalid JSON payload', error);
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const { severity, message: rawMessage, stack: rawStack, metadata } = body;

    if (!authResult.user?.address || typeof authResult.user.address !== 'string') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authAddress = normalizeAddress(authResult.user.address);
    if (!isAddressLike(authAddress)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const message = rawMessage.trim();
    const stack = typeof rawStack === 'string' ? rawStack : rawStack;
    const normalizedSeverity = severity;

    const serializedMetadata = JSON.stringify(metadata || {});
    if (byteLength(serializedMetadata) > MAX_ERROR_METADATA_BYTES) {
      return NextResponse.json(
        { error: `metadata too large. Maximum ${MAX_ERROR_METADATA_BYTES} bytes allowed.` },
        { status: 400 }
      );
    }

    const userResult = await query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [authAddress]
    );

    const userId = userResult.rows[0]?.id || null;
    const sanitizedStack = typeof stack === 'string' ? sanitizeStack(stack) : stack;

    const result = await query(
      `INSERT INTO error_logs (user_id, severity, message, stack, metadata, timestamp)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [userId, normalizedSeverity || 'error', message, sanitizedStack, serializedMetadata]
    );

    return NextResponse.json({ success: true, error: result.rows[0] });
  } catch (error) {
    logger.error('[Errors POST] Error:', error);
    return NextResponse.json({ error: 'Failed to log error' }, { status: 500 });
  }
}
