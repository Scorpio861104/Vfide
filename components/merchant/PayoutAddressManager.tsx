'use client';

/**
 * PayoutAddressManager — UI for the 3-step timelocked payout-address change.
 *
 * Replaces the broken "Update Payout Address" button on MerchantDashboard
 * that used to call the legacy setPayoutAddress (now a revert stub).
 *
 * State machine:
 *   - No pending proposal → show propose form
 *   - Pending, timelock not elapsed → show countdown + cancel button
 *   - Pending, timelock elapsed → show apply + cancel buttons
 *
 * The merchant sees both the currently active payout address (passed in
 * as `currentPayoutAddress`) and the proposed one when relevant.
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { isAddress, type Address, zeroAddress } from 'viem';
import { Clock, AlertTriangle, CheckCircle2, X, Loader2, ArrowRight } from 'lucide-react';
import { usePayoutAddressChange } from '@/hooks/usePayoutAddressChange';

function shortAddress(addr: string | undefined): string {
  if (!addr || addr.length < 10) return addr || '—';
  if (addr === zeroAddress) return 'Merchant vault (default)';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatRemaining(seconds: number): string {
  if (seconds <= 0) return 'Ready';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

interface PayoutAddressManagerProps {
  /** The currently effective payout address. Comes from MerchantPortal.payoutOf
      via the parent dashboard. Pass zeroAddress to indicate "uses merchant vault." */
  currentPayoutAddress?: Address;
}

export function PayoutAddressManager({ currentPayoutAddress }: PayoutAddressManagerProps) {
  const {
    pending,
    hasPending,
    canApply,
    delaySeconds,
    propose,
    apply,
    cancel,
    isWritePending,
  } = usePayoutAddressChange();

  const [newAddress, setNewAddress] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Re-render every 30s so the countdown is fresh without spamming chain reads
  useEffect(() => {
    if (!hasPending || canApply) return;
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, [hasPending, canApply]);

  const handlePropose = async () => {
    setActionError(null);
    setActionMessage(null);
    if (!isAddress(newAddress)) {
      setActionError('Enter a valid address, or leave blank to route payments to your merchant vault.');
      return;
    }
    try {
      await propose(newAddress as Address);
      const delayHours = Math.round(delaySeconds / 3600);
      setActionMessage(
        `Proposed. You'll be able to apply this change in ${delayHours}h. You can cancel any time before then.`
      );
      setNewAddress('');
    } catch (e: any) {
      setActionError(e?.shortMessage || e?.message || 'Proposal failed.');
    }
  };

  const handleApply = async () => {
    setActionError(null);
    setActionMessage(null);
    try {
      await apply();
      setActionMessage('Payout address updated.');
    } catch (e: any) {
      setActionError(e?.shortMessage || e?.message || 'Apply failed.');
    }
  };

  const handleCancel = async () => {
    setActionError(null);
    setActionMessage(null);
    try {
      await cancel();
      setActionMessage('Proposal cancelled.');
    } catch (e: any) {
      setActionError(e?.shortMessage || e?.message || 'Cancel failed.');
    }
  };

  const nowSec = Math.floor(Date.now() / 1000);
  const remainingSec = pending ? Math.max(0, pending.effectiveAt - nowSec) : 0;

  return (
    <div className="space-y-3">
      {/* Current payout target */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-gray-400">Current payout target</p>
        <p className="text-xs font-mono text-gray-300">
          {shortAddress(currentPayoutAddress)}
        </p>
      </div>

      {/* No pending proposal: show propose form */}
      {!hasPending && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 leading-relaxed">
            Changing your payout address takes effect after a {Math.round(delaySeconds / 3600)}-hour
            review window. You can cancel before it applies.
          </p>
          <input
            type="text"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            placeholder="0x... (or leave blank for merchant vault)"
            className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none text-sm font-mono"
          />
          <button
            onClick={() => void handlePropose()}
            disabled={isWritePending || !newAddress || !isAddress(newAddress)}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-2 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
          >
            {isWritePending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                Propose change
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      )}

      {/* Pending proposal: show state-aware UI */}
      {hasPending && pending && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3 rounded-lg border ${
            canApply ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-cyan-500/10 border-cyan-500/30'
          }`}
        >
          <div className="flex items-start gap-2 mb-3">
            {canApply ? (
              <CheckCircle2 className="text-emerald-300 shrink-0 mt-0.5" size={16} />
            ) : (
              <Clock className="text-cyan-300 shrink-0 mt-0.5" size={16} />
            )}
            <div className="flex-1">
              <p className={`text-xs font-semibold ${canApply ? 'text-emerald-200' : 'text-cyan-200'}`}>
                {canApply ? 'Ready to apply' : 'Change pending'}
              </p>
              <p className="text-xs text-gray-300 font-mono mt-1 break-all">
                → {shortAddress(pending.proposed)}
              </p>
              <p className={`text-xs mt-1 ${canApply ? 'text-emerald-300/80' : 'text-cyan-300/80'}`}>
                {canApply ? 'Timelock elapsed. Apply or cancel below.' : formatRemaining(remainingSec)}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {canApply && (
              <button
                onClick={() => void handleApply()}
                disabled={isWritePending}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2 px-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-1"
              >
                {isWritePending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                Apply now
              </button>
            )}
            <button
              onClick={() => void handleCancel()}
              disabled={isWritePending}
              className="flex-1 bg-white/5 hover:bg-white/10 border border-white/20 disabled:opacity-50 text-gray-300 hover:text-white font-bold py-2 px-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-1"
            >
              <X size={12} />
              Cancel proposal
            </button>
          </div>
        </motion.div>
      )}

      {actionError && (
        <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-2">
          <AlertTriangle size={12} className="shrink-0 mt-0.5" />
          <span className="break-words">{actionError}</span>
        </div>
      )}
      {actionMessage && !actionError && (
        <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-200">
          {actionMessage}
        </div>
      )}
    </div>
  );
}
