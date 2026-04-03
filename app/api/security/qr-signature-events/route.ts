import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { z } from 'zod4';

const EVENT_TYPES = ['missing', 'invalid', 'expired'] as const;
const SOURCE_TYPES = ['qr', 'checkout', 'unknown'] as const;
const SETTLEMENT_TYPES = ['instant', 'escrow', 'unknown'] as const;

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const ORDER_ID_REGEX = /^[a-zA-Z0-9_.:-]{1,120}$/;

type EventType = (typeof EVENT_TYPES)[number];
type SourceType = (typeof SOURCE_TYPES)[number];
type SettlementType = (typeof SETTLEMENT_TYPES)[number];

type QrSignatureEvent = {
  eventType: EventType;
  source: SourceType;
  settlement: SettlementType;
  merchant: string;
  orderId: string;
  exp: number | null;
  sigPrefix: string;
  reason: string;
  userAgent: string;
  ts: string;
};

const MAX_EVENTS = 1000;
const qrSignatureEventStore: QrSignatureEvent[] = [];

const qrSignatureEventSchema = z.object({
  eventType: z.enum(EVENT_TYPES),
  source: z.unknown().optional(),
  settlement: z.unknown().optional(),
  merchant: z.unknown().optional(),
  orderId: z.unknown().optional(),
  exp: z.unknown().optional(),
  sigPrefix: z.unknown().optional(),
  reason: z.unknown().optional(),
});

function asEventType(value: unknown): EventType | null {
  if (typeof value !== 'string') return null;
  return EVENT_TYPES.includes(value as EventType) ? (value as EventType) : null;
}

function asSourceType(value: unknown): SourceType {
  if (typeof value !== 'string') return 'unknown';
  return SOURCE_TYPES.includes(value as SourceType) ? (value as SourceType) : 'unknown';
}

function asSettlementType(value: unknown): SettlementType {
  if (typeof value !== 'string') return 'unknown';
  return SETTLEMENT_TYPES.includes(value as SettlementType) ? (value as SettlementType) : 'unknown';
}

function normalizeOrderId(value: unknown): string {
  if (typeof value !== 'string') return 'unknown';
  const trimmed = value.trim();
  if (!trimmed || !ORDER_ID_REGEX.test(trimmed)) return 'invalid-order-id';
  return trimmed;
}

function normalizeMerchant(value: unknown): string {
  if (typeof value !== 'string') return 'unknown';
  const trimmed = value.trim();
  if (!ADDRESS_REGEX.test(trimmed)) return 'unknown';
  return trimmed.toLowerCase();
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  let payload: z.infer<typeof qrSignatureEventSchema>;
  try {
    const rawBody = await request.json();
    const parsed = qrSignatureEventSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    payload = parsed.data;
  } catch (error) {
    logger.debug('[Security][QR Signature Event] Invalid JSON body', error);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const eventType = payload.eventType;

  const source = asSourceType(payload.source);
  const settlement = asSettlementType(payload.settlement);
  const orderId = normalizeOrderId(payload.orderId);
  const merchant = normalizeMerchant(payload.merchant);
  const exp = typeof payload.exp === 'number' && Number.isFinite(payload.exp) ? payload.exp : null;
  const sigPrefix = typeof payload.sigPrefix === 'string' ? payload.sigPrefix.slice(0, 18) : 'none';
  const reason = typeof payload.reason === 'string' ? payload.reason.slice(0, 120) : 'unspecified';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const ts = new Date().toISOString();

  const event: QrSignatureEvent = {
    eventType,
    source,
    settlement,
    merchant,
    orderId,
    exp,
    sigPrefix,
    reason,
    userAgent,
    ts,
  };

  qrSignatureEventStore.push(event);
  if (qrSignatureEventStore.length > MAX_EVENTS) {
    qrSignatureEventStore.splice(0, qrSignatureEventStore.length - MAX_EVENTS);
  }

  // Structured telemetry log for ops pipelines.
  logger.warn('[Security][QR Signature Event]', event);

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

  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  const searchParams = request.nextUrl.searchParams;
  const sinceMinutes = parsePositiveInteger(searchParams.get('sinceMinutes'), 60);
  const limit = parsePositiveInteger(searchParams.get('limit'), 100);
  const effectiveLimit = Math.min(limit, 500);

  const cutoff = Date.now() - sinceMinutes * 60 * 1000;
  const filtered = qrSignatureEventStore.filter((event) => {
    const ts = Date.parse(event.ts);
    return Number.isFinite(ts) && ts >= cutoff;
  });

  const recentEvents = filtered.slice(-effectiveLimit).reverse();

  const byEventType = {
    missing: 0,
    invalid: 0,
    expired: 0,
  };

  const byMerchant: Record<string, number> = {};

  for (const event of recentEvents) {
    byEventType[event.eventType] += 1;
    byMerchant[event.merchant] = (byMerchant[event.merchant] || 0) + 1;
  }

  const topMerchants = Object.entries(byMerchant)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([merchant, count]) => ({ merchant, count }));

  return NextResponse.json({
    summary: {
      sinceMinutes,
      total: recentEvents.length,
      byEventType,
      topMerchants,
    },
    events: recentEvents,
  });
}
