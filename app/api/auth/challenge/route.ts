import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { createSiweChallenge, getRequestIp } from '@/lib/security/siweChallenge';
import { logger } from '@/lib/logger';

function toPositiveInteger(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return fallback;
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'auth');
  if (rateLimitResponse) return rateLimitResponse;

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const rawAddress = typeof body.address === 'string' ? body.address.trim().toLowerCase() : '';
  if (!rawAddress || !isAddress(rawAddress)) {
    return NextResponse.json({ error: 'Valid address is required' }, { status: 400 });
  }

  const chainId = toPositiveInteger(body.chainId, 8453);
  const hostHeader = request.headers.get('host') || 'vfide.io';
  const domain = hostHeader.split(':')[0] || 'vfide.io';
  const ip = getRequestIp(request.headers);
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    const challenge = await createSiweChallenge({
      address: rawAddress,
      domain,
      chainId,
      ip,
      userAgent,
    });

    return NextResponse.json({
      address: rawAddress,
      chainId,
      domain,
      message: challenge.message,
      nonce: challenge.nonce,
      issuedAt: challenge.issuedAt,
      expiresAt: challenge.expiresAt,
    });
  } catch (error) {
    logger.error('[Auth Challenge] Error:', error);
    return NextResponse.json({ error: 'Failed to create auth challenge' }, { status: 500 });
  }
}
