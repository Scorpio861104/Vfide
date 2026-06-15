/**
 * Swap classification (Phase 2 — the buildable part of "authoritative extraction intelligence").
 *
 * Given a transfer and the set of known liquidity/pool/router addresses, classify it as a buy, sell,
 * liquidity event, or ordinary transfer. This is the CLASSIFICATION LOGIC; it upgrades the crude
 * "transfer to a liquidity address = sell" heuristic in signals.ts into an explicit, testable function.
 *
 * HONEST LIMIT (unchanged): truly authoritative classification requires the INDEXER to ingest actual
 * DEX Swap events (with amounts), and the deployment to configure its real pool addresses. This
 * function is correct *given* those inputs; it cannot manufacture them. With no pools configured,
 * everything classifies as 'transfer' and the Extraction Index stays ~Normal (it won't flag anyone) —
 * which is the safe default. Do not treat the index as authoritative until real pools + swap-event
 * indexing are wired and calibrated.
 */

export type TransferClass = 'buy' | 'sell' | 'liquidity_add' | 'liquidity_remove' | 'transfer';

export interface ClassifyInput {
  from: string;
  to: string;
  /** The subject wallet whose behavior we're classifying. */
  subject: string;
  /** Known pool/router addresses (lowercased). */
  liquidityAddresses: ReadonlySet<string>;
  /**
   * Optional: if the indexer provides the matching Swap event, this disambiguates a liquidity-add
   * (provide) from a sell. Without it we fall back to direction heuristics.
   */
  swapEvent?: { isSwap: boolean };
}

export function classifyTransfer(input: ClassifyInput): TransferClass {
  const from = input.from.toLowerCase();
  const to = input.to.toLowerCase();
  const subject = input.subject.toLowerCase();
  const liq = input.liquidityAddresses;

  const fromLiq = liq.has(from);
  const toLiq = liq.has(to);

  // Not involving a pool → ordinary p2p transfer (never counts as extraction).
  if (!fromLiq && !toLiq) return 'transfer';

  // Subject sends INTO a pool.
  if (from === subject && toLiq) {
    // With a real Swap event this is a sell; without it, it could be liquidity provision.
    return input.swapEvent?.isSwap === false ? 'liquidity_add' : 'sell';
  }
  // Subject receives FROM a pool.
  if (to === subject && fromLiq) {
    return input.swapEvent?.isSwap === false ? 'liquidity_remove' : 'buy';
  }
  // Pool-to-pool or third-party movement involving a pool but not the subject directly.
  return 'transfer';
}
