'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { m } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Coins,
  ExternalLink,
  Loader2,
  Shield,
  XCircle,
} from 'lucide-react';
import {
  useSanctumVault,
  deriveDisbursementStatus,
  type Disbursement,
  type DisbursementStatus,
} from '@/hooks/useSanctumVault';

/**
 * DisbursementsTab — proposal lifecycle for SanctumVault disbursements.
 *
 * Tier 2 Phase 3 Turn 2 (2026-05-17) — converted from hardcoded sample data
 * to real on-chain reads via `useSanctumVault`. Buttons activated per the
 * hybrid governance model uncovered in the Phase 3 entry audit:
 *
 *   • Approvers (multi-sig signers) see direct-call buttons:
 *       - Approve  → SanctumVault.approveDisbursement(id)
 *       - Execute  → SanctumVault.executeDisbursement(id)   (once threshold met)
 *
 *   • Non-approvers see read-only rows + a "Veto via DAO" link that deep-links
 *     to /governance?template=rejectDisbursement&prefill=… using the Q3-A URL
 *     params introduced in Phase 3 Turn 1. The DAO can override approver
 *     decisions via `rejectDisbursement` (onlyDAO).
 *
 * Reject-via-DAO is intentionally available to any wallet, not gated to
 * approvers, since the entire point is non-approver oversight of the approver
 * cohort. The eligibility check (ProofScore floor, cooldown, etc.) is enforced
 * inside the DAO contract — surfacing the prefilled CreateTab is the link.
 */
