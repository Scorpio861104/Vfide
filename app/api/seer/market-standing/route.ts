import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import { deriveBuilderSignals, deriveExtractionSignals } from '@/lib/seer/marketStability/signals';
import { computeDeliveryReliability, type DeliveryStats } from '@/lib/seer/deliveryReliability';
import { computeBuilderRecord } from '@/lib/seer/marketStability/builderRecord';
import { computeExtractionIndex, type ExtractionState } from '@/lib/seer/marketStability/extractionIndex';
import { evaluateStabilityPolicy } from '@/lib/seer/marketStability/stabilityPolicy';
import { suggestLoanTerms } from '@/lib/seer/marketStability/lendingPolicy';

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

async function readExtractionIndexState(address: string, now: number): Promise<ExtractionState> {
  try {
    const row = (
      await query<{ idx: number; last_updated_at: string }>(
        `SELECT index AS idx, last_updated_at FROM extraction_index_state WHERE address = $1`,
        [address],
      )
    ).rows[0];
    const idx = row?.idx;
    return typeof idx === 'number' && Number.isFinite(idx)
      ? { index: idx, lastUpdatedAt: new Date(row.last_updated_at).getTime() }
      : { index: 0, lastUpdatedAt: now };
  } catch {
    return { index: 0, lastUpdatedAt: now };
  }
}

async function readDeliverySignal(address: string) {
  try {
    const rows = (
      await query<{ status: string; n: string }>(
        `SELECT status, COUNT(*)::text AS n FROM shipments WHERE merchant_address = $1 GROUP BY status`,
        [address.toLowerCase()],
      )
    ).rows;
    const stats: DeliveryStats = {
      shipped: 0,
      deliveredConfirmed: 0,
      deliveredUnconfirmed: 0,
      notReceived: 0,
      returned: 0,
    };
    for (const row of rows) {
      const count = Number(row.n);
      if (row.status === 'shipped') stats.shipped = count;
      else if (row.status === 'delivered_confirmed') stats.deliveredConfirmed = count;
      else if (row.status === 'delivered_unconfirmed') stats.deliveredUnconfirmed = count;
      else if (row.status === 'not_received') stats.notReceived = count;
      else if (row.status === 'returned') stats.returned = count;
    }
    return computeDeliveryReliability(stats);
  } catch {
    return computeDeliveryReliability({
      shipped: 0,
      deliveredConfirmed: 0,
      deliveredUnconfirmed: 0,
      notReceived: 0,
      returned: 0,
    });
  }
}

async function readScamSignals(address: string): Promise<{ verifiedDisputes: number; fraudFlags: number }> {
  try {
    const row = (
      await query<{ upheld: string; refunded: string }>(
        `SELECT
            COUNT(*) FILTER (WHERE status = 'resolved_upheld')::text AS upheld,
            COUNT(*) FILTER (WHERE status = 'resolved_refunded')::text AS refunded
           FROM disputes WHERE respondent_address = $1`,
        [address],
      )
    ).rows[0];
    const upheld = Number(row?.upheld ?? 0);
    const refunded = Number(row?.refunded ?? 0);
    return { verifiedDisputes: upheld + refunded, fraudFlags: upheld };
  } catch {
    return { verifiedDisputes: 0, fraudFlags: 0 };
  }
}

async function getHandler(request: NextRequest, user: JWTPayload): Promise<Response> {
  const rl = await withRateLimit(request, 'read');
  if (rl) return rl;

  const address = getAuthAddress(user);
  if (!address) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const now = Date.now();
    const proofScore = await readProofScore(address);
    const builderSignals = await deriveBuilderSignals(address);
    const builder = computeBuilderRecord(builderSignals);

    const prior = await readExtractionIndexState(address, now);
    const extractionSignals = await deriveExtractionSignals(address);
    const extraction = computeExtractionIndex(prior, extractionSignals, now);

    await query(
      `INSERT INTO extraction_index_state (address, index, last_updated_at)
       VALUES ($1, $2, to_timestamp($3 / 1000.0))
       ON CONFLICT (address) DO UPDATE SET index = EXCLUDED.index, last_updated_at = EXCLUDED.last_updated_at`,
      [address, extraction.state.index, now],
    );

    const { verifiedDisputes, fraudFlags } = await readScamSignals(address);
    const delivery = await readDeliverySignal(address);
    const deliveryConcern = delivery.reliability === 'concerning' ? 1 : 0;

    const decision = evaluateStabilityPolicy({
      impactTier: 0,
      extractionIndex: extraction.index,
      builder,
      proofScore,
      verifiedDisputes: verifiedDisputes + deliveryConcern,
      fraudFlags,
      monthsSinceLastRelief: null,
    });

    const lendingTerms = suggestLoanTerms({
      proofScore,
      builder,
      extractionIndex: extraction.index,
    });

    return NextResponse.json({
      builder,
      extraction: {
        index: extraction.index,
        category: extraction.category,
        contributingFactors: extraction.contributingFactors,
      },
      decision,
      lendingTerms,
      delivery,
    });
  } catch (error) {
    logger.error('GET /api/seer/market-standing failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Failed to compute market standing' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);
