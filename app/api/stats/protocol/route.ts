import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/auth/rateLimit';
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

export async function GET(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Aggregate stats from database
    const [users, merchants, transactions] = await Promise.all([
      query('SELECT COUNT(*) as count FROM users'),
      query('SELECT COUNT(*) as count FROM merchants WHERE active = true'),
      query('SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as volume FROM transactions'),
    ]);

    return NextResponse.json({
      totalUsers: Number(users.rows[0]?.count || 0),
      totalMerchants: Number(merchants.rows[0]?.count || 0),
      totalTransactions: Number(transactions.rows[0]?.count || 0),
      totalVolume: transactions.rows[0]?.volume || '0',
      totalBurned: '0',
      totalDonated: '0',
      averageProofScore: 5000,
      activeLenders: 0,
      activeLoans: 0,
      defaultRate: 0,
    });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      logger.warn('[Protocol Stats] Database unavailable', error);
      return NextResponse.json({ error: 'Protocol stats temporarily unavailable', degraded: true }, { status: 503 });
    }

    logger.error('[Protocol Stats] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch protocol stats' }, { status: 500 });
  }
}
