'use client';

/**
 * MyEscrowsTab — the connected wallet's outgoing transfers held in escrow.
 *
 * An escrow is created when a flagged user attempts to transfer — the contract
 * pulls the funds into FraudRegistry and queues a release for 30 days later.
 * After releaseAt has passed, anyone can call releaseEscrow(index) to forward
 * the funds to the original recipient. The user themselves typically calls it.
 *
 * Non-custodial guarantee: the funds are never seized. They release on schedule
 * regardless of any further DAO action (except clearFlag, which cancels the
 * escrow and refunds the sender — and that's a strict improvement for the user).
 */

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { formatUnits, type Address } from 'viem';
import { ShieldAlert, Loader2, AlertCircle, CheckCircle2, Clock, Wallet, Info, ArrowRight } from 'lucide-react';
import { useFraudRegistry, type EscrowedTransferRecord } from '@/hooks/useFraudRegistry';

function truncate(addr: Address): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatTimestamp(seconds: bigint): string {
  return new Date(Number(seconds) * 1000).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatRelativeFuture(targetSeconds: bigint): string {
  const diff = Number(targetSeconds) * 1000 - Date.now();
  if (diff <= 0) return 'Ready now';
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  if (days > 0) return `Ready in ${days}d ${hours}h`;
  if (hours > 0) return `Ready in ${hours}h`;
  const minutes = Math.floor(diff / 60_000);
  return `Ready in ${Math.max(minutes, 1)}m`;
}

export function MyEscrowsTab() {
  const { address } = useAccount();
  const fr = useFraudRegistry();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const handleRelease = async (index: bigint) => {
    setActionError(null);
    setActionMessage(null);
    try {
      await fr.releaseEscrow(index);
      setActionMessage(`Escrow #${index.toString()} released.`);
      await fr.refetchMy();
    } catch (e: any) {
      const msg = e?.shortMessage || e?.message || 'Release failed.';
      if (msg.includes('FR_EscrowNotReady')) setActionError('This escrow is not yet ready for release.');
      else if (msg.includes('FR_EscrowAlreadyProcessed')) setActionError('This escrow has already been released or cancelled.');
      else if (msg.includes('FR_EscrowInvalidIndex')) setActionError('Invalid escrow index.');
      else setActionError(msg);
    }
  };

  if (!fr.fraudConfigured) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-8 text-center">
        <AlertCircle className="mx-auto text-amber-400 mb-3" size={28} />
        <p className="text-zinc-100 font-semibold">FraudRegistry is not configured for this environment.</p>
        <p className="text-zinc-400 text-sm mt-1">Set NEXT_PUBLIC_FRAUD_REGISTRY_ADDRESS to view escrowed transfers.</p>
      </div>
    );
  }

  if (!address) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-8 text-center">
        <Wallet className="mx-auto text-zinc-500 mb-3" size={28} />
        <p className="text-zinc-100 font-semibold">Connect your wallet</p>
        <p className="text-zinc-400 text-sm mt-1">Sign in to view your escrowed transfers.</p>
      </div>
    );
  }

  const escrows = fr.myEscrows;
  const readyCount = escrows.filter((e) => e.isReady).length;
  const waitingCount = escrows.length - readyCount;

  return (
    <div className="space-y-4">
      {/* Header / summary */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-5 flex items-start gap-3">
        <ShieldAlert className="text-accent shrink-0 mt-0.5" size={20} />
        <div className="flex-1">
          <p className="text-zinc-100 font-semibold">
            {escrows.length === 0
              ? 'No escrowed transfers'
              : `${escrows.length} escrowed transfer${escrows.length === 1 ? '' : 's'}`}
            {escrows.length > 0 && (
              <span className="text-zinc-400 ml-2 text-sm font-normal">
                • {readyCount} ready, {waitingCount} waiting
              </span>
            )}
          </p>
          <p className="text-zinc-400 text-xs mt-0.5">
            Your transfers are held for {Math.floor(Number(fr.escrowDuration) / 86400)} days before reaching the
            recipient. This happens automatically while your address is flagged.
          </p>
        </div>
      </div>

      {/* Action feedback */}
      {actionError && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 flex items-start gap-2">
          <AlertCircle size={12} className="text-red-300 shrink-0 mt-0.5" />
          <p className="text-xs text-red-300">{actionError}</p>
        </div>
      )}
      {actionMessage && !actionError && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 flex items-start gap-2">
          <CheckCircle2 size={12} className="text-emerald-300 shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-300">{actionMessage}</p>
        </div>
      )}

      {/* Escrow cards */}
      {escrows.length === 0 ? (
        <div className="bg-zinc-800/50 border border-zinc-800 rounded-2xl p-8 text-center">
          <CheckCircle2 className="mx-auto text-emerald-400 mb-3" size={24} />
          <p className="text-zinc-200">No escrowed transfers — your transfers are clearing normally.</p>
          <p className="text-zinc-500 text-xs mt-1">
            Escrows are only created if your address is flagged by the DAO.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {escrows.map((e) => (
            <EscrowRow key={e.index.toString()} escrow={e} onRelease={handleRelease} isPending={fr.isWritePending} />
          ))}
        </div>
      )}

      <div className="text-xs text-zinc-500 bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 flex items-start gap-1.5">
        <Info size={11} className="mt-0.5 shrink-0" />
        <span>
          Release is permissionless — once an escrow&apos;s window has elapsed, anyone (including the recipient) can
          trigger the release. The funds always go to the original recipient.
        </span>
      </div>
    </div>
  );
}

interface EscrowRowProps {
  escrow: EscrowedTransferRecord;
  onRelease: (index: bigint) => void;
  isPending: boolean;
}

function EscrowRow({ escrow, onRelease, isPending }: EscrowRowProps) {
  return (
    <div
      className={`bg-zinc-800 border rounded-2xl p-5 ${
        escrow.isReady ? 'border-emerald-500/30' : 'border-zinc-700'
      }`}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-zinc-500 text-xs uppercase tracking-wide">Escrow</span>
            <span className="text-zinc-100 font-mono text-xs">#{escrow.index.toString()}</span>
          </div>
          <div className="text-zinc-100 text-lg font-semibold tabular-nums">
            {formatUnits(escrow.amount, 18)} VFIDE
          </div>
          <div className="flex items-center gap-1 text-sm text-zinc-400 mt-1">
            to <ArrowRight size={11} />{' '}
            <span className="font-mono text-zinc-300">{truncate(escrow.recipient)}</span>
          </div>
        </div>
        <div className="text-right">
          <div
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border ${
              escrow.isReady
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-zinc-900 border-zinc-700 text-zinc-400'
            }`}
          >
            <Clock size={10} />
            {escrow.isReady ? 'Ready' : 'Waiting'}
          </div>
          <p className="text-xs text-zinc-500 mt-1.5">{formatRelativeFuture(escrow.releaseAt)}</p>
          <p className="text-xs text-zinc-600">{formatTimestamp(escrow.releaseAt)}</p>
        </div>
      </div>
      <div className="mt-4">
        <button
          onClick={() => onRelease(escrow.index)}
          disabled={!escrow.isReady || isPending}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-sm rounded-lg transition-colors inline-flex items-center gap-1.5"
        >
          {isPending ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />}
          {escrow.isReady ? 'Release to recipient' : 'Not yet releasable'}
        </button>
      </div>
    </div>
  );
}
