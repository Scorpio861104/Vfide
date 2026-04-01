import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { createSiweChallenge, getRequestIp } from '@/lib/security/siweChallenge';
import { logger } from '@/lib/logger';
import { z } from 'zod4';

const authChallengeSchema = z.object({
  address: z.string().trim().toLowerCase().refine((value) => isAddress(value), {
    message: 'Valid address is required',
  }),
  chainId: z.coerce.number().int().positive().optional(),
});

export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'auth');
  if (rateLimitResponse) return rateLimitResponse;

  let body: z.infer<typeof authChallengeSchema>;
  try {
    const rawBody = await request.json();
    const parsed = authChallengeSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    body = parsed.data;
  } catch (error) {
    logger.debug('[Auth Challenge] Invalid JSON body', error);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const rawAddress = body.address;
  const chainId = body.chainId ?? 8453;
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
