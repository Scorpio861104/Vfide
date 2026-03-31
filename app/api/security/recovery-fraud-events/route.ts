import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { requireAuth } from '@/lib/auth/middleware';
import { logger } from '@/lib/logger';

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const SOURCE_TYPES = ['guardian-inbox', 'guardians-page', 'unknown'] as const;

type SourceType = (typeof SOURCE_TYPES)[number];

type RecoveryFraudEvent = {
  vault: string;
  label: string;
  source: SourceType;
  proposedOwner: string;
  approvals: number;
  threshold: number;
  active: boolean;
  watcher: string;
  userAgent: string;
  ts: string;
};

const MAX_EVENTS = 1000;
const recoveryFraudStore: RecoveryFraudEvent[] = [];

function asSourceType(value: unknown): SourceType {
  if (typeof value !== 'string') return 'unknown';
  return SOURCE_TYPES.includes(value as SourceType) ? (value as SourceType) : 'unknown';
}

function normalizeAddress(value: unknown): string {
  if (typeof value !== 'string') return 'unknown';
  const trimmed = value.trim();
  if (!ADDRESS_REGEX.test(trimmed)) return 'unknown';
  return trimmed.toLowerCase();
}

function normalizeText(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

function normalizeNumber(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const vault = normalizeAddress(payload.vault);
  if (vault === 'unknown') {
    return NextResponse.json({ error: 'Invalid vault address' }, { status: 400 });
  }

  const event: RecoveryFraudEvent = {
    vault,
    label: normalizeText(payload.label, 60),
    source: asSourceType(payload.source),
    proposedOwner: normalizeAddress(payload.proposedOwner),
    approvals: normalizeNumber(payload.approvals),
    threshold: normalizeNumber(payload.threshold),
    active: !!payload.active,
    watcher: normalizeAddress(payload.watcher),
    userAgent: request.headers.get('user-agent') || 'unknown',
    ts: new Date().toISOString(),
  };

  recoveryFraudStore.push(event);
  if (recoveryFraudStore.length > MAX_EVENTS) {
    recoveryFraudStore.splice(0, recoveryFraudStore.length - MAX_EVENTS);
  }

  logger.warn('[Security][Recovery Fraud Event]', event);

  return NextResponse.json({ success: true });
}

function parsePositiveInteger(value: string | null, fallback: number): number {
  if (!value || !/^\d+$/.test(value)) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const searchParams = request.nextUrl.searchParams;
  const sinceMinutes = parsePositiveInteger(searchParams.get('sinceMinutes'), 1440);
  const limit = parsePositiveInteger(searchParams.get('limit'), 100);
  const effectiveLimit = Math.min(limit, 500);

  const cutoff = Date.now() - sinceMinutes * 60 * 1000;
  const filtered = recoveryFraudStore.filter((event) => {
    const ts = Date.parse(event.ts);
    return Number.isFinite(ts) && ts >= cutoff;
  });

  const events = filtered.slice(-effectiveLimit).reverse();

  const bySource = {
    'guardian-inbox': 0,
    'guardians-page': 0,
    unknown: 0,
  };

  for (const event of events) {
    bySource[event.source] += 1;
  }

  return NextResponse.json({
    summary: {
      sinceMinutes,
      total: events.length,
      bySource,
    },
    events,
  });
}
