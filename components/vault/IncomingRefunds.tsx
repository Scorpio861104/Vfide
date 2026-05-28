'use client';

/**
 * IncomingRefunds — customer-side visibility for incoming on-chain refunds.
 *
 * When a merchant initiates a refund against this wallet, this component
 * surfaces it: "Merchant X initiated a refund of Y tokens for order Z."
 * The customer can see the lifecycle: initiated → completed (or expired
 * if the merchant didn't complete within 30 days).
 *
 * Renders null when there are no refunds, so the dashboard stays clean
 * during normal operation. The customer-facing equivalent of the merchant's
 * /merchant/refunds page; uses the same useRefundHistory hook with
 * role='customer'.
 *
 * Visual design:
 *   - Compact card (not full-width like OwnerChallengeBanner)
 *   - Initiated: cyan, "merchant initiated a refund, waiting for completion"
 *   - Completed: emerald, "refund received"
 *   - Expired: amber, "merchant did not complete within 30 days"
 *
 * Why this matters:
 *   The contract lets a merchant initiate a refund but doesn't immediately
 *   transfer the tokens — there's a deliberate gap between initiate and
 *   complete so the merchant can pause or cancel. Without this surface,
 *   a customer would only see the refund when it actually arrives, with
 *   no visibility into the merchant's intent or timing.
 *
 * Limitation inherited from useRefundHistory:
 *   Event-based enumeration. RPC must support eth_getLogs for the contract
 *   address with reasonable history. For Base mainnet this is fine.
 */

import { motion } from 'framer-motion';
import { formatEther } from 'viem';
import { Inbox, CheckCircle2, Clock, AlertTriangle, RotateCcw } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useRefundHistory, type RefundEntry } from '@/hooks/useRefundHistory';

function shortAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatTimestamp(unixSeconds: number): string {
  if (!unixSeconds) return '—';
  return new Date(unixSeconds * 1000).toLocaleString();
}

/**
 * Days until the merchant must complete this refund (or "Expired" / "Done").
 * Returns null for non-initiated states (no action expected).
 */
function timeToExpiry(entry: RefundEntry): string | null {
  if (entry.status !== 'initiated') return null;
  if (!entry.initiatedAt) return null;
  const nowSec = Math.floor(Date.now() / 1000);
  const elapsed = nowSec - entry.initiatedAt;
  const windowSec = 30 * 86_400;
  const remaining = windowSec - elapsed;
  if (remaining <= 0) return 'Expired';
  const days = Math.floor(remaining / 86_400);
  const hours = Math.floor((remaining % 86_400) / 3600);
  if (days > 0) return `${days}d ${hours}h until expiry`;
  return `${hours}h until expiry`;
}

function statusBadge(status: RefundEntry['status']) {
  switch (status) {
    case 'initiated':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent/20 text-accent text-xs font-semibold">
          <Clock size={10} />
          Waiting on merchant
        </span>
      );
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-xs font-semibold">
          <CheckCircle2 size={10} />
          Received
        </span>
      );
    case 'expired':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-xs font-semibold">
          <AlertTriangle size={10} />
          Expired
        </span>
      );
  }
}

export function IncomingRefunds() {
  const { entries, isLoading, error } = useRefundHistory('customer');

  // No refunds — render nothing. Common case, clean dashboard.
  if (!isLoading && !error && entries.length === 0) return null;

  // Don't show loading state on the dashboard (it's transient and clutters
  // an empty surface). If we have data, show it; if there's an error, show it.
  if (isLoading) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <GlassCard hover={false} className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
            <Inbox className="text-accent" size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white">Refunds</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Refunds merchants have initiated for orders you placed
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300">
            Failed to load: {error}
          </div>
        )}

        {!error && entries.length > 0 && (
          <div className="space-y-2">
            {entries.map((entry) => {
              const ttle = timeToExpiry(entry);
              return (
                <div
                  key={`${entry.orderId}-${entry.initiatedBlock}`}
                  className="p-3 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <RotateCcw size={12} className="text-accent shrink-0" />
                        <p className="text-sm font-semibold text-white truncate">
                          Order: {entry.orderId}
                        </p>
                        {statusBadge(entry.status)}
                      </div>
                      <p className="text-xs text-gray-500 font-mono mt-1">
                        From: {shortAddress(entry.merchant)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Initiated: {formatTimestamp(entry.initiatedAt)}
                        {entry.completedAt && (
                          <span> · Completed: {formatTimestamp(entry.completedAt)}</span>
                        )}
                      </p>
                      {ttle && (
                        <p
                          className={`text-xs mt-1 ${
                            ttle === 'Expired' ? 'text-red-300' : 'text-accent'
                          }`}
                        >
                          {ttle}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-bold text-white">{formatEther(entry.amount)}</p>
                      <p className="text-xs text-gray-500">tokens</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-gray-500 mt-4 leading-relaxed">
          Merchants have 30 days to complete a refund they initiate. If you see an &quot;Expired&quot;
          status, the merchant didn&apos;t complete the transfer in time — contact them or reach
          out to the DAO.
        </p>
      </GlassCard>
    </motion.div>
  );
}
