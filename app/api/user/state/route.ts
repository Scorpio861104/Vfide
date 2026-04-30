import { NextRequest, NextResponse } from 'next/server';

import { withRateLimit } from '@/lib/auth/rateLimit';
import { runWithDbUserAddressContext } from '@/lib/db';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

function isDatabaseUnavailableError(error: unknown): boolean {
  const stack: unknown[] = [error];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    const asRecord = typeof current === 'object' ? current as Record<string, unknown> : null;
    const message = current instanceof Error
      ? current.message.toLowerCase()
      : String(current).toLowerCase();
    const code = typeof asRecord?.code === 'string' ? asRecord.code.toLowerCase() : '';

    if (
      code === 'econnrefused' ||
      code === '57p01' ||
      code === '28p01' ||
      code === '42p01' ||
      code === '42703' ||
      message.includes('econnrefused') ||
      message.includes('database query failed') ||
      message.includes('password authentication failed') ||
      message.includes('connect') ||
      message.includes('connection terminated') ||
      message.includes('timeout expired') ||
      message.includes('does not exist')
    ) {
      return true;
    }

    const cause = asRecord?.cause;
    if (cause) stack.push(cause);

    const errors = asRecord?.errors;
    if (Array.isArray(errors)) {
      for (const nested of errors) stack.push(nested);
    }
  }

  return false;
}

export const GET = withAuth(async (request: NextRequest, user: JWTPayload) => {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;
  const address = request.nextUrl.searchParams.get('address');
  if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 });

  if (address.toLowerCase() !== user.address.toLowerCase()) {
    return NextResponse.json({ error: 'Address must match authenticated wallet' }, { status: 403 });
  }

  try {
    const [user, merchant, loans] = await runWithDbUserAddressContext(user.address, () => Promise.all([
      query('SELECT proof_score, badges FROM users WHERE wallet_address = $1', [address.toLowerCase()]),
      query('SELECT id FROM merchants WHERE owner_address = $1 AND active = true', [address.toLowerCase()]),
      query('SELECT COUNT(*) as count FROM loans WHERE borrower_address = $1 AND status = $2', [address.toLowerCase(), 'active']),
    ]));

    return NextResponse.json({
      address,
      proofScore: Number(user.rows[0]?.proof_score || 5000),
      isMerchant: (merchant.rows?.length || 0) > 0,
      badges: user.rows[0]?.badges || [],
      activeLoanCount: Number(loans.rows[0]?.count || 0),
      unresolvedDefaults: 0,
    });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      logger.warn('[User State] Database unavailable', error);
      return NextResponse.json({ error: 'User state temporarily unavailable', degraded: true }, { status: 503 });
    }
    logger.error('[User State] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch user state' }, { status: 500 });
  }
});
