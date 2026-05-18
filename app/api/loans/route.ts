/**
 * Open Loans API
 *
 * GET — List open term-loan offers from the loans table.
 *       The lending page's "borrow" tab reads from this endpoint.
 *
 * Query params:
 *   status  — filter by loan status (default: 'open')
 *   limit   — max rows (default: 20, max: 100)
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

const VALID_STATUSES = ['open', 'active', 'repaid', 'defaulted', 'cancelled'] as const;
type LoanStatus = (typeof VALID_STATUSES)[number];

export async function GET(request: NextRequest): Promise<NextResponse> {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(request.url);

  const rawStatus = searchParams.get('status') ?? 'open';
  const status: LoanStatus = (VALID_STATUSES as readonly string[]).includes(rawStatus)
    ? (rawStatus as LoanStatus)
    : 'open';

  const rawLimit = parseInt(searchParams.get('limit') ?? '20', 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 20;

  try {
    const result = await query<{
      id: number;
      on_chain_id: number;
      lender_address: string;
      principal: string;
      interest_bps: number;
      duration_seconds: number;
      status: string;
      created_at: string;
    }>(
      `SELECT id, on_chain_id, lender_address, principal, interest_bps,
              duration_seconds, status, created_at
         FROM loans
        WHERE status = $1
        ORDER BY created_at DESC
        LIMIT $2`,
      [status, limit],
    );

    return NextResponse.json({ loans: result.rows });
  } catch (error) {
    logger.error('[Loans API] Failed to fetch loans', error);
    return NextResponse.json({ error: 'Failed to fetch loans' }, { status: 500 });
  }
}
