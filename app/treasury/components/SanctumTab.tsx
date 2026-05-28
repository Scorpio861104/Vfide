'use client';

import Link from 'next/link';
import { Heart, AlertTriangle, ExternalLink } from 'lucide-react';
import { formatEther } from 'viem';
import { useSanctumVault, deriveDisbursementStatus } from '@/hooks/useSanctumVault';

/**
 * Treasury → SanctumTab — rollup view of the Sanctum charity vault.
 *
 * Tier 2 Phase 4 Turn 2 (2026-05-17). Lighter rollup than the deeper
 * /sanctum page (which has its own CharitiesTab + DisbursementsTab + HistoryTab
 * built in Phase 2 + Phase 3). This view exists at /treasury for users who
 * want to see Sanctum in the context of the whole treasury surface.
 *
 * Data source: useSanctumVault (the same hook /sanctum uses). Approve / Reject
 * buttons on pending disbursements route via the URL-param protocol from
 * Phase 3 Turn 1 + Turn 2 — exactly the same pattern as
 * app/sanctum/components/DisbursementsTab.tsx.
 *
 * Deep links into /sanctum for full lifecycle management.
 */
export function SanctumTab({ isConnected }: { isConnected: boolean }) {
  const {
    configured,
    vaultBalance,
    charityCount,
    charities,
    charitiesLoading,
    disbursements,
    disbursementsLoading,
    approvalsRequired,
  } = useSanctumVault();

  // Total executed amount lifetime — sum across all executed disbursements
  const totalDistributed = disbursements
    .filter((d) => d.executed)
    .reduce((sum, d) => sum + d.amount, 0n);

  // Pending disbursements (not yet executed/rejected) for the top of the page
  const pendingDisbursements = disbursements
    .filter((d) => !d.executed && !d.rejected)
    .sort((a, b) => Number(b.proposedAt) - Number(a.proposedAt))
    .slice(0, 5);

  const activeCharities = charities.filter((c) => c.active);

  // ── Not configured ──────────────────────────────────────────────────────
  if (!configured) {
    return (
      <div className="space-y-6">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-amber-400 font-bold mb-1">SanctumVault not configured</h3>
            <p className="text-sm text-zinc-400">
              The SanctumVault contract address is not configured for the current
              network. Charity vault data is unavailable.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const loading = charitiesLoading || disbursementsLoading;

  return (
    <div className="space-y-8">
      {/* Sanctum Overview */}
      <div className="bg-gradient-to-br from-pink-900/20 to-purple-900/20 border border-pink-500/30 rounded-xl p-4 sm:p-6 md:p-8">
        <div className="flex items-center gap-4 mb-6">
          <Heart className="w-12 h-12 text-pink-400" />
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">Sanctum Charity Vault</h2>
            <p className="text-zinc-400">
              Charity-fund channel of the burn-fee distribution
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatTile
            value={formatVFIDECompact(vaultBalance)}
            label="VFIDE Balance"
            sub={`${formatEther(vaultBalance)} VFIDE`}
            valueClass="text-pink-400"
          />
          <StatTile
            value={String(activeCharities.length)}
            label="Active Charities"
            sub={charityCount === activeCharities.length ? '' : `of ${charityCount} registered`}
            valueClass="text-zinc-100"
          />
          <StatTile
            value={formatVFIDECompact(totalDistributed)}
            label="Total Distributed"
            sub={`${formatEther(totalDistributed)} VFIDE`}
            valueClass="text-green-400"
          />
        </div>
      </div>

      {/* Registered Charities */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
          <h3 className="text-xl font-bold text-zinc-100">Registered Charities</h3>
          <Link
            href="/sanctum"
            className="text-accent hover:text-accent text-sm flex items-center gap-1 transition-colors"
          >
            See full Sanctum dashboard <ExternalLink size={12} />
          </Link>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 bg-zinc-900/60 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : activeCharities.length === 0 ? (
          <p className="text-sm text-zinc-500 py-4">
            No charities approved yet. Approvals flow through DAO governance —{' '}
            <Link
              href="/governance?template=approveCharity"
              className="text-accent hover:text-accent underline"
            >
              propose one
            </Link>
            .
          </p>
        ) : (
          <div className="space-y-3">
            {activeCharities.slice(0, 6).map((c) => {
              const totalReceived = disbursements
                .filter((d) => d.executed && d.charity.toLowerCase() === c.address.toLowerCase())
                .reduce((sum, d) => sum + d.amount, 0n);
              return (
                <Link
                  key={c.address}
                  href={`/sanctum/charities/${c.address}`}
                  className="flex items-center justify-between p-4 bg-zinc-900 hover:bg-zinc-900/80 rounded-lg transition-colors group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 bg-pink-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <Heart size={20} className="text-pink-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-zinc-100 font-bold truncate">{c.name}</div>
                      <div className="text-xs text-zinc-400">{c.category}</div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div
                      className="text-accent font-bold tabular-nums"
                      title={`${formatEther(totalReceived)} VFIDE`}
                    >
                      {formatVFIDECompact(totalReceived)}
                    </div>
                    <div className="text-xs text-green-400">Active</div>
                  </div>
                </Link>
              );
            })}
            {activeCharities.length > 6 && (
              <div className="text-center pt-2">
                <Link
                  href="/sanctum"
                  className="text-xs text-zinc-500 hover:text-accent transition-colors"
                >
                  +{activeCharities.length - 6} more · view all in /sanctum
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pending Disbursements */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-zinc-100 mb-6">Pending Disbursements</h3>
        {!isConnected ? (
          <div className="text-center py-8 text-zinc-400 text-sm">
            Connect wallet to see disbursement actions.
          </div>
        ) : loading ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-24 bg-zinc-900/60 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : pendingDisbursements.length === 0 ? (
          <p className="text-sm text-zinc-500 py-4">No pending disbursements right now.</p>
        ) : (
          <div className="space-y-4">
            {pendingDisbursements.map((d) => {
              const status = deriveDisbursementStatus(d, approvalsRequired);
              const isReady = status === 'approved-pending-execution';
              const vetoPrefill = encodeURIComponent(
                JSON.stringify({ sanctumDisbursementId: d.id.toString() }),
              );
              return (
                <div
                  key={d.id.toString()}
                  className="p-4 bg-zinc-900 rounded-lg border border-yellow-500/30"
                >
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/sanctum/charities/${d.charity}`}
                        className="text-zinc-100 font-bold hover:text-accent transition-colors truncate block"
                      >
                        {d.description || `Disbursement #${d.id.toString()}`}
                      </Link>
                      <div
                        className="text-accent font-bold tabular-nums mt-0.5"
                        title={`${formatEther(d.amount)} VFIDE`}
                      >
                        {formatVFIDECompact(d.amount)} VFIDE
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-bold ${
                          isReady ? 'text-green-400' : 'text-yellow-400'
                        }`}
                      >
                        {d.approvalCount}/{approvalsRequired} Approvals
                      </div>
                      <div className="text-xs text-zinc-400">
                        {isReady ? 'Ready to execute' : 'Multi-sig in progress'}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-zinc-700/50">
                    <Link
                      href="/sanctum?tab=disbursements"
                      className="flex-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-bold py-2 rounded-lg text-sm text-center transition-colors flex items-center justify-center gap-1"
                    >
                      View in Sanctum <ExternalLink size={12} />
                    </Link>
                    <Link
                      href={`/governance?template=rejectDisbursement&prefill=${vetoPrefill}`}
                      className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 font-bold py-2 rounded-lg text-sm text-center transition-colors flex items-center justify-center gap-1"
                      title="Open the DAO proposal form to propose vetoing this disbursement"
                    >
                      Veto via DAO <ExternalLink size={12} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DAO disclosure */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-sm text-blue-300">
          Charity-registry changes (approvals, removals) and disbursement vetoes flow through DAO
          governance.{' '}
          <Link href="/sanctum" className="underline hover:text-blue-200">
            Visit /sanctum
          </Link>{' '}
          for the full charity dashboard, including the multi-sig approver flow.
        </p>
      </div>
    </div>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────────────────

function StatTile({
  value,
  label,
  sub,
  valueClass,
}: {
  value: string;
  label: string;
  sub?: string;
  valueClass: string;
}) {
  return (
    <div className="bg-black/30 rounded-lg p-4">
      <div className={`text-3xl font-bold ${valueClass} tabular-nums`}>{value}</div>
      <div className="text-sm text-zinc-400 mt-1">{label}</div>
      {sub && (
        <div className="text-xs text-zinc-500 mt-1 truncate" title={sub}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ─── Utilities ─────────────────────────────────────────────────────────────

function formatVFIDECompact(wei: bigint): string {
  if (wei === 0n) return '0';
  const tokens = Number(wei) / 1e18;
  if (tokens >= 1_000_000_000) return `${(tokens / 1_000_000_000).toFixed(2)}B`;
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  if (tokens >= 1) return tokens.toFixed(2);
  return tokens.toFixed(4);
}