export function DisbursementsTab({ isConnected: _isConnected }: { isConnected: boolean }) {
  const { address: connectedAddress } = useAccount();
  const {
    configured,
    disbursements,
    disbursementsLoading,
    approvalsRequired,
    isCurrentUserApprover,
    approveDisbursement,
    executeDisbursement,
    isWritePending,
  } = useSanctumVault();

  // Local state tracks which disbursement is currently being approved/executed
  // so a button shows its own spinner while the others stay enabled.
  const [pendingActionId, setPendingActionId] = useState<bigint | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleApprove = async (id: bigint) => {
    setActionError(null);
    setPendingActionId(id);
    try {
      await approveDisbursement(id);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Approval failed');
    } finally {
      setPendingActionId(null);
    }
  };

  const handleExecute = async (id: bigint) => {
    setActionError(null);
    setPendingActionId(id);
    try {
      await executeDisbursement(id);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Execution failed');
    } finally {
      setPendingActionId(null);
    }
  };

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
              network. Disbursement data is unavailable.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────
  if (disbursementsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-zinc-100">Disbursement Proposals</h2>
          <div className="text-sm text-zinc-400">Loading from chain…</div>
        </div>
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 animate-pulse"
            >
              <div className="h-5 w-48 bg-zinc-700 rounded mb-2" />
              <div className="h-4 w-32 bg-zinc-700/70 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────
  if (disbursements.length === 0) {
    return (
      <div className="space-y-6">
        <Header
          isApprover={isCurrentUserApprover}
          connectedAddress={connectedAddress}
        />
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-12 text-center">
          <Coins className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-zinc-300 mb-2">No disbursements yet</h3>
          <p className="text-sm text-zinc-500 max-w-md mx-auto">
            {isCurrentUserApprover
              ? 'Approvers can propose a new disbursement to fund an approved charity.'
              : 'When Sanctum approvers propose disbursements, they will appear here for review and approval.'}
          </p>
        </div>
      </div>
    );
  }

  // ── Sorted: newest first ────────────────────────────────────────────────
  const sorted = disbursements
    .slice()
    .sort((a, b) => Number(b.proposedAt) - Number(a.proposedAt));

  return (
    <div className="space-y-6">
      <Header isApprover={isCurrentUserApprover} connectedAddress={connectedAddress} />

      {actionError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
          <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-300">{actionError}</div>
        </div>
      )}

      <div className="space-y-4">
        {sorted.map((d) => {
          const status = deriveDisbursementStatus(d, approvalsRequired);
          const isCurrentAction = pendingActionId === d.id;
          return (
            <m.div
              key={d.id.toString()}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-800 border border-zinc-700 rounded-xl p-6"
            >
              <DisbursementRow d={d} status={status} approvalsRequired={approvalsRequired} />

              {/* Action row: visible only for non-finalized proposals */}
              {!d.executed && !d.rejected && (
                <div className="mt-4 pt-4 border-t border-zinc-700 flex flex-wrap gap-3 items-center">
                  {isCurrentUserApprover ? (
                    <ApproverActions
                      d={d}
                      status={status}
                      approvalsRequired={approvalsRequired}
                      connectedAddress={connectedAddress}
                      pending={isCurrentAction && isWritePending}
                      onApprove={() => handleApprove(d.id)}
                      onExecute={() => handleExecute(d.id)}
                    />
                  ) : (
                    <NonApproverActions disbursementId={d.id} />
                  )}
                </div>
              )}
            </m.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────────────────

function Header({
  isApprover,
  connectedAddress,
}: {
  isApprover: boolean;
  connectedAddress: `0x${string}` | undefined;
}) {
  return (
    <div className="flex justify-between items-start gap-4 flex-wrap">
      <div>
        <h2 className="text-2xl font-bold text-zinc-100">Disbursement Proposals</h2>
        <p className="text-sm text-zinc-400 mt-1">
          Sanctum approvers propose disbursements; the DAO retains veto via{' '}
          <code className="text-xs text-zinc-300">rejectDisbursement</code>.
        </p>
      </div>
      {connectedAddress && (
        <div
          className={`text-xs px-3 py-1.5 rounded-full ${
            isApprover
              ? 'bg-pink-500/15 text-pink-300 border border-pink-500/30'
              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
          }`}
          title={isApprover ? 'You can propose / approve / execute disbursements' : ''}
        >
          {isApprover ? (
            <>
              <Shield size={12} className="inline mr-1" /> Approver
            </>
          ) : (
            'Read-only · not an approver'
          )}
        </div>
      )}
    </div>
  );
}

function DisbursementRow({
  d,
  status,
  approvalsRequired,
}: {
  d: Disbursement;
  status: DisbursementStatus;
  approvalsRequired: number;
}) {
  return (
    <div className="flex flex-wrap justify-between items-center gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-zinc-100 font-bold">
            {d.description || `Disbursement #${d.id.toString()}`}
          </div>
          <StatusBadge status={status} />
        </div>
        <div className="text-sm text-zinc-400 mt-1">
          <Link
            href={`/sanctum/charities/${d.charity}`}
            className="text-accent hover:text-accent transition-colors"
          >
            {shortAddr(d.charity)}
          </Link>
          {' · '}
          Proposal #{d.id.toString()}
          {' · '}
          {formatTimestamp(d.proposedAt)}
        </div>
        {d.rejected && d.rejectionReason && (
          <div className="mt-2 text-xs text-red-300/80 bg-red-500/10 border border-red-500/20 rounded px-2 py-1 inline-block">
            Reason: {d.rejectionReason}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-pink-400" title={`${formatEther(d.amount)} VFIDE`}>
        {formatVFIDECompact(d.amount)}
      </div>
      <div className="flex items-center gap-4 text-center">
        <div>
          <div className="text-zinc-100 font-bold tabular-nums">
            {d.approvalCount}/{approvalsRequired}
          </div>
          <div className="text-xs text-zinc-400">Approvals</div>
        </div>
      </div>
    </div>
  );
}

function ApproverActions({
  d,
  status,
  approvalsRequired,
  connectedAddress: _connectedAddress,
  pending,
  onApprove,
  onExecute,
}: {
  d: Disbursement;
  status: DisbursementStatus;
  approvalsRequired: number;
  connectedAddress: `0x${string}` | undefined;
  pending: boolean;
  onApprove: () => void;
  onExecute: () => void;
}) {
  const canApprove =
    status === 'pending' && d.approvalCount < approvalsRequired && !pending;
  const readyForExecution = d.approvalCount >= approvalsRequired && !pending;

  // Client-side hint for the contract's 24h cooling-off requirement
  const proposedAtMs = Number(d.proposedAt) * 1000;
  const nowMs = Date.now();
  const cooloffEndsAtMs = proposedAtMs + 24 * 60 * 60 * 1000;
  const inCooloff = nowMs < cooloffEndsAtMs;
  const expiryMs = proposedAtMs + 90 * 24 * 60 * 60 * 1000;
  const isExpired = nowMs >= expiryMs;

  return (
    <div className="flex gap-2 flex-wrap items-center">
      {canApprove && (
        <button
          onClick={onApprove}
          disabled={pending}
          className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Approve
        </button>
      )}

      {status === 'approved-pending-execution' && (
        <button
          onClick={onExecute}
          disabled={!readyForExecution || inCooloff || isExpired}
          title={
            isExpired
              ? 'Proposal expired (>90 days since proposal).'
              : inCooloff
                ? `Execution unlocks ${new Date(cooloffEndsAtMs).toLocaleString()}.`
                : ''
          }
          className="px-4 py-2 bg-accent/20 hover:bg-accent/30 text-accent border border-accent/30 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
          {isExpired ? 'Expired' : inCooloff ? 'In cooloff' : 'Execute'}
        </button>
      )}

      {/* Approvers can also propose DAO veto for any pending disbursement */}
      <VetoLink disbursementId={d.id} />
    </div>
  );
}

function NonApproverActions({ disbursementId }: { disbursementId: bigint }) {
  return <VetoLink disbursementId={disbursementId} />;
}

function VetoLink({ disbursementId }: { disbursementId: bigint }) {
  // URL-param protocol (Q3-A, Phase 3 Turn 1). Deep-link into CreateTab with
  // the rejectDisbursement template pre-selected and the id pre-filled.
  const prefill = encodeURIComponent(
    JSON.stringify({ sanctumDisbursementId: disbursementId.toString() }),
  );
  const href = `/governance?template=rejectDisbursement&prefill=${prefill}`;
  return (
    <Link
      href={href}
      className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
      title="Open the DAO proposal form to propose vetoing this disbursement"
    >
      <XCircle className="w-4 h-4" />
      Veto via DAO
      <ExternalLink size={12} />
    </Link>
  );
}

function StatusBadge({ status }: { status: DisbursementStatus }) {
  const styles: Record<DisbursementStatus, string> = {
    executed: 'bg-green-500/20 text-green-400',
    rejected: 'bg-red-500/20 text-red-400',
    'approved-pending-execution': 'bg-amber-500/20 text-amber-400',
    pending: 'bg-zinc-700/40 text-zinc-400',
  };
  const labels: Record<DisbursementStatus, string> = {
    executed: 'Executed',
    rejected: 'Rejected',
    'approved-pending-execution': 'Ready to execute',
    pending: 'Pending approvals',
  };
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

// ─── Utilities ─────────────────────────────────────────────────────────────

function shortAddr(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatVFIDECompact(wei: bigint): string {
  if (wei === 0n) return '0';
  const tokens = Number(wei) / 1e18;
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  if (tokens >= 1) return tokens.toFixed(2);
  return tokens.toFixed(4);
}

function formatTimestamp(unixSec: bigint): string {
  if (unixSec === 0n) return '—';
  const ms = Number(unixSec) * 1000;
  try {
    return new Date(ms).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}
