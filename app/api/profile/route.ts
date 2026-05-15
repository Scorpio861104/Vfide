/**
 * Merchant Profile API: POST to publish, GET to fetch.
 *
 * POST /api/profile
 *   Body: JSON matching the v1 Merchant Profile schema (spec §3)
 *   Returns:
 *     201 { hash: "0x...", cid: "bafy...", canonicalSize: N }
 *     400 { error, details: ["..."] }   — validation errors
 *     413 { error: "payload too large" }
 *     429 { error: "rate limited" }
 *
 * GET /api/profile?cid=...   (or hash=0x... — accept either)
 *   Returns:
 *     200 application/json  — canonical profile bytes
 *     404 { error: "not found" }
 *     451 { error: "moderated" }       — flagged hash; not served
 *
 * Storage: Vercel KV
 *   profile:{cid}   -> canonical JSON string
 *   flag:{cid}      -> { reason, reportedAt } (if moderated)
 *
 * No write auth per design decision: the chain's setMetaHash is what binds
 * a hash to a merchant. Anyone can upload bytes; only the merchant can point
 * their on-chain record at them. Rate limiting prevents spam.
 */

import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { canonicalizeJSON, canonicalizeJSONString } from '@/lib/profile/canonicalize';
import { validateProfile } from '@/lib/profile/validate';
import { hashToCid, hashToBytes32, bytes32ToCid } from '@/lib/profile/cid';

// Conservative request body cap. Spec §4 says canonical ≤ 4 KB; we allow
// a bit more to account for whitespace before canonicalization, but well
// short of anything that could be abuse.
const MAX_REQUEST_BYTES = 16 * 1024;

// Vercel free tier: serverless functions are stateless, so we use KV as the
// rate-limit substrate. Simple sliding-window: count requests per IP per minute.
const RATE_LIMIT_MAX_PER_MINUTE = 30;

async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number }> {
  const key = `rl:profile:${ip}:${Math.floor(Date.now() / 60_000)}`;
  try {
    const count = (await kv.incr(key)) as number;
    if (count === 1) {
      // Set TTL on first hit in this window
      await kv.expire(key, 70);
    }
    return {
      allowed: count <= RATE_LIMIT_MAX_PER_MINUTE,
      remaining: Math.max(0, RATE_LIMIT_MAX_PER_MINUTE - count),
    };
  } catch {
    // KV failure → fail open. Rate limiting is defense in depth, not the
    // only defense. Logging this would be valuable in production.
    return { allowed: true, remaining: RATE_LIMIT_MAX_PER_MINUTE };
  }
}

function clientIp(req: NextRequest): string {
  // Vercel sets x-forwarded-for; the first entry is the client
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return (xff.split(',')[0] ?? '').trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

// ──────────────────────────────────────────────────────────────────────
// POST /api/profile
// ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Rate limit
  const ip = clientIp(req);
  const rl = await checkRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate limited', retryAfterSeconds: 60 },
      { status: 429, headers: { 'X-RateLimit-Remaining': '0' } },
    );
  }

  // Size cap on raw body
  const contentLength = req.headers.get('content-length');
  if (contentLength && Number(contentLength) > MAX_REQUEST_BYTES) {
    return NextResponse.json(
      { error: 'payload too large', maxBytes: MAX_REQUEST_BYTES },
      { status: 413 },
    );
  }

  // Parse
  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid JSON' },
      { status: 400 },
    );
  }

  // Validate
  const result = validateProfile(parsed);
  if (!result.ok) {
    return NextResponse.json(
      { error: 'validation failed', details: result.errors },
      { status: 400 },
    );
  }

  // Canonicalize + hash
  const canonical = canonicalizeJSONString(result.profile);
  const canonicalBytes = new TextEncoder().encode(canonical);

  let cid: string;
  let hash: string;
  try {
    const cidObj = await hashToCid(canonicalBytes);
    cid = cidObj.toString();
    hash = await hashToBytes32(canonicalBytes);
  } catch (e) {
    return NextResponse.json(
      { error: `hashing failed: ${(e as Error).message}` },
      { status: 500 },
    );
  }

  // Check whether this hash is already flagged for moderation. Reuploading
  // moderated content shouldn't fly under the radar.
  try {
    const flag = await kv.get(`flag:${cid}`);
    if (flag) {
      return NextResponse.json(
        { error: 'this content has been moderated and cannot be re-published' },
        { status: 451 },
      );
    }
  } catch {
    // KV read failure — fail open. Worth logging.
  }

  // Store (idempotent: re-storing the same content is fine)
  try {
    await kv.set(`profile:${cid}`, canonical);
  } catch (e) {
    return NextResponse.json(
      { error: `storage failed: ${(e as Error).message}` },
      { status: 503 },
    );
  }

  return NextResponse.json(
    {
      hash,
      cid,
      canonicalSize: canonicalBytes.length,
    },
    {
      status: 201,
      headers: {
        'X-RateLimit-Remaining': String(rl.remaining),
      },
    },
  );
}

// ──────────────────────────────────────────────────────────────────────
// GET /api/profile?cid=... or ?hash=0x...
// ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cidParam = searchParams.get('cid');
  const hashParam = searchParams.get('hash');

  let cid: string;
  if (cidParam) {
    cid = cidParam;
  } else if (hashParam) {
    try {
      cid = bytes32ToCid(hashParam);
    } catch (e) {
      return NextResponse.json(
        { error: `invalid hash parameter: ${(e as Error).message}` },
        { status: 400 },
      );
    }
  } else {
    return NextResponse.json(
      { error: 'cid or hash query parameter required' },
      { status: 400 },
    );
  }

  // Moderation check first — never serve moderated content
  try {
    const flag = await kv.get(`flag:${cid}`);
    if (flag) {
      return NextResponse.json(
        { error: 'moderated', cid },
        { status: 451 },
      );
    }
  } catch {
    // Fail open on KV read errors for moderation check; if the moderation
    // table is unreachable we still serve. Worth logging in production.
  }

  // Fetch
  let canonical: string | null;
  try {
    canonical = await kv.get<string>(`profile:${cid}`);
  } catch (e) {
    return NextResponse.json(
      { error: `storage failed: ${(e as Error).message}` },
      { status: 503 },
    );
  }

  if (!canonical) {
    return NextResponse.json(
      { error: 'not found', cid },
      { status: 404 },
    );
  }

  // Return as application/json with content-addressed cache headers
  // (immutable: the CID guarantees the bytes never change for this URL)
  return new NextResponse(canonical, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Hash': cid,
    },
  });
}
