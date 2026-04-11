'use client';

import { useMemo, useState } from 'react';
import { useReadContract, useWriteContract, usePublicClient } from 'wagmi';

import { USER_VAULT_ABI, isCardBoundVaultMode } from '@/lib/contracts';
import { shortAddress, type WatchedVault } from './types';

export function GuardianPendingRecoveryCard({
  entry,
  userAddress,
  onRemove,
}: {
  entry: WatchedVault;
  userAddress?: `0x${string}`;
  onRemove?: () => void;
}) {
  const recoverySupported = !isCardBoundVaultMode();
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionTone, setActionTone] = useState<'info' | 'success' | 'error'>('info');
  const [isReportingFraud, setIsReportingFraud] = useState(false);
  const [txStage, setTxStage] = useState<'idle' | 'signing' | 'submitted' | 'confirmed' | 'failed'>('idle');
  const [txHashPreview, setTxHashPreview] = useState<string | null>(null);
  const { writeContractAsync, isPending } = useWriteContract();
  const publicClient = usePublicClient();

  const { data: isGuardian } = useReadContract({
    address: entry.address,
    abi: USER_VAULT_ABI,
    functionName: 'isGuardian',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: recoverySupported && !!userAddress },
  });

  const { data: isGuardianMature } = useReadContract({
    address: entry.address,
    abi: USER_VAULT_ABI,
    functionName: 'isGuardianMature',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: recoverySupported && !!userAddress && !!isGuardian },
  });

  const { data: recoveryStatus, refetch: refetchRecoveryStatus } = useReadContract({
    address: entry.address,
    abi: USER_VAULT_ABI,
    functionName: 'getRecoveryStatus',
    query: { enabled: recoverySupported, refetchInterval: 15000 },
  });

  const recovery = recoveryStatus as [string, bigint, bigint, bigint, boolean] | undefined;
  const active = !!recovery && recovery[4];
  const approvals = recovery ? Number(recovery[1]) : 0;
  const threshold = recovery ? Number(recovery[2]) : 0;
  const proposedOwner = recovery ? recovery[0] : '0x0000000000000000000000000000000000000000';
  const expirySec = recovery ? Number(recovery[3]) : 0;
  const daysLeft = expirySec > 0 ? Math.max(0, Math.ceil((expirySec * 1000 - Date.now()) / (24 * 60 * 60 * 1000))) : null;

  const riskScore = useMemo(() => {
    let score = 0;
    if (active) score += 25;
    if (active && approvals < threshold) score += 20;
    if (active && daysLeft !== null && daysLeft <= 2) score += 25;
    if (!isGuardian) score += 15;
    if (isGuardian && !isGuardianMature) score += 15;
    return Math.min(100, score);
  }, [active, approvals, threshold, daysLeft, isGuardian, isGuardianMature]);

  const riskLevel = riskScore >= 70 ? 'High' : riskScore >= 40 ? 'Medium' : 'Low';

  const handleApprove = async () => {
    setActionNotice(null);
    setActionTone('info');

    if (!recoverySupported) {
      setActionTone('error');
      setActionNotice('Recovery approvals are not supported in CardBound vault mode.');
      return;
    }

    if (!active) {
      setActionTone('error');
      setActionNotice('No active recovery request on this vault.');
      return;
    }
    if (!isGuardian) {
      setActionTone('error');
      setActionNotice('This wallet is not an assigned guardian for this vault.');
      return;
    }
    if (!isGuardianMature) {
      setActionTone('error');
      setActionNotice('Guardian maturity period has not completed yet.');
      return;
    }

    try {
      setTxStage('signing');
      const txHash = await writeContractAsync({
        address: entry.address,
        abi: USER_VAULT_ABI,
        functionName: 'guardianApproveRecovery',
      });
      const txHashText = String(txHash);
      setTxHashPreview(txHashText);
      setTxStage('submitted');
      setActionTone('success');
      setActionNotice(`Recovery approval submitted: ${txHashText.slice(0, 12)}...`);

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
        setTxStage('confirmed');
        setActionNotice(`Recovery approval confirmed: ${txHashText.slice(0, 12)}...`);
      }

      setTimeout(() => {
        void refetchRecoveryStatus();
      }, 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Approval failed';
      setTxStage('failed');
      setActionTone('error');
      setActionNotice(message);
    }
  };

  const handleReportFraud = async () => {
    setActionNotice(null);
    setActionTone('info');
    setIsReportingFraud(true);
    try {
      if (typeof fetch !== 'function') {
        throw new Error('Fraud reporting unavailable in this environment.');
      }

      const response = await fetch('/api/security/recovery-fraud-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vault: entry.address,
          label: entry.label,
          source: 'guardian-inbox',
          proposedOwner,
          approvals,
          threshold,
          active,
          watcher: userAddress || 'unknown',
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const err = typeof payload?.error === 'string' ? payload.error : `Fraud report failed (${response.status})`;
        throw new Error(err);
      }

      setActionTone('success');
      setActionNotice('Fraud report submitted to security telemetry.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Fraud report failed';
      setActionTone('error');
      setActionNotice(message);
    } finally {
      setIsReportingFraud(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-yellow-500/40 rounded-2xl p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-white font-bold">{entry.label || shortAddress(entry.address)}</h3>
          <p className="text-gray-400 text-sm font-mono">{entry.address}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${active ? 'bg-amber-500/20 text-amber-300' : 'bg-green-500/20 text-green-300'}`}>
            {active ? 'Recovery Active' : 'No Active Recovery'}
          </span>
          {onRemove ? (
            <button
              onClick={onRemove}
              className="px-3 py-1 border border-red-500/40 text-red-300 rounded-lg text-xs font-bold hover:bg-red-500/10"
            >
              Remove
            </button>
          ) : (
            <span className="px-3 py-1 border border-cyan-500/40 text-cyan-300 rounded-lg text-xs font-bold">Attested</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-black/30 border border-white/10 rounded-xl p-3">
          <div className="text-gray-500 text-xs mb-1">Proposed Owner</div>
          <div className="text-white text-sm font-mono">{proposedOwner !== '0x0000000000000000000000000000000000000000' ? shortAddress(proposedOwner) : 'n/a'}</div>
        </div>
        <div className="bg-black/30 border border-white/10 rounded-xl p-3">
          <div className="text-gray-500 text-xs mb-1">Approvals</div>
          <div className="text-white text-sm font-bold">{approvals}/{threshold}</div>
        </div>
        <div className="bg-black/30 border border-white/10 rounded-xl p-3">
          <div className="text-gray-500 text-xs mb-1">Expires In</div>
          <div className="text-white text-sm font-bold">{daysLeft !== null ? `${daysLeft}d` : 'n/a'}</div>
        </div>
        <div className="bg-black/30 border border-white/10 rounded-xl p-3">
          <div className="text-gray-500 text-xs mb-1">Your Guardian Status</div>
          <div className="text-white text-sm font-bold">
            {!isGuardian ? 'Not assigned' : isGuardianMature ? 'Mature' : 'Maturing'}
          </div>
        </div>
        <div className="bg-black/30 border border-white/10 rounded-xl p-3">
          <div className="text-gray-500 text-xs mb-1">Risk Score</div>
          <div className={`text-sm font-bold ${riskLevel === 'High' ? 'text-red-300' : riskLevel === 'Medium' ? 'text-yellow-300' : 'text-green-300'}`}>
            {riskLevel} ({riskScore})
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <button
          onClick={() => void handleApprove()}
          disabled={!active || !isGuardian || !isGuardianMature || isPending || approvals >= threshold}
          className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold disabled:opacity-50"
        >
          {isPending ? 'Submitting...' : approvals >= threshold ? 'Threshold Reached' : 'Approve Recovery'}
        </button>
        <button
          onClick={() => void handleReportFraud()}
          disabled={isReportingFraud}
          className="px-4 py-3 border border-red-500/60 text-red-300 rounded-xl font-bold hover:bg-red-500/10 disabled:opacity-50"
        >
          {isReportingFraud ? 'Reporting...' : 'Report Fraud'}
        </button>
      </div>

      {actionNotice && (
        <p className={`text-xs mt-3 ${actionTone === 'error' ? 'text-red-300' : actionTone === 'success' ? 'text-green-300' : 'text-cyan-200'}`}>
          {actionNotice}
        </p>
      )}
      {txStage !== 'idle' && (
        <p className="text-xs text-gray-400 mt-2">
          Tx stage: {txStage}{txHashPreview ? ` (${txHashPreview.slice(0, 10)}...)` : ''}
        </p>
      )}
    </div>
  );
}

// ========== MY GUARDIANS TAB ==========
