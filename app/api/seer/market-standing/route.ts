/**
 * Market Standing API (Whale Protection — real-data wiring).
 *
 * GET — computes the authenticated participant's full market standing from REAL signals:
 *   Builder Record (merchant/governance/continuity/tenure), Extraction Index (indexed Transfer
 *   history + 90-day decay, persisted), and the discretionary Stability Policy decision.
 *
 * Read-only and address-scoped. It reflects behavior; it changes nothing about anyone's tokens — the
 * policy decision only adjusts VFIDE's own services, and `tokenTransferEffect` is always 'none'.
 *
 * HONESTY: the Extraction Index is only as good as the indexer's classification (see signals.ts —
 * sells are approximated from transfers to configured liquidity addresses). When no liquidity
 * addresses are configured, extraction reads ~Normal rather than inventing risk. Do not let this gate
 * users until calibrated against real data; today it is transparency, not enforcement.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { deriveBuilderSignals, deriveExtractionSignals } from '@/lib/seer/marketStability/signals';
import { computeDeliveryReliability, type DeliveryStats } from '@/lib/seer/deliveryReliability';
import { computeBuilderRecord } from '@/lib/seer/marketStability/builderRecord';
import { computeExtractionIndex, type ExtractionState } from '@/lib/seer/marketStability/extractionIndex';
import { evaluateStabilityPolicy } from '@/lib/seer/marketStability/stabilityPolicy';
import { suggestLoanTerms } from '@/lib/seer/marketStability/lendingPolicy';

export const dynamic = 'force-dynamic';

function getAuthAddress(user: JWTPayload): string | null {
  const a = typeof user.address === 'string' ? user.address.trim().toLowerCase() : '';
  return a ? a : null;
}

async function getHandler(request: NextRequest, user: JWTPayload): Promise<Response> {
  const rl = await withRateLimit(request, 'read');
  if (rl) return rl;
  const address = getAuthAddress(user);
  if (!address) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const now = Date.now();

    // ── Builder Record from real signals ──
    const builderSignals = await deriveBuilderSignals(address);
    const builder = computeBuilderRecord(builderSignals);

    // ── Extraction Index: load prior (for decay), derive fresh signals, recompute, persist ──
    const priorRow = (
      await query<{ index: number; last_updated_at: string }>(
        `SELECT index, last_updated_at FROM extraction_index_state WHERE address = $1`,
        [address],
      )
    ).rows[0];
    const prior: ExtractionState = priorRow
      ? { index: priorRow.index, lastUpdatedAt: new Date(priorRow.last_updated_at).getTime() }
      : { index: 0, lastUpdatedAt: now };

    const exSignals = await deriveExtractionSignals(address);
    const extraction = computeExtractionIndex(prior, exSignals, now);

    await query(
      `INSERT INTO extraction_index_state (address, index, last_updated_at)
       VALUES ($1, $2, to_timestamp($3 / 1000.0))
       ON CONFLICT (address) DO UPDATE SET index = EXCLUDED.index, last_updated_at = EXCLUDED.last_updated_at`,
      [address, extraction.state.index, now],
    );

    // ── ProofScore + verified scam signals (real, best-effort) ──
    const proofScore = await readProofScore(address);
    const { verifiedDisputes, fraudFlags } = await readScamSignals(address);

    // Delivery reliability (marketplace trust signal). A concerning delivery record — chronic
    // not-received reports — is itself a marketplace-fraud signal, so it adds to the scam-signal count
    // that the discretionary policy already consumes. Ownership is never affected.
    const delivery = await readDeliverySignal(address);
    const deliveryConcern = delivery.reliability === 'concerning' ? 1 : 0;

    // ── Discretionary policy decision (never touches tokens) ──
    const decision = evaluateStabilityPolicy({
      impactTier: 0, // per-transaction impact is computed at action time; standing view uses 0
      extractionIndex: extraction.index,
      builder,
      proofScore,
      verifiedDisputes: verifiedDisputes + deliveryConcern,
      fraudFlags,
      monthsSinceLastRelief: null,
    });

    // ── Seer Lending Engine: advisory loan terms from the same real signals ──
    const lendingTerms = suggestLoanTerms({
      proofScore,
      builder,
      extractionIndex: extraction.index,
    });

    return NextResponse.json({
      builder,
      extraction: { index: extraction.index, category: extraction.category, contributingFactors: extraction.contributingFactors },
      decision,
      lendingTerms,
      delivery,
    });
  } catch (err) {
    logger.error('GET /api/seer/market-standing failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Failed to compute market standing' }, { status: 500 });
  }
}

async function readProofScore(address: string): Promise<number> {
  // ProofScore is on-chain; the indexer mirrors ScoreSet events. Use the latest indexed score if any.
  try {
    const row = (
      await query<{ score: string }>(
        `SELECT data->>'newScore' AS score
           FROM indexed_events
          WHERE event_type = 'score' AND lower(data->>'subject') = $1
          ORDER BY block_number DESC LIMIT 1`,
        [address],
      )
    ).rows[0];
    const s = Number(row?.score);
    return Number.isFinite(s) ? s : 5000; // NEUTRAL default
  } catch {
    return 5000;
  }
}

async function readDeliverySignal(address: string) {
  // Aggregate this merchant's shipment outcomes into a delivery-reliability signal (Marketplace Trust).
  try {
    const rows = (
      await query<{ status: string; n: string }>(
        `SELECT status, COUNT(*)::text AS n FROM shipments WHERE merchant_address = $1 GROUP BY status`,
        [address.toLowerCase()],
      )
    ).rows;
    const stats: DeliveryStats = { shipped: 0, deliveredConfirmed: 0, deliveredUnconfirmed: 0, notReceived: 0, returned: 0 };
    for (const r of rows) {
      const n = Number(r.n);
      if (r.status === 'shipped') stats.shipped = n;
      else if (r.status === 'delivered_confirmed') stats.deliveredConfirmed = n;
      else if (r.status === 'delivered_unconfirmed') stats.deliveredUnconfirmed = n;
      else if (r.status === 'not_received') stats.notReceived = n;
      else if (r.status === 'returned') stats.returned = n;
    }
    return computeDeliveryReliability(stats);
  } catch {
    // No shipments table / no data → unproven, contributes nothing.
    return computeDeliveryReliability({ shipped: 0, deliveredConfirmed: 0, deliveredUnconfirmed: 0, notReceived: 0, returned: 0 });
  }
}

async function readScamSignals(address: string): Promise<{ verifiedDisputes: number; fraudFlags: number }> {
  // Now backed by the real disputes table (Fraud & Abuse engine). A dispute UPHELD against this address
  // as the respondent is a verified bad-act signal; refunded disputes are a softer signal counted as
  // disputes. Withdrawn/settled do not count against anyone. Ownership is never affected — these only
  // feed the discretionary policy + marketplace trust.
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
    // fraudFlags = upheld disputes (the strongest signal); verifiedDisputes = upheld + refunded.
    return { verifiedDisputes: upheld + refunded, fraudFlags: upheld };
  } catch {
    return { verifiedDisputes: 0, fraudFlags: 0 };
  }
}

export const GET = withAuth(getHandler);
