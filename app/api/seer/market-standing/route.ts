import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import { suggestLoanTerms, type BuilderSummary } from '@/lib/seer/marketStability/lendingPolicy';

export const dynamic = 'force-dynamic';

function getAuthAddress(user: JWTPayload): string | null {
  const address = typeof user.address === 'string' ? user.address.trim().toLowerCase() : '';
  return address || null;
}

async function readProofScore(address: string): Promise<number> {
  try {
    const row = (
      await query<{ score: string }>(
        `SELECT data->>'newScore' AS score
           FROM indexed_events
          WHERE event_type = 'score' AND lower(data->>'subject') = $1
          ORDER BY block_number DESC
          LIMIT 1`,
        [address],
      )
    ).rows[0];

    const score = Number(row?.score);
    return Number.isFinite(score) ? score : 5000;
  } catch {
    return 5000;
  }
}

async function readExtractionIndex(address: string): Promise<number> {
  try {
    const row = (
      await query<{ idx: number }>(
        `SELECT index AS idx FROM extraction_index_state WHERE address = $1`,
        [address],
      )
    ).rows[0];
    return Number.isFinite(row?.idx) ? row.idx : 0;
  } catch {
    return 0;
  }
}

async function readBuilderCategory(address: string): Promise<BuilderSummary['category']> {
  try {
    const row = (
      await query<{ merchant_count: string; governance_count: string }>(
        `SELECT
           COUNT(*) FILTER (WHERE event_type IN ('PAYMENT_RECEIVED','ORDER_COMPLETED','BOOKING_COMPLETED'))::text AS merchant_count,
           COUNT(*) FILTER (WHERE event_type IN ('GOVERNANCE_PARTICIPATED','PROPOSAL_EXECUTED'))::text AS governance_count
         FROM ecosystem_events
         WHERE user_address = $1`,
        [address],
      )
    ).rows[0];

    const merchantCount = Number(row?.merchant_count ?? 0);
    const governanceCount = Number(row?.governance_count ?? 0);

    if (merchantCount >= 25) return 'Institutional Merchant';
    if (merchantCount >= 8) return 'Merchant';
    if (governanceCount >= 5) return 'Community Steward';
    if (merchantCount + governanceCount >= 5) return 'Established Builder';
    if (merchantCount + governanceCount >= 1) return 'Builder';
    return 'Newcomer';
  } catch {
    return 'Newcomer';
  }
}

function extractionBucket(index: number): string {
  if (index >= 7000) return 'Severe';
  if (index >= 5000) return 'High';
  if (index >= 3000) return 'Elevated';
  return 'Low';
}

async function getHandler(request: NextRequest, user: JWTPayload): Promise<Response> {
  const rl = await withRateLimit(request, 'read');
  if (rl) return rl;

  const address = getAuthAddress(user);
  if (!address) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const proofScore = await readProofScore(address);
    const extractionIndex = await readExtractionIndex(address);
    const builder = { category: await readBuilderCategory(address) };

    const lendingTerms = suggestLoanTerms({
      proofScore,
      builder,
      extractionIndex,
    });

    return NextResponse.json({
      builder,
      extraction: { index: extractionIndex, category: extractionBucket(extractionIndex) },
      decision: null,
      lendingTerms,
    });
  } catch (error) {
    logger.error('GET /api/seer/market-standing failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Failed to compute market standing' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);
