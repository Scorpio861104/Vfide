/**
 * Avatar Upload API: POST a file, get a public URL.
 *
 * POST /api/avatar
 *   Body: multipart/form-data with field "file" (image bytes)
 *   Returns:
 *     201 { url, contentType, size, sanitized?: boolean }
 *     400 { error }
 *     413 { error: "too large" }
 *     415 { error: "unsupported media type" }
 *     429 { error: "rate limited" }
 *
 * Storage: Vercel Blob
 *   Public URLs returned by Vercel are content-addressed internally; once
 *   uploaded, the URL is stable and cacheable indefinitely.
 *
 * SVG sanitization happens before upload — we never put unscrubbed SVG into
 * the store. PNGs/JPEGs/WebPs are accepted as-is (the rendering risk surface
 * is much smaller and we're not in the image-processing business).
 *
 * No auth on writes per the design decision documented in
 * VFIDE_MERCHANT_PROFILE_SPEC.md §8 and the conversation that produced it.
 * Rate limiting handles spam.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { put } from '@vercel/blob';
import { sanitizeSvg } from '@/lib/profile/svg-sanitize';
import { getRequestIp } from '@/lib/security/requestContext';


// Per spec §3 — file size cap. Avatars over 2 MB are almost certainly
// not optimized; reject and let the user shrink them.
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const ALLOWED_CONTENT_TYPES = new Set([
  'image/jpeg', 'image/jpg',
  'image/png',
  'image/webp',
  'image/svg+xml',
]);

// Rate limit: avatar uploads are heavier than profile uploads (real bytes,
// real Blob operations), so we cap tighter.
const RATE_LIMIT_MAX_PER_HOUR = 10;

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number }> {
  if (!redis) return { allowed: true, remaining: RATE_LIMIT_MAX_PER_HOUR };
  const key = `rl:avatar:${ip}:${Math.floor(Date.now() / 3_600_000)}`;
  try {
    const count = (await redis.incr(key)) as number;
    if (count === 1) {
      await redis.expire(key, 3700);
    }
    return {
      allowed: count <= RATE_LIMIT_MAX_PER_HOUR,
      remaining: Math.max(0, RATE_LIMIT_MAX_PER_HOUR - count),
    };
  } catch {
    return { allowed: true, remaining: RATE_LIMIT_MAX_PER_HOUR };
  }
}

function clientIp(req: NextRequest): string {
  return getRequestIp(req.headers).ip;
}

export async function POST(req: NextRequest) {
  // Rate limit
  const ip = clientIp(req);
  const rl = await checkRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate limited', retryAfterSeconds: 3600 },
      { status: 429, headers: { 'X-RateLimit-Remaining': '0' } },
    );
  }

  // Parse multipart
  let form: FormData;
  try {
    form = await req.formData();
  } catch (e) {
    return NextResponse.json(
      { error: `invalid multipart body: ${(e as Error).message}` },
      { status: 400 },
    );
  }

  const fileEntry = form.get('file');
  if (!fileEntry || !(fileEntry instanceof File)) {
    return NextResponse.json(
      { error: 'multipart field "file" required' },
      { status: 400 },
    );
  }
  const file = fileEntry as File;

  // Content-type allowlist
  const ct = (file.type || '').toLowerCase();
  if (!ALLOWED_CONTENT_TYPES.has(ct)) {
    return NextResponse.json(
      { error: 'unsupported media type', allowed: Array.from(ALLOWED_CONTENT_TYPES) },
      { status: 415 },
    );
  }

  // Size cap
  if (file.size > MAX_AVATAR_BYTES) {
    return NextResponse.json(
      { error: 'too large', maxBytes: MAX_AVATAR_BYTES, got: file.size },
      { status: 413 },
    );
  }
  if (file.size === 0) {
    return NextResponse.json(
      { error: 'empty file' },
      { status: 400 },
    );
  }

  // Read bytes
  let bytes: Uint8Array;
  try {
    const buf = await file.arrayBuffer();
    bytes = new Uint8Array(buf);
  } catch (e) {
    return NextResponse.json(
      { error: `read failed: ${(e as Error).message}` },
      { status: 400 },
    );
  }

  // SVG path: sanitize before upload. We never store untrusted SVG.
  let uploadBytes: Uint8Array | string = bytes;
  let sanitized = false;
  if (ct === 'image/svg+xml') {
    const svgText = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    const result = sanitizeSvg(svgText);
    if (!result.ok) {
      return NextResponse.json(
        { error: `svg validation: ${result.reason}` },
        { status: 400 },
      );
    }
    uploadBytes = result.sanitized;
    sanitized = result.stripped;
  } else {
    // For raster images we trust the content-type and size caps. We don't
    // re-encode; trying to use Sharp on Vercel free is fraught (cold start
    // cost, binary size). If we later add a thumbnail step, that's where
    // it lives — but it's optional, not security-critical.
  }

  // Upload. Vercel Blob's `put` accepts string or ArrayBuffer/Blob.
  // We give it a content-addressed-ish filename: a random suffix prevents
  // collisions, the content-type drives the served Content-Type header.
  //
  // Use crypto.randomUUID() rather than Math.random() — even though this
  // is a filename uniqifier (not a security secret), the upload path is
  // a public POST and a CSPRNG suffix forecloses any "guess the next
  // upload's URL" pre-publish race. Negligible perf cost; matches the
  // pattern used elsewhere (lib/sessionKeys, lib/crossChain).
  const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  const ext = extensionFor(ct);
  const pathname = `avatars/${Date.now()}-${suffix}.${ext}`;

  let publicUrl: string;
  try {
    const blob = await put(pathname, uploadBytes as Parameters<typeof put>[1], {
      access: 'public',
      contentType: ct,
      addRandomSuffix: false, // we already added entropy above
      cacheControlMaxAge: 31536000, // 1y; URL is stable
    });
    publicUrl = blob.url;
  } catch (e) {
    return NextResponse.json(
      { error: `blob upload failed: ${(e as Error).message}` },
      { status: 503 },
    );
  }

  return NextResponse.json(
    {
      url: publicUrl,
      contentType: ct,
      size: file.size,
      sanitized,
    },
    {
      status: 201,
      headers: {
        'X-RateLimit-Remaining': String(rl.remaining),
      },
    },
  );
}

function extensionFor(contentType: string): string {
  switch (contentType) {
    case 'image/jpeg':
    case 'image/jpg': return 'jpg';
    case 'image/png': return 'png';
    case 'image/webp': return 'webp';
    case 'image/svg+xml': return 'svg';
    default: return 'bin';
  }
}
