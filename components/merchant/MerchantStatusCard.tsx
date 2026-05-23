'use client';

/**
 * MerchantStatusCard — surfaces merchant identity + strike counters.
 *
 * Reads from useMerchantRegistry. Shows:
 *   - Registration status badge (Active / Suspended / Delisted / Not registered)
 *   - Vault address (the funds destination for incoming payments)
 *   - Refund strike count + auto-suspend threshold ("X / Y before review")
 *   - Dispute strike count + auto-suspend threshold
 *   - Inline warnings when strikes approach the threshold
 *
 * Why this surface exists:
 *   The MerchantDashboard already knows a merchant is registered (it's
 *   inside the registered-merchant branch when this renders) but doesn't
 *   show any strike accountability data. Auto-suspend thresholds matter
 *   to merchants — "you're at 4 of 5 refunds before automatic review" is
 *   actionable information. Without surfacing it, merchants only learn
 *   about strikes when they're already suspended.
 *
 * POW-1 decay caveat (also documented in useMerchantRegistry):
 *   The strike counts shown are raw on-chain values, not post-decay. The
 *   contract decays one strike per 90-day clean window. So a merchant
 *   sitting at "4 refunds" might effectively be at 2 or 3 if their last
 *   strikes were >90 days ago. The contract evaluates decay at the moment
 *   of the next strike, not continuously. For display purposes, raw
 *   on-chain values are what the contract sees right now and what would
 *   be checked against the threshold for the next strike.
 *
 * Not yet exposed (Phase 3a only does registry-side):
 *   - Cross-system display showing MerchantPortal.merchants entry alongside
 *     MerchantRegistry.merchants entry (per Phase 0 Decision 1, these are
 *     parallel systems with no on-chain sync). Phase 3b/3c will add the
 *     MerchantPortal side.
 */

import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Store, AlertTriangle, ExternalLink, CheckCircle2, Ban, Pause } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useMerchantRegistry } from '@/hooks/useMerchantRegistry';

function shortAddress(addr: string | undefined): string {
  if (!addr || addr.length < 10) return addr || '—';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

interface StrikeIndicatorProps {
  label: string;
  count: number;
  threshold: number | undefined;
  /** Optional helper text under the indicator. */
  hint?: string;
}

/**
 * Single strike bar with bucket dots and warning text near the threshold.
 *
 * If threshold is undefined (still loading) we degrade gracefully —
 * show the count without comparing.
 */
function StrikeIndicator({ label, count, threshold, hint }: StrikeIndicatorProps) {
  const hasThreshold = threshold !== undefined && threshold > 0;
  const ratio = hasThreshold ? count / threshold! : 0;
  const isWarning = hasThreshold && ratio >= 0.6 && ratio < 1;
  const isCritical = hasThreshold && count >= threshold!;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">{label}</p>
        <p
          className={`text-sm font-bold ${
            isCritical ? 'text-red-300' : isWarning ? 'text-amber-300' : 'text-white'
          }`}
        >
          {count}
          {hasThreshold && <span className="text-gray-500"> / {threshold}</span>}
        </p>
      </div>
      {/* Visual bar — bucket dots */}
      {hasThreshold && (
        <div className="flex gap-1">
          {Array.from({ length: threshold! }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1.5 rounded-full ${
                i < count
                  ? isCritical
                    ? 'bg-red-400'
                    : isWarning
                      ? 'bg-amber-400'
                      : 'bg-cyan-400'
                  : 'bg-white/10'
              }`}
            />
          ))}
        </div>
      )}
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
      {isWarning && (
        <p className="text-xs text-amber-300 flex items-center gap-1">
          <AlertTriangle size={12} />
          Approaching auto-suspend threshold
        </p>
      )}
      {isCritical && (
        <p className="text-xs text-red-300 flex items-center gap-1">
          <AlertTriangle size={12} />
          At or past threshold — next strike triggers review
        </p>
      )}
    </div>
  );
}

export function MerchantStatusCard() {
  const { address } = useAccount();
  const {
    merchant,
    isLoadingInfo,
    isRegistered,
    isActive,
    isSuspended,
    isDelisted,
    autoSuspendRefunds,
    autoSuspendDisputes,
    registryConfigured,
  } = useMerchantRegistry();

  // Defensive rendering: this card is for merchants. If the wallet isn't
  // a merchant at all, render nothing — the parent MerchantDashboard has
  // its own "become a merchant" UI for that case.
  if (!address || !registryConfigured || isLoadingInfo || !isRegistered || !merchant) {
    return null;
  }

  const statusBadge = (() => {
    if (isActive) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-300 text-xs font-semibold">
          <CheckCircle2 size={12} />
          Active
        </span>
      );
    }
    if (isSuspended) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/20 text-amber-300 text-xs font-semibold">
          <Pause size={12} />
          Suspended
        </span>
      );
    }
    if (isDelisted) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/20 text-red-300 text-xs font-semibold">
          <Ban size={12} />
          Delisted
        </span>
      );
    }
    return null;
  })();

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <GlassCard hover={false} className="p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <Store className="text-cyan-300" size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Merchant identity
                {statusBadge}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5 font-mono">
                Vault: {shortAddress(merchant.vault)}
              </p>
            </div>
          </div>
          <Link
            href="/merchant/profile/edit"
            className="text-xs text-cyan-300 hover:text-cyan-200 inline-flex items-center gap-1"
          >
            Edit profile
            <ExternalLink size={12} />
          </Link>
        </div>

        {/* Status-specific banners */}
        {isSuspended && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-start gap-2">
              <AlertTriangle className="text-amber-400 mt-0.5 shrink-0" size={14} />
              <div className="text-xs text-amber-200">
                <p className="font-semibold mb-1">Account suspended</p>
                <p className="text-amber-200/80">
                  Your merchant account is temporarily suspended. The DAO can review and reinstate
                  it if you reach out. Payments to your vault will be rejected while suspended.
                </p>
              </div>
            </div>
          </div>
        )}

        {isDelisted && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <div className="flex items-start gap-2">
              <Ban className="text-red-400 mt-0.5 shrink-0" size={14} />
              <div className="text-xs text-red-200">
                <p className="font-semibold mb-1">Account permanently delisted</p>
                <p className="text-red-200/80">
                  This decision is permanent and cannot be reversed by the DAO. A new merchant
                  identity would require a new wallet and a new vault.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Strike counters — only meaningful for Active merchants */}
        {isActive && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StrikeIndicator
              label="Refund strikes"
              count={merchant.refunds}
              threshold={autoSuspendRefunds}
              hint="Refunds in the rolling 90-day window"
            />
            <StrikeIndicator
              label="Dispute strikes"
              count={merchant.disputes}
              threshold={autoSuspendDisputes}
              hint="Disputes in the rolling 90-day window"
            />
          </div>
        )}

        {isActive && (merchant.refunds > 0 || merchant.disputes > 0) && (
          <p className="text-xs text-gray-500 mt-4">
            Strike counts decay one per clean 90-day window. The contract evaluates decay at the
            time of your next strike, not continuously.
          </p>
        )}
      </GlassCard>
    </motion.div>
  );
}
