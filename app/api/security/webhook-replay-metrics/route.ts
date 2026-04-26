import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { requireAuth } from '@/lib/auth/middleware';

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const REPLAY_THRESHOLD_1H_ENV = 'SECURITY_WEBHOOK_REPLAY_REJECT_THRESHOLD_1H';
const MONITOR_ALLOWLIST_ENV = 'SECURITY_MONITOR_ALLOWLIST';
const REQUIRE_ALLOWLIST_ENV = 'SECURITY_MONITOR_REQUIRE_ALLOWLIST';
const MONITOR_API_TOKEN_ENV = 'SECURITY_MONITOR_API_TOKEN';
const DEFAULT_REPLAY_THRESHOLD_1H = 25;
const MAX_TOP_SOURCES = 10;

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase();
}

function isAddressLike(value: string): boolean {
  return ADDRESS_PATTERN.test(value);
}

function parsePositiveInt(value: string | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function resolveReplayThreshold1h(): number {
  return parsePositiveInt(process.env[REPLAY_THRESHOLD_1H_ENV]) ?? DEFAULT_REPLAY_THRESHOLD_1H;
}

function parseAllowlistedAddresses(): Set<string> {
  const configured = process.env[MONITOR_ALLOWLIST_ENV] || '';
  const entries = configured
    .split(',')
    .map((value) => normalizeAddress(value))
    .filter((value) => isAddressLike(value));

  return new Set(entries);
}

function shouldRequireAllowlist(): boolean {
  if (process.env[REQUIRE_ALLOWLIST_ENV] === 'true') return true;
  if (process.env[REQUIRE_ALLOWLIST_ENV] === 'false') return false;
  return process.env.NODE_ENV === 'production';
}

function extractBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null;
  const [scheme, token] = authorizationHeader.trim().split(/\s+/, 2);
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== 'bearer') return null;
  return token;
}

function isMachineTokenAuthorized(request: NextRequest): boolean {
  const configuredToken = process.env[MONITOR_API_TOKEN_ENV]?.trim();
  if (!configuredToken) return false;

  const bearerToken = extractBearerToken(request.headers.get('authorization'));
  if (!bearerToken) return false;

  const provided = Buffer.from(bearerToken, 'utf8');
  const expected = Buffer.from(configuredToken, 'utf8');
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export async function GET(request: NextRequest) {
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;

  const machineAuthorized = isMachineTokenAuthorized(request);

  if (!machineAuthorized) {
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

    const requireAllowlist = shouldRequireAllowlist();
    const allowlist = parseAllowlistedAddresses();
    if (requireAllowlist) {
      if (allowlist.size === 0 || !allowlist.has(authAddress)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
  }

  try {
    const aggregateResult = await query<{
      accepted_1h: string;
      rejected_1h: string;
      accepted_24h: string;
      rejected_24h: string;
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'accepted' AND ts >= NOW() - INTERVAL '1 hour')::text AS accepted_1h,
         COUNT(*) FILTER (WHERE status = 'rejected' AND ts >= NOW() - INTERVAL '1 hour')::text AS rejected_1h,
         COUNT(*) FILTER (WHERE status = 'accepted' AND ts >= NOW() - INTERVAL '24 hours')::text AS accepted_24h,
         COUNT(*) FILTER (WHERE status = 'rejected' AND ts >= NOW() - INTERVAL '24 hours')::text AS rejected_24h
       FROM security_webhook_replay_events`
    );

    const sourcesResult = await query<{
      source: string;
      rejected_count: string;
    }>(
      `SELECT source, COUNT(*)::text AS rejected_count
       FROM security_webhook_replay_events
       WHERE status = 'rejected'
         AND ts >= NOW() - INTERVAL '24 hours'
         AND source IS NOT NULL
       GROUP BY source
       ORDER BY COUNT(*) DESC
       LIMIT $1`,
      [MAX_TOP_SOURCES]
    );

    const aggregate = aggregateResult.rows[0] || {
      accepted_1h: '0',
      rejected_1h: '0',
      accepted_24h: '0',
      rejected_24h: '0',
    };

    const metrics = {
      accepted1h: Number.parseInt(aggregate.accepted_1h || '0', 10),
      rejected1h: Number.parseInt(aggregate.rejected_1h || '0', 10),
      accepted24h: Number.parseInt(aggregate.accepted_24h || '0', 10),
      rejected24h: Number.parseInt(aggregate.rejected_24h || '0', 10),
    };

    const topRejectedSources = sourcesResult.rows.map((row) => ({
      source: row.source,
      rejectedCount: Number.parseInt(row.rejected_count || '0', 10),
    }));

    const threshold1h = resolveReplayThreshold1h();
    const thresholdTriggered = metrics.rejected1h >= threshold1h;

    if (thresholdTriggered) {
      logger.warn('security.webhook_replay_spike', {
        rejected1h: metrics.rejected1h,
        threshold1h,
        topRejectedSources,
        securityEvent: 'webhook_replay_spike',
      });
    }

    return NextResponse.json({
      success: true,
      accessMode: machineAuthorized ? 'machine-token' : 'user-auth',
      metrics,
      threshold1h,
      thresholdTriggered,
      topRejectedSources,
    });
  } catch (error) {
    logger.error('Failed to get webhook replay metrics', error);
    return NextResponse.json({ error: 'Failed to fetch webhook replay metrics' }, { status: 500 });
  }
}
