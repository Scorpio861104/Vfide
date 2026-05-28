'use client';

/**
 * LookupTab — search any address for its fraud status + complaint history.
 *
 * Reads (no writes here):
 *   • getFraudStatus(target) — aggregate booleans + counters
 *   • getComplaints(target) — full complaint list (reporter, reason, timestamp)
 *   • clearFlagEscrowRefundPending(target) — boolean indicating pending refund work
 *
 * Optional admin actions for any visitor (permissionless):
 *   • processClearFlagEscrowRefunds — push the cursor after DAO cleared a flag
 *   • processDismissedComplaintPenalties — push the cursor after DAO dismissed complaints
 *
 * UI flow: address-input → submit → parallel-fetch reads → render.
 */

import { useState } from 'react';
import { isAddress, type Address } from 'viem';
import {
  Search,
  Loader2,
  AlertCircle,
  Info,
  Clock,
  CheckCircle2,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import {
  useFraudRegistry,
  type FraudStatus,
  type ComplaintRecord,
} from '@/hooks/useFraudRegistry';
import { FraudStatusBadge } from './FraudStatusBadge';

const CLEANUP_BATCH_SIZE = 25n;

function truncate(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatTimestamp(seconds: bigint): string {
  return new Date(Number(seconds) * 1000).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function LookupTab() {
  const fr = useFraudRegistry();
  const [input, setInput] = useState('');
  const [target, setTarget] = useState<Address | null>(null);
  const [status, setStatus] = useState<FraudStatus | null>(null);
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [clearFlagPending, setClearFlagPending] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cleanupError, setCleanupError] = useState<string | null>(null);
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);

  const handleSearch = async () => {
    setError(null);
    setCleanupError(null);
    setCleanupMessage(null);
    setStatus(null);
    setComplaints([]);
    setClearFlagPending(false);

    const addr = input.trim();
    if (!isAddress(addr)) {
      setError('Enter a valid Ethereum address.');
      return;
    }
    setTarget(addr as Address);
    setLoading(true);
    try {
      const [s, c, pending] = await Promise.all([
        fr.fetchStatus(addr as Address),
        fr.fetchComplaints(addr as Address),
        fr.fetchClearFlagPending(addr as Address),
      ]);
      if (!s) {
        setError('Unable to fetch fraud status. Is the registry deployed for this network?');
      } else {
        setStatus(s);
        setComplaints(c);
        setClearFlagPending(pending);
      }
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || 'Lookup failed.');
    } finally {
      setLoading(false);
    }
  };

  const refreshTarget = async () => {
    if (!target) return;
    const [s, c, pending] = await Promise.all([
      fr.fetchStatus(target),
      fr.fetchComplaints(target),
      fr.fetchClearFlagPending(target),
    ]);
    if (s) setStatus(s);
    setComplaints(c);
    setClearFlagPending(pending);
  };

  const handleProcessClearFlagRefunds = async () => {
    if (!target) return;
    setCleanupError(null);
    setCleanupMessage(null);
    try {
      await fr.processClearFlagEscrowRefunds(target, CLEANUP_BATCH_SIZE);
      setCleanupMessage(
        `Processed up to ${CLEANUP_BATCH_SIZE.toString()} clear-flag escrow refunds for this target.`
      );
      await refreshTarget();
    } catch (e: any) {
      setCleanupError(e?.shortMessage || e?.message || 'Failed to process refunds.');
    }
  };

  const handleProcessDismissedPenalties = async () => {
    if (!target) return;
    setCleanupError(null);
    setCleanupMessage(null);
    try {
      await fr.processDismissedComplaintPenalties(target, CLEANUP_BATCH_SIZE);
      setCleanupMessage(
        `Processed up to ${CLEANUP_BATCH_SIZE.toString()} dismissed-complaint penalties for this target.`
      );
      await refreshTarget();
    } catch (e: any) {
      setCleanupError(e?.shortMessage || e?.message || 'Failed to process penalties.');
    }
  };

  if (!fr.fraudConfigured) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-8 text-center">
        <AlertCircle className="mx-auto text-amber-400 mb-3" size={28} />
        <p className="text-zinc-100 font-semibold">FraudRegistry is not configured for this environment.</p>
        <p className="text-zinc-400 text-sm mt-1">Set NEXT_PUBLIC_FRAUD_REGISTRY_ADDRESS to enable fraud lookup.</p>
      </div>
    );
  }

  const progressPercent = status
    ? Math.min(100, Math.round((status.totalComplaints / fr.complaintsToFlag) * 100))
    : 0;

  // Show the cleanup section when there's actionable cleanup OR historical complaint context
  const showCleanupSection = status && (clearFlagPending || complaints.length > 0);

  return (
    <div className="space-y-6">
      {/* Search box */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-6">
        <label className="block text-xs uppercase tracking-wide text-zinc-400 mb-2">
          Lookup an address
        </label>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="0x…"
            onKeyDown={(e) => e.key === 'Enter' && void handleSearch()}
            className="flex-1 min-w-[280px] bg-black/40 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-600 focus:border-accent focus:outline-none text-sm font-mono"
          />
          <button
            onClick={() => void handleSearch()}
            disabled={loading || !input.trim()}
            className="px-6 py-2.5 bg-accent hover:bg-accent-light disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-sm rounded-lg transition-colors inline-flex items-center gap-2"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            Search
          </button>
        </div>
        {error && (
          <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-2">
            <AlertCircle size={12} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Results */}
      {status && target && (
        <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-6 space-y-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="text-xs text-zinc-400 uppercase tracking-wide mb-1">Address</div>
              <div className="text-zinc-100 font-mono text-sm break-all">{target}</div>
            </div>
            <FraudStatusBadge status={status} />
          </div>

          {/* Complaint progress */}
          <div>
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="text-zinc-400">Complaints</span>
              <span className="text-zinc-100 tabular-nums">
                {status.totalComplaints} / {fr.complaintsToFlag}
                <span className="text-zinc-500 text-xs ml-2">
                  (threshold to trigger review)
                </span>
              </span>
            </div>
            <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  status.totalComplaints >= fr.complaintsToFlag
                    ? 'bg-red-500'
                    : status.totalComplaints > 0
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* State-specific banners */}
          {status.pendingReview && (
            <div className="rounded-lg bg-orange-500/10 border border-orange-500/30 p-3 flex items-start gap-2">
              <Clock size={14} className="text-orange-300 shrink-0 mt-0.5" />
              <div className="text-sm text-orange-200">
                <p className="font-semibold mb-0.5">Under DAO review</p>
                <p className="text-xs text-orange-300/80">
                  3+ complaints have been filed. Awaiting DAO decision (confirm fraud / dismiss complaints / clear flag).
                  Appeal window: {Math.floor(Number(fr.pendingReviewWindow) / 3600)}h.
                </p>
              </div>
            </div>
          )}
          {status.flagged && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 flex items-start gap-2">
              <AlertCircle size={14} className="text-red-300 shrink-0 mt-0.5" />
              <div className="text-sm text-red-200">
                <p className="font-semibold mb-0.5">Flagged by DAO</p>
                <p className="text-xs text-red-300/80">
                  Flagged on {formatTimestamp(status.flagTimestamp)}. Outgoing transfers are escrowed for{' '}
                  {Math.floor(Number(fr.escrowDuration) / 86400)} days. Pending escrows: {status.pendingEscrowCount.toString()}.
                </p>
                <p className="text-xs text-red-300/60 mt-1">
                  Non-custodial: funds remain the user&apos;s, just delayed. The user keeps full vault custody.
                </p>
              </div>
            </div>
          )}
          {status.permanentlyBanned && (
            <div className="rounded-lg bg-red-600/20 border border-red-600/40 p-3 flex items-start gap-2">
              <AlertCircle size={14} className="text-red-200 shrink-0 mt-0.5" />
              <div className="text-sm text-red-100">
                <p className="font-semibold">Permanently banned</p>
                <p className="text-xs text-red-200/80 mt-0.5">
                  DAO has escalated this address to permanent ban. The address is no longer eligible for protocol services.
                </p>
              </div>
            </div>
          )}

          {/* Complaint list */}
          {complaints.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 mb-3">
                Complaints ({complaints.length})
              </h3>
              <div className="space-y-3">
                {complaints.map((c, i) => (
                  <div
                    key={`${c.reporter}-${c.timestamp.toString()}-${i}`}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg p-3"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap text-xs">
                      <div className="font-mono text-zinc-400">{truncate(c.reporter)}</div>
                      <div className="text-zinc-500">{formatTimestamp(c.timestamp)}</div>
                    </div>
                    <p className="text-sm text-zinc-200 mt-1.5 whitespace-pre-wrap break-words">{c.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500 italic">No complaints on file.</p>
          )}

          {/* DAO follow-up cleanup actions — permissionless, anyone can push the cursor */}
          {showCleanupSection && (
            <div className="rounded-lg bg-zinc-900/50 border border-zinc-800 p-4 space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100 inline-flex items-center gap-2">
                  <RefreshCw size={13} className="text-zinc-400" /> DAO follow-up actions
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Permissionless — anyone can call these to push processing forward after a DAO proposal.
                </p>
              </div>

              {cleanupError && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-2 text-xs text-red-300 flex items-start gap-2">
                  <AlertCircle size={11} className="shrink-0 mt-0.5" />
                  <span>{cleanupError}</span>
                </div>
              )}
              {cleanupMessage && !cleanupError && (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2 text-xs text-emerald-300 flex items-start gap-2">
                  <CheckCircle2 size={11} className="shrink-0 mt-0.5" />
                  <span>{cleanupMessage}</span>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {/* Clear-flag refunds — only shown when precisely pending */}
                {clearFlagPending && (
                  <button
                    onClick={() => void handleProcessClearFlagRefunds()}
                    disabled={fr.isWritePending}
                    className="px-3 py-2 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-lg font-semibold inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {fr.isWritePending ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                    Process clear-flag refunds ({CLEANUP_BATCH_SIZE.toString()})
                  </button>
                )}
                {/* Dismissed-penalty processing — show when target has complaints (contract no-ops gracefully if cursor caught up) */}
                {complaints.length > 0 && (
                  <button
                    onClick={() => void handleProcessDismissedPenalties()}
                    disabled={fr.isWritePending}
                    className="px-3 py-2 text-xs bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-lg font-semibold inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {fr.isWritePending ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={11} />}
                    Process dismissed-complaint penalties ({CLEANUP_BATCH_SIZE.toString()})
                  </button>
                )}
              </div>

              <p className="text-xs text-zinc-500 flex items-start gap-1">
                <Info size={11} className="mt-0.5 shrink-0" />
                <span>
                  These actions take effect only if there is pending work. The contract returns zero processed when the
                  cursor is already caught up.
                </span>
              </p>
            </div>
          )}

          <div className="border-t border-zinc-800 pt-3 text-xs text-zinc-500 flex items-start gap-1">
            <Info size={11} className="mt-0.5 shrink-0" />
            <span>
              Complaints are public on-chain records. Filing a false complaint costs {fr.complaintReporterPenalty} ProofScore if the DAO dismisses it.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
