/**
 * Market-stability signal derivation (server-side, real data).
 *
 * Turns VFIDE's REAL data sources into the inputs the metric engines need:
 *   • Extraction signals ← `indexed_events` Transfer history (the indexer already stores ERC-20
 *     Transfer events as JSONB with from/to/amount, GIN-indexed on from/to).
 *   • Builder signals ← merchant profile/verification, continuity, governance (ecosystem_events),
 *     orders, and account tenure.
 *
 * HONEST LIMITATION (read this): the indexer stores raw `Transfer` events, not classified DEX swaps.
 * So a "sell" is APPROXIMATED as a transfer from the user INTO a known liquidity/pool/router address.
 * Without a swap-classifying indexer, sell-vs-rebuy and cycle detection are heuristic. This module is
 * built to consume better data the moment the indexer classifies swaps; until then, treat the
 * Extraction Index as indicative, not authoritative — and never let it auto-gate anyone (the policy
 * engine already routes only to discretionary services, with DAO review).
 *
 * All reads are server-side and address-scoped. This is computation over public on-chain data; it
 * controls nothing.
 */

import { query } from '@/lib/db';
import type { ExtractionSignals } from './extractionIndex';
import type { BuilderSignals } from './builderRecord';
import { classifyTransfer } from './swapClassification';

/**
 * Known liquidity/pool/router addresses a transfer INTO which is treated as a likely "sell".
 * Populate from config/deployment; empty = sells can't be classified yet (Extraction stays ~Normal).
 */
export function getLiquidityAddresses(): string[] {
  const raw = process.env.VFIDE_LIQUIDITY_ADDRESSES ?? '';
  return raw.split(',').map((a) => a.trim().toLowerCase()).filter((a) => /^0x[a-f0-9]{40}$/.test(a));
}

interface TransferRow { from: string; to: string; amount: string; block_number: string; indexed_at: string }

/**
 * Derive extraction signals for an address from indexed Transfer history over a trailing window.
 * Heuristic: outflows to liquidity = sells; inflows from liquidity shortly after = rebuys; alternating
 * sell→buy→sell within the window = cycles.
 */
export async function deriveExtractionSignals(address: string, windowDays = 90): Promise<ExtractionSignals> {
  const addr = address.toLowerCase();
  const liquidity = getLiquidityAddresses();

  // No liquidity addresses configured → we cannot honestly classify sells. Return a near-zero signal
  // rather than inventing extraction from ordinary transfers.
  if (liquidity.length === 0) {
    return { highImpactSells: 0, sellRebuyCycles: 0, rapidRebuys: 0, volatilityEvents: 0, liquidityDisruptions: 0 };
  }

  const sinceClause = `indexed_at > NOW() - INTERVAL '${Math.max(1, Math.floor(windowDays))} days'`;
  const rows = (
    await query<TransferRow>(
      `SELECT data->>'from' AS from, data->>'to' AS to, data->>'amount' AS amount,
              block_number, indexed_at
         FROM indexed_events
        WHERE event_type = 'transfer'
          AND (lower(data->>'from') = $1 OR lower(data->>'to') = $1)
          AND ${sinceClause}
        ORDER BY block_number ASC`,
      [addr],
    )
  ).rows;

  const liqSet = new Set(liquidity);
  // Build a chronological sequence of this address's sells (S) and buys (B) vs liquidity, using the
  // shared, unit-tested classifier (rather than ad-hoc inline logic). This is the same classification
  // path that becomes authoritative once the indexer supplies real Swap events.
  const seq: Array<{ kind: 'S' | 'B'; at: number }> = [];
  for (const r of rows) {
    const at = new Date(r.indexed_at).getTime();
    const cls = classifyTransfer({ from: r.from ?? '', to: r.to ?? '', subject: addr, liquidityAddresses: liqSet });
    if (cls === 'sell') seq.push({ kind: 'S', at });
    else if (cls === 'buy') seq.push({ kind: 'B', at });
  }

  const sells = seq.filter((s) => s.kind === 'S').length;
  // Rapid rebuy: a B within 48h after an S.
  let rapidRebuys = 0;
  let cycles = 0;
  for (let i = 1; i < seq.length; i++) {
    const prevItem = seq[i - 1];
    const curItem = seq[i];
    if (!prevItem || !curItem) continue;
    if (prevItem.kind === 'S' && curItem.kind === 'B' && curItem.at - prevItem.at <= 48 * 3600 * 1000) {
      rapidRebuys++;
    }
    // S→B→S signature counted as a cycle.
    if (i >= 2) {
      const a = seq[i - 2];
      if (a && prevItem && curItem && a.kind === 'S' && prevItem.kind === 'B' && curItem.kind === 'S') cycles++;
    }
  }

  return {
    highImpactSells: sells, // without per-tx impact, treat each classified sell as a signal unit
    sellRebuyCycles: cycles,
    rapidRebuys,
    volatilityEvents: 0, // requires price/volatility indexing — not available yet
    liquidityDisruptions: 0, // requires pool-depth indexing — not available yet
  };
}

/** Derive builder signals from real subsystems. Best-effort; missing pieces count as zero/false. */
export async function deriveBuilderSignals(address: string): Promise<BuilderSignals> {
  const addr = address.toLowerCase();

  const profile = (
    await query<{ display_name: string | null; verified_at: string | null; created_at: string }>(
      `SELECT display_name, verified_at, created_at FROM merchant_profiles WHERE merchant_address = $1`,
      [addr],
    )
  ).rows[0];

  const isMerchant = !!profile?.display_name;
  const merchantVerified = !!profile?.verified_at;
  const yearsActive = profile?.created_at
    ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (365 * 24 * 3600 * 1000))
    : 0;

  const storeOps = Number(
    (await query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM merchant_payment_confirmations WHERE merchant_address = $1`,
      [addr],
    )).rows[0]?.c ?? 0,
  );

  // Governance participation from the durable ecosystem event log (Wave 47).
  const govCount = Number(
    (await query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM ecosystem_events
        WHERE user_address = $1 AND event_type IN ('GOVERNANCE_PARTICIPATED','PROPOSAL_EXECUTED')`,
      [addr],
    )).rows[0]?.c ?? 0,
  );

  const hasSuccession = Number(
    (await query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM merchant_succession WHERE merchant_address = $1`,
      [addr],
    )).rows[0]?.c ?? 0,
  ) > 0;

  // Confirmed deliveries — real fulfillment signal (Wave 78: was hardcoded 0).
  const successfulDeliveries = Number(
    (await query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM shipments WHERE merchant_address = $1 AND status = 'delivered_confirmed'`,
      [addr],
    )).rows[0]?.c ?? 0,
  );

  // Active product listings — real catalog signal (Wave 78: was hardcoded 0).
  const productListings = Number(
    (await query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM merchant_products WHERE merchant_address = $1`,
      [addr],
    )).rows[0]?.c ?? 0,
  );

  // P2P lending participation in good standing (as lender or borrower) — real signal (Wave 78: was 0).
  const lendingParticipation = Number(
    (await query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM loans
        WHERE (lender_address = $1 OR borrower_address = $1) AND status IN ('active','repaid')`,
      [addr],
    )).rows[0]?.c ?? 0,
  );

  return {
    isMerchant,
    merchantVerified,
    storeOperations: storeOps,
    governanceParticipations: govCount,
    recoveryConfigured: false, // on-chain guardian/recovery state; read client-side, not in this DB pass
    continuityConfigured: hasSuccession,
    yearsActive,
    successfulDeliveries,
    productListings,
    lendingParticipation,
  };
}
