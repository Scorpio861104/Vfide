import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { isAdmin, requireAuth } from '@/lib/auth/middleware';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import { z } from 'zod4';

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const SOURCE_TYPES = ['next-of-kin-inbox', 'next-of-kin-tab', 'unknown'] as const;

type SourceType = (typeof SOURCE_TYPES)[number];

type NextOfKinFraudEvent = {
  vault: string;
  label: string;
  source: SourceType;
  nextOfKin: string;
  approvals: number;
  threshold: number;
  active: boolean;
  denied: boolean;
  watcher: string;
  userAgent: string;
  ts: string;
};

const MAX_EVENTS = 1000;
const nextOfKinFraudStore: NextOfKinFraudEvent[] = [];

const nextOfKinFraudEventSchema = z.object({
  vault: z.unknown(),
  label: z.unknown().optional(),
  source: z.unknown().optional(),
  nextOfKin: z.unknown().optional(),
  approvals: z.unknown().optional(),
  threshold: z.unknown().optional(),
  active: z.unknown().optional(),
  denied: z.unknown().optional(),
  watcher: z.unknown().optional(),
});

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

function getAllowedNextOfKinFraudReporters(): Set<string> {
  const raw = process.env.NEXT_OF_KIN_FRAUD_ALLOWED_REPORTERS || '';
  const values = raw
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => ADDRESS_REGEX.test(entry));
  return new Set(values);
}

async function isVaultOwnerReporter(vault: string, reporter: string): Promise<boolean> {
  try {
    const directOwner = await query(
      `SELECT 1
       FROM merchants
       WHERE LOWER(vault_address) = $1
         AND LOWER(wallet_address) = $2
       LIMIT 1`,
      [vault.toLowerCase(), reporter.toLowerCase()]
    );

    if (directOwner.rows.length > 0) {
      return true;
    }
  } catch (error) {
    logger.debug('[Security][Next of Kin Fraud Event] merchants(wallet_address) standing check failed', error);
  }

  try {
    const legacyOwner = await query(
      `SELECT 1
       FROM merchants
       WHERE LOWER(vault_address) = $1
         AND LOWER(owner_address) = $2
       LIMIT 1`,
      [vault.toLowerCase(), reporter.toLowerCase()]
    );

    return legacyOwner.rows.length > 0;
  } catch (error) {
    logger.debug('[Security][Next of Kin Fraud Event] merchants(owner_address) standing check failed', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  let payload: z.infer<typeof nextOfKinFraudEventSchema>;
  try {
    const rawBody = await request.json();
    const parsed = nextOfKinFraudEventSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    payload = parsed.data;
  } catch (error) {
    logger.debug('[Security][Next of Kin Fraud Event] Invalid JSON body', error);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const vault = normalizeAddress(payload.vault);
  if (vault === 'unknown') {
    return NextResponse.json({ error: 'Invalid vault address' }, { status: 400 });
  }

  const reporter = authResult.user.address?.trim().toLowerCase() ?? 'unknown';
  if (!ADDRESS_REGEX.test(reporter)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const callerIsAdmin = isAdmin(authResult.user);
  const allowedReporters = getAllowedNextOfKinFraudReporters();
  const reporterIsAllowed = allowedReporters.has(reporter);
  const reporterIsVault = reporter === vault;
  const reporterIsOwner = await isVaultOwnerReporter(vault, reporter);

  if (!callerIsAdmin && !reporterIsAllowed && !reporterIsVault && !reporterIsOwner) {
    return NextResponse.json(
      { error: 'You are not authorized to report fraud events for this vault' },
      { status: 403 }
    );
  }

  const event: NextOfKinFraudEvent = {
    vault,
    label: normalizeText(payload.label, 60),
    source: asSourceType(payload.source),
    nextOfKin: normalizeAddress(payload.nextOfKin),
    approvals: normalizeNumber(payload.approvals),
    threshold: normalizeNumber(payload.threshold),
    active: !!payload.active,
    denied: !!payload.denied,
    watcher: normalizeAddress(payload.watcher),
    userAgent: request.headers.get('user-agent') || 'unknown',
    ts: new Date().toISOString(),
  };

  nextOfKinFraudStore.push(event);
  if (nextOfKinFraudStore.length > MAX_EVENTS) {
    nextOfKinFraudStore.splice(0, nextOfKinFraudStore.length - MAX_EVENTS);
  }

  logger.warn('[Security][Next of Kin Fraud Event]', event);

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

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const caller = authResult.user.address.toLowerCase();
  const callerIsAdmin = isAdmin(authResult.user);

  const searchParams = request.nextUrl.searchParams;
  const sinceMinutes = parsePositiveInteger(searchParams.get('sinceMinutes'), 1440);
  const limit = parsePositiveInteger(searchParams.get('limit'), 100);
  const effectiveLimit = Math.min(limit, 500);

  const cutoff = Date.now() - sinceMinutes * 60 * 1000;
  const filtered = nextOfKinFraudStore.filter((event) => {
    const ts = Date.parse(event.ts);
    if (!Number.isFinite(ts) || ts < cutoff) return false;
    if (callerIsAdmin) return true;
    return event.watcher === caller || event.nextOfKin === caller;
  });

  const events = filtered.slice(-effectiveLimit).reverse();

  const bySource = {
    'next-of-kin-inbox': 0,
    'next-of-kin-tab': 0,
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
