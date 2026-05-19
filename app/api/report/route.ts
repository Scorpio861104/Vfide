/**
 * Report API: flag a profile hash for moderation review.
 *
 * POST /api/report
 *   Body: { cid: string, reason: string }
 *   Returns:
 *     201 { ok: true }
 *     400 { error }
 *     429 { error: "rate limited" }
 *
 * Storage: Upstash Redis
 *   flag:{cid} -> { reason, reportedAt, reportCount }
 *
 * Moderation workflow for v1 is manual:
 *   1. Reports land in KV under flag:* keys
 *   2. Operator periodically queries keys matching flag:* from Redis
 *      (dashboard or CLI)
 *   3. Operator reviews the reported profile content (fetch by cid)
 *   4. If action is warranted, the flag stays — profile/GET returns 451
 *   5. If false positive, operator manually deletes the flag key
 *
 * Per spec §8: "VFIDE frontend operators may refuse to serve a profile hash
 * from their backend if the content violates posted policy." This endpoint
 * is the input channel for that operator policy.
 *
 * Heavily rate-limited — abusive mass-flagging is itself a form of harassment.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { getRequestIp } from '@/lib/security/requestContext';


const MAX_REASON_LENGTH = 500;
const RATE_LIMIT_MAX_PER_HOUR = 5;

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

async function checkRateLimit(ip: string): Promise<{ allowed: boolean }> {
  if (!redis) return { allowed: true };
  const key = `rl:report:${ip}:${Math.floor(Date.now() / 3_600_000)}`;
  try {
    const count = (await redis.incr(key)) as number;
    if (count === 1) {
      await redis.expire(key, 3700);
    }
    return { allowed: count <= RATE_LIMIT_MAX_PER_HOUR };
  } catch {
    return { allowed: true };
  }
}

function clientIp(req: NextRequest): string {
  return getRequestIp(req.headers).ip;
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = await checkRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate limited', retryAfterSeconds: 3600 },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'body must be an object' }, { status: 400 });
  }
  const b = body as Record<string, unknown>;

  const cid = b.cid;
  const reason = b.reason;

  if (typeof cid !== 'string' || cid.length < 10 || cid.length > 200) {
    return NextResponse.json(
      { error: 'cid: string, 10-200 chars required' },
      { status: 400 },
    );
  }
  // Basic CID shape — starts with a known prefix. Don't try to fully validate
  // here; if it's not in storage, the flag is harmless (it'll just sit unused).
  if (!/^[a-zA-Z0-9]+$/.test(cid)) {
    return NextResponse.json(
      { error: 'cid: alphanumeric characters only' },
      { status: 400 },
    );
  }

  if (typeof reason !== 'string') {
    return NextResponse.json(
      { error: 'reason: required string' },
      { status: 400 },
    );
  }
  if (reason.length === 0 || reason.length > MAX_REASON_LENGTH) {
    return NextResponse.json(
      { error: `reason: 1-${MAX_REASON_LENGTH} chars` },
      { status: 400 },
    );
  }

  // Increment report count or create new flag entry
  const flagKey = `flag:${cid}`;
  if (!redis) {
    return NextResponse.json(
      { error: 'storage not configured' },
      { status: 503 },
    );
  }
  try {
    const existing = await redis.get<{ reason: string; reportedAt: number; reportCount: number }>(
      flagKey,
    );
    if (existing) {
      await redis.set(flagKey, {
        reason: existing.reason, // keep original reason; new reports just bump the count
        reportedAt: existing.reportedAt,
        reportCount: (existing.reportCount || 1) + 1,
      });
    } else {
      await redis.set(flagKey, {
        reason: reason.slice(0, MAX_REASON_LENGTH),
        reportedAt: Date.now(),
        reportCount: 1,
      });
    }
  } catch (e) {
    return NextResponse.json(
      { error: `storage failed: ${(e as Error).message}` },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
