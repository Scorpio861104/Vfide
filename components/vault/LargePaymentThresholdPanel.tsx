'use client';

/**
 * LargePaymentThresholdPanel
 *
 * Vault settings panel that lets the vault owner propose a new large-payment
 * threshold. Payments above this threshold are held in the payment queue for
 * WITHDRAWAL_DELAY seconds before execution.
 *
 * Backlog item: Phase 2 Turn 1 — Wire setLargePaymentThreshold propose UI.
 */

import { useState, useCallback, useEffect } from 'react';
import { formatUnits, parseUnits } from 'viem';
import { type Address } from 'viem';
import { useLargePaymentThreshold, FIXED_THRESHOLD_DELAY_SECONDS } from '@/hooks/useLargePaymentThreshold';
import { AlertCircle, CheckCircle2, Clock, Sliders } from 'lucide-react';
import Link from 'next/link';

interface Props {
  vaultAddress: Address | undefined;
}

function formatVFIDE(wei: bigint): string {
  const units = formatUnits(wei, 18);
  const num = parseFloat(units);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
  return num.toFixed(2);
}

export function LargePaymentThresholdPanel({ vaultAddress }: Props) {
  const {
    currentThreshold,
    hasPending,
    pendingChange,
    isReadLoading,
    propose,
    isWritePending,
    isConfirming,
    isConfirmed,
    proposeError,
    resetWrite,
  } = useLargePaymentThreshold(vaultAddress);

  const [thresholdInput, setThresholdInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Reset submitted state when confirmed
  useEffect(() => {
    if (isConfirmed) {
      setSubmitted(true);
      setThresholdInput('');
    }
  }, [isConfirmed]);

  const handlePropose = useCallback(async () => {
    setValidationError(null);
    resetWrite?.();

    const trimmed = thresholdInput.trim();
    if (!trimmed || isNaN(Number(trimmed)) || Number(trimmed) < 0) {
      setValidationError('Please enter a valid threshold amount.');
      return;
    }

    try {
      const wei = parseUnits(trimmed, 18);
      // Delay is fixed in the contract (SENSITIVE_ADMIN_DELAY = 7 days) — no
      // user-supplied delay is sent on-chain.
      await propose(wei);
    } catch {
      // Error is captured in proposeError from the hook
    }
  }, [thresholdInput, propose, resetWrite]);

  // Esc key handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setThresholdInput('');
        setValidationError(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!vaultAddress) return null;

  const pendingEffectiveDate = hasPending && pendingChange?.executeAfter
    ? new Date(Number(pendingChange.executeAfter) * 1000).toLocaleString()
    : null;

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Sliders className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="text-base font-semibold text-white">Large Payment Threshold</h3>
          <p className="text-sm text-zinc-400 mt-0.5">
            Payments above this amount are held in the payment queue before execution,
            giving you time to review or cancel them.
          </p>
        </div>
      </div>

      {/* Current threshold */}
      <div className="bg-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-zinc-400">Current threshold</span>
        {isReadLoading ? (
          <div className="h-4 w-20 bg-zinc-700 animate-pulse rounded" />
        ) : (
          <span className="text-sm font-mono font-semibold text-white">
            {formatVFIDE(currentThreshold)} VFIDE
          </span>
        )}
      </div>

      {/* Pending change notice */}
      {hasPending && pendingChange && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-700/40 bg-amber-900/10 p-4">
          <Clock className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-300 space-y-1">
            <p className="font-medium">Pending change</p>
            <p>
              New threshold: <span className="font-mono font-semibold">
                {formatVFIDE(pendingChange.threshold)} VFIDE
              </span>
              {' '}— effective {pendingEffectiveDate ?? 'soon'}.
            </p>
            <p className="text-amber-400/70 text-xs">
              Apply or cancel this change from{' '}
              <Link href="/vault/pending-changes" className="underline">
                Pending Changes
              </Link>
              .
            </p>
          </div>
        </div>
      )}

      {/* Propose form */}
      {!hasPending && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-400 uppercase tracking-wide mb-1.5">
              New Threshold (VFIDE)
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={thresholdInput}
              onChange={(e) => {
                setThresholdInput(e.target.value);
                setValidationError(null);
              }}
              placeholder="e.g. 1000"
              className="w-full rounded-xl bg-zinc-800 border border-zinc-600 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 uppercase tracking-wide mb-1.5">
              Timelock Delay
            </label>
            <div className="w-full rounded-xl bg-zinc-800/60 border border-zinc-700 px-4 py-3 text-sm text-zinc-300">
              {FIXED_THRESHOLD_DELAY_SECONDS / 86400} days (enforced by the vault contract)
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              The delay is hard-coded in the vault as <code className="text-zinc-400">SENSITIVE_ADMIN_DELAY</code> and
              cannot be changed by the caller. After this period, anyone can apply the pending change.
            </p>
          </div>

          {validationError && (
            <div className="flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {proposeError && !validationError && (
            <div className="flex items-start gap-2 text-sm text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="break-words">{proposeError}</span>
            </div>
          )}

          {(isConfirmed || submitted) && !proposeError && (
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Threshold change proposed. Check Pending Changes to apply.</span>
            </div>
          )}

          <button
            onClick={handlePropose}
            disabled={isWritePending || isConfirming || !thresholdInput}
            className="w-full rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed py-3 text-sm font-semibold text-white transition-colors"
          >
            {isWritePending || isConfirming ? 'Submitting…' : 'Propose New Threshold'}
          </button>
        </div>
      )}
    </div>
  );
}
