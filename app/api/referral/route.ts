/**
 * Referral Link API
 *
 * GET /api/referral?ref=0x... — Validate a referral code
 * POST /api/referral — Generate a referral link for the current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/auth/rateLimit';

import { isAddress } from 'viem';

export async function GET(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const ref = request.nextUrl.searchParams.get('ref');
  
  if (!ref || !isAddress(ref)) {
    return NextResponse.json({ valid: false, error: 'Invalid referral address' });
  }

  return NextResponse.json({
    valid: true,
    referrer: ref,
    link: `${process.env.NEXT_PUBLIC_APP_URL || 'https://vfide.io'}/join?ref=${ref}`,
  });
}

export const POST = withAuth(async (request: NextRequest, user: JWTPayload) => {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;
  const address = user.address?.trim().toLowerCase() ?? '';
  if (!isAddress(address)) {
    return NextResponse.json({ error: 'Valid wallet address required' }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vfide.io';
  const link = `${baseUrl}/join?ref=${address}`;

  return NextResponse.json({
    link,
    referrer: address,
    shareText: `Join VFIDE — zero-fee payments powered by trust. Get free testnet tokens: ${link}`,
  });
});
