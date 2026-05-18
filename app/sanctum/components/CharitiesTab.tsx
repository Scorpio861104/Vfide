'use client';

import Link from 'next/link';
import { CheckCircle, ExternalLink, Heart, AlertTriangle } from 'lucide-react';
import { formatEther } from 'viem';
import { useSanctumVault } from '@/hooks/useSanctumVault';

/**
 * CharitiesTab — list of DAO-approved charities receiving Sanctum disbursements.
 *
 * Data source: SanctumVault contract (Tier 2 Phase 2 — 2026-05-17 conversion
 * from hardcoded sample data to real on-chain reads via `useSanctumVault`).
 *
 * Fields displayed:
 *   • name, category, active, addedAt          — from getCharityInfo()
 *   • totalReceived (aggregated)               — summed from executed disbursements
 *                                                 where recipient == this charity
 *
 * Fields removed compared to the sample-data version:
 *   • "verified" — there is no `verified` flag on-chain. A charity is simply
 *     in the registry (active=true) or not. The list itself IS the
 *     DAO-verified set since `approveCharity` is DAO-gated.
 *   • "status" — collapsed into a single active/inactive boolean.
 */
export function CharitiesTab() {
  const {
    configured,
    charities,
    charitiesLoading,
    disbursements,
  } = useSanctumVault();

  // Aggregate total executed disbursements per charity address.
  const totalsByCharity = new Map<string, bigint>();
  for (const d of disbursements) {
    if (!d.executed) continue;
    const key = d.charity.toLowerCase();
    totalsByCharity.set(key, (totalsByCharity.get(key) ?? 0n) + d.amount);
  }

  // ── Not configured (no SanctumVault address) ────────────────────────────
  if (!configured) {
    return (
      <div className="space-y-6">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-amber-400 font-bold mb-1">SanctumVault not configured</h3>
            <p className="text-sm text-zinc-400">
              The SanctumVault contract address is not configured for the current
              network. Charity registry data is unavailable.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────
  if (charitiesLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-zinc-100">Approved Charities</h2>
          <div className="text-sm text-zinc-400">Loading from chain…</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 animate-pulse"
            >
              <div className="h-5 w-40 bg-zinc-700 rounded mb-2" />
              <div className="h-4 w-24 bg-zinc-700/70 rounded mb-6" />
              <div className="h-8 w-32 bg-zinc-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────
  if (charities.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-zinc-100">Approved Charities</h2>
          <div className="text-sm text-zinc-400">DAO-verified organizations</div>
        </div>
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-12 text-center">
          <Heart className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-zinc-300 mb-2">No charities approved yet</h3>
          <p className="text-sm text-zinc-500 max-w-md mx-auto">
            Charities are added through DAO governance proposals. When a proposal
            to approve a charity passes, it will appear here.
          </p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-center">
          <p className="text-blue-400 text-sm">
            Want to propose a new charity? Submit a governance proposal in the DAO section.
          </p>
        </div>
      </div>
    );
  }

  // ── Real data ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-zinc-100">Approved Charities</h2>
        <div className="text-sm text-zinc-400">
          {charities.length} {charities.length === 1 ? 'charity' : 'charities'} · DAO-verified
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {charities.map((charity) => {
          const totalReceived = totalsByCharity.get(charity.address.toLowerCase()) ?? 0n;
          const totalReceivedFormatted = formatEther(totalReceived);
          return (
            <div
              key={charity.address}
              className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 hover:border-pink-500/50 transition-colors"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-zinc-100 truncate">{charity.name}</h3>
                    {charity.active && (
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    )}
                  </div>
                  <div className="text-sm text-zinc-400">{charity.category}</div>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    charity.active
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-zinc-700/40 text-zinc-500'
                  }`}
                >
                  {charity.active ? 'active' : 'inactive'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-2xl font-bold text-pink-400" title={`${totalReceivedFormatted} VFIDE`}>
                    {formatVFIDECompact(totalReceived)}
                  </div>
                  <div className="text-xs text-zinc-400">VFIDE received</div>
                </div>
                <Link
                  href={`/sanctum/charities/${charity.address}`}
                  className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1 transition-colors"
                >
                  View Details <ExternalLink size={12} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-center">
        <p className="text-blue-400 text-sm">
          Want to propose a new charity? Submit a governance proposal in the DAO section.
        </p>
      </div>
    </div>
  );
}

/**
 * Compact VFIDE display ("12.5K", "1.2M") for headline numbers. The full value
 * is shown on hover via `title`.
 */
function formatVFIDECompact(wei: bigint): string {
  if (wei === 0n) return '0';
  // Convert to whole tokens (ignoring fractional below 0.01 for display purposes).
  const tokens = Number(wei) / 1e18;
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  if (tokens >= 1) return tokens.toFixed(2);
  return tokens.toFixed(4);
}
