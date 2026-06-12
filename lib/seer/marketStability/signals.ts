/**
 * Market-stability signal derivation (server-side, real data).
 *
 * Turns VFIDE's real data sources into the inputs the metric engines need:
 *   - Extraction signals from indexed Transfer history.
 *   - Builder signals from merchant profile, continuity, governance, orders, and tenure.
 *
 * Honest limitation: the indexer stores raw Transfer events, not classified DEX swaps. A sell is
 * approximated as a transfer from the user into a known liquidity address. This module is built to
 * consume better data the moment the indexer classifies swaps; until then, treat the Extraction Index
 * as indicative, not authoritative.
 */

import { query } from '@/lib/db';
import type { ExtractionSignals } from './extractionIndex';
import type { BuilderSignals } from './builderRecord';
import { classifyTransfer } from './swapClassification';

/**
 * Known liquidity/pool/router addresses a transfer into which is treated as a likely sell.
 * Populate from config/deployment; empty means sells cannot be classified yet.
 */
export function getLiquidityAddresses(): string[] {
  const raw = process.env.VFIDE_LIQUIDITY_ADDRESSES ?? '';
  return raw
    .split(',')
    .map((address) => address.trim().toLowerCase())
    .filter((address) => /^0x[a-f0-9]{40}$/.test(address));
}

interface TransferRow {
  from: string;
  to: string;
  amount: string;
  block_number: string;
  indexed_at: string;
}

/**
 * Derive extraction signals for an address from indexed Transfer history over a trailing window.
 */
export async function deriveExtractionSignals(address: string, windowDays = 90): Promise<ExtractionSignals> {
  const addr = address.toLowerCase();
  const liquidity = getLiquidityAddresses();

  if (liquidity.length === 0) {
    return {
      highImpactSells: 0,
      sellRebuyCycles: 0,
      rapidRebuys: 0,
      volatilityEvents: 0,
      liquidityDisruptions: 0,
    };
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

  const liquiditySet = new Set(liquidity);
  const sequence: Array<{ kind: 'S' | 'B'; at: number }> = [];

  for (const row of rows) {
    const at = new Date(row.indexed_at).getTime();
    const classification = classifyTransfer({
      from: row.from ?? '',
      to: row.to ?? '',
      subject: addr,
      liquidityAddresses: liquiditySet,
    });

    if (classification === 'sell') sequence.push({ kind: 'S', at });
    else if (classification === 'buy') sequence.push({ kind: 'B', at });
  }

  const sells = sequence.filter((item) => item.kind === 'S').length;
  let rapidRebuys = 0;
  let cycles = 0;

  for (let index = 1; index < sequence.length; index++) {
    const previous = sequence[index - 1];
    const current = sequence[index];
    if (!previous || !current) continue;

    if (previous.kind === 'S' && current.kind === 'B' && current.at - previous.at <= 48 * 3600 * 1000) {
      rapidRebuys++;
    }

    if (index >= 2) {
      const first = sequence[index - 2];
      if (first && first.kind === 'S' && previous.kind === 'B' && current.kind === 'S') {
        cycles++;
      }
    }
  }

  return {
    highImpactSells: sells,
    sellRebuyCycles: cycles,
    rapidRebuys,
    volatilityEvents: 0,
    liquidityDisruptions: 0,
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

  const storeOperations = Number(
    (
      await query<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM merchant_payment_confirmations WHERE merchant_address = $1`,
        [addr],
      )
    ).rows[0]?.c ?? 0,
  );

  const governanceParticipations = Number(
    (
      await query<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM ecosystem_events
          WHERE user_address = $1 AND event_type IN ('GOVERNANCE_PARTICIPATED','PROPOSAL_EXECUTED')`,
        [addr],
      )
    ).rows[0]?.c ?? 0,
  );

  const continuityConfigured =
    Number(
      (
        await query<{ c: string }>(
          `SELECT COUNT(*)::text AS c FROM merchant_succession WHERE merchant_address = $1`,
          [addr],
        )
      ).rows[0]?.c ?? 0,
    ) > 0;

  return {
    isMerchant,
    merchantVerified,
    storeOperations,
    governanceParticipations,
    recoveryConfigured: false,
    continuityConfigured,
    yearsActive,
    successfulDeliveries: 0,
    productListings: 0,
    lendingParticipation: 0,
  };
}
