import { NextRequest, NextResponse } from 'next/server';
import { verifyMessage } from 'viem';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { requireAuth } from '@/lib/auth/middleware';
import { buildGuardianAttestationMessage, type GuardianAttestationPayload } from '@/lib/recovery/guardianAttestation';
import { logger } from '@/lib/logger';
import { z } from 'zod4';

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const guardianAttestationSchema = z.object({
  owner: z.string(),
  vault: z.string(),
  guardian: z.string(),
  issuedAt: z.number(),
  expiresAt: z.number(),
  signature: z.string(),
});

type GuardianAttestationRecord = GuardianAttestationPayload & {
  signature: `0x${string}`;
  signaturePrefix: string;
  createdAt: string;
};

const MAX_ATTESTATIONS = 4000;
const store: GuardianAttestationRecord[] = [];

type GuardianAttestationSummary = {
  sinceMinutes: number;
  total: number;
  active: number;
  expiringSoon: number;
  topOwners: Array<{
    owner: string;
    count: number;
  }>;
  topGuardians: Array<{
    guardian: string;
    count: number;
  }>;
};

type GuardianAttestationSummaryEvent = {
  ts: string;
  owner: string;
  guardian: string;
  vault: string;
  issuedAt: number;
  expiresAt: number;
  signaturePrefix: string;
};

function normalizeAddress(value: unknown): `0x${string}` | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!ADDRESS_REGEX.test(trimmed)) return null;
  return trimmed.toLowerCase() as `0x${string}`;
}

function normalizeTimestamp(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const n = Math.floor(value);
  if (n <= 0) return null;
  return n;
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    logger.debug('[Guardian Attestations POST] Invalid JSON body', error);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsedBody = guardianAttestationSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const payload = parsedBody.data;
  const owner = normalizeAddress(payload.owner);
  const vault = normalizeAddress(payload.vault);
  const guardian = normalizeAddress(payload.guardian);
  const issuedAt = normalizeTimestamp(payload.issuedAt);
  const expiresAt = normalizeTimestamp(payload.expiresAt);
  const signature = typeof payload.signature === 'string' ? (payload.signature as `0x${string}`) : null;

  if (!owner || !vault || !guardian || !issuedAt || !expiresAt || !signature) {
    return NextResponse.json({ error: 'Invalid attestation payload' }, { status: 400 });
  }

  if (authResult.user.address.toLowerCase() !== owner.toLowerCase()) {
    return NextResponse.json({ error: 'Authenticated user must match owner' }, { status: 403 });
  }

  if (expiresAt <= issuedAt) {
    return NextResponse.json({ error: 'expiresAt must be after issuedAt' }, { status: 400 });
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (expiresAt < nowSec) {
    return NextResponse.json({ error: 'Attestation already expired' }, { status: 400 });
  }

  const canonical: GuardianAttestationPayload = {
    version: 'vfide-guardian-attestation-v1',
    owner,
    vault,
    guardian,
    issuedAt,
    expiresAt,
  };

  const message = buildGuardianAttestationMessage(canonical);
  let isValidSig = false;
  try {
    isValidSig = await verifyMessage({
      address: owner,
      message,
      signature,
    });
  } catch (error) {
    logger.debug('[Guardian Attestations POST] Signature verification failed', error);
    isValidSig = false;
  }

  if (!isValidSig) {
    return NextResponse.json({ error: 'Invalid owner signature' }, { status: 400 });
  }

  const dedupeIdx = store.findIndex((item) =>
    item.owner === owner &&
    item.vault === vault &&
    item.guardian === guardian &&
    item.issuedAt === issuedAt &&
    item.expiresAt === expiresAt
  );

  const record: GuardianAttestationRecord = {
    ...canonical,
    signature,
    signaturePrefix: signature.slice(0, 18),
    createdAt: new Date().toISOString(),
  };

  if (dedupeIdx >= 0) {
    store[dedupeIdx] = record;
  } else {
    store.push(record);
    if (store.length > MAX_ATTESTATIONS) {
      store.splice(0, store.length - MAX_ATTESTATIONS);
    }
  }

  return NextResponse.json({ success: true });
}

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value || !/^\d+$/.test(value)) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function getTopCounts(values: string[], limit: number): Array<{ key: string; count: number }> {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const params = request.nextUrl.searchParams;
  const mode = params.get('mode');

  if (mode === 'summary') {
    const sinceMinutes = Math.min(parsePositiveInt(params.get('sinceMinutes'), 60), 24 * 60);
    const limit = Math.min(parsePositiveInt(params.get('limit'), 100), 500);
    const nowMs = Date.now();
    const nowSec = Math.floor(nowMs / 1000);
    const windowStartMs = nowMs - sinceMinutes * 60 * 1000;
    const expiringSoonSec = nowSec + 72 * 60 * 60;

    const windowedRecords = store.filter((item) => {
      const createdAtMs = Date.parse(item.createdAt);
      return Number.isFinite(createdAtMs) && createdAtMs >= windowStartMs;
    });

    const activeWindowedRecords = windowedRecords.filter((item) => item.expiresAt >= nowSec);
    const expiringSoon = activeWindowedRecords.filter((item) => item.expiresAt <= expiringSoonSec).length;

    const topOwners = getTopCounts(activeWindowedRecords.map((item) => item.owner), 5).map((entry) => ({
      owner: entry.key,
      count: entry.count,
    }));

    const topGuardians = getTopCounts(activeWindowedRecords.map((item) => item.guardian), 5).map((entry) => ({
      guardian: entry.key,
      count: entry.count,
    }));

    const events: GuardianAttestationSummaryEvent[] = windowedRecords
      .slice(-limit)
      .reverse()
      .map((item) => ({
        ts: item.createdAt,
        owner: item.owner,
        guardian: item.guardian,
        vault: item.vault,
        issuedAt: item.issuedAt,
        expiresAt: item.expiresAt,
        signaturePrefix: item.signaturePrefix,
      }));

    const summary: GuardianAttestationSummary = {
      sinceMinutes,
      total: windowedRecords.length,
      active: activeWindowedRecords.length,
      expiringSoon,
      topOwners,
      topGuardians,
    };

    return NextResponse.json({
      summary,
      events,
    });
  }

  const guardian = normalizeAddress(params.get('guardian'));
  if (!guardian) {
    return NextResponse.json({ error: 'guardian query param is required' }, { status: 400 });
  }

  const limit = Math.min(parsePositiveInt(params.get('limit'), 200), 500);
  const nowSec = Math.floor(Date.now() / 1000);

  const active = store
    .filter((item) => item.guardian === guardian && item.expiresAt >= nowSec)
    .slice(-limit)
    .reverse();

  return NextResponse.json({
    guardian,
    total: active.length,
    attestations: active,
  });
}
