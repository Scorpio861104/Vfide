/**
 * Marketplace fair-ordering helper (Commerce Phase 5 follow-up).
 *
 * The public marketplace renders a product grid, but the certified fair-ranking engine (/api/discovery,
 * lib/seer/discovery.ts) ranks MERCHANTS — relevance-first, with NO wealth/holdings/paid input. This helper
 * bridges the two: given the discovery engine's merchant ranking, it orders a product list so products from
 * higher-ranked (fairer-standing) merchants surface first, preserving the product-card UI.
 *
 * Invariants (mirrored by the page + tested):
 *   • Discovery only ever RE-ORDERS — it never filters/hides products. An empty ranking (outage) is a no-op.
 *   • The sort is STABLE: within a merchant (and among unranked merchants) the server's original order is kept.
 *   • Products whose merchant isn't in the ranking fall to the END (after all ranked merchants).
 *   • No wealth/price/paid signal participates here — ordering is purely by the merchant's fair discovery rank.
 */

/** Build a merchantAddress(lowercased) → rank-index map from /api/discovery results (idx 0 = best standing). */
export function buildMerchantRank(results: Array<{ merchantAddress?: unknown }> | null | undefined): Map<string, number> {
  const rank = new Map<string, number>();
  if (!Array.isArray(results)) return rank;
  results.forEach((m, idx) => {
    if (typeof m?.merchantAddress === 'string') {
      const key = m.merchantAddress.toLowerCase();
      if (!rank.has(key)) rank.set(key, idx); // first occurrence wins (engine already ranked)
    }
  });
  return rank;
}

/**
 * Order products by their merchant's fair discovery rank. Stable; unranked merchants last. If `rank` is empty,
 * returns the input order unchanged (discovery re-orders, never hides — a discovery outage can't drop products).
 */
export function orderProductsByMerchantRank<T extends { merchant_address?: unknown }>(
  products: T[],
  rank: Map<string, number>,
): T[] {
  if (rank.size === 0) return products;
  const rankOf = (p: T): number => {
    const addr = typeof p?.merchant_address === 'string' ? p.merchant_address.toLowerCase() : '';
    const r = rank.get(addr);
    return r === undefined ? Number.MAX_SAFE_INTEGER : r;
  };
  return products
    .map((p, i) => ({ p, i }))
    .sort((a, b) => rankOf(a.p) - rankOf(b.p) || a.i - b.i) // tie-break on original index → stable
    .map((x) => x.p);
}
