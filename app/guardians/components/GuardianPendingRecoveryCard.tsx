'use client';

/**
 * GuardianPendingRecoveryCard — single row in the guardian inbox.
 *
 * Shows pending wallet-rotation state for one watched CardBound vault, with
 * approve and report-fraud actions. Pre-cleanup this file had a parallel
 * legacy-vault recovery flow (USER_VAULT_ABI reads, `guardianApproveRecovery`,
 * guardian-maturity wait, getRecoveryStatus). Since `isCardBoundVaultMode()`
 * is hard-coded to true, all those reads were permanently disabled via
 * `enabled: recoverySupported = !cardBoundMode`. Removed entirely.
 *
 * The trailing `// ========== MY GUARDIANS TAB ==========` separator
 * comment in the previous version had no following code — also removed.
 */

import { useMemo, useState } from 'react';
import { useReadContract, useWriteContract, usePublicClient } from 'wagmi';

import {
  CARD_BOUND_VAULT_ABI,
  CONTRACT_ADDRESSES,
  VAULT_HUB_ABI,
  ZERO_ADDRESS,
  isConfiguredContractAddress,
} from '@/lib/contracts';
import { shortAddress, type WatchedVault } from './types';

type TxStage = 'idle' | 'signing' | 'submitted' | 'confirmed' | 'failed';

export function GuardianPendingRecoveryCard({
  entry,
  userAddress,
  onRemove,
}: {
  entry: WatchedVault;
  userAddress?: `0x${string}`;
  onRemove?: () => void;
}) {
  const isVaultHubAvailable = isConfiguredContractAddress(CONTRACT_ADDRESSES.VaultHub);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionTone, setActionTone] = useState<'info' | 'success' | 'error'>('info');
  const [isReportingFraud, setIsReportingFraud] = useState(false);
  const [txStage, setTxStage] = useState<TxStage>('idle');
  const [txHashPreview, setTxHashPreview] = useState<string | null>(null);
  const { writeContractAsync, isPending } = useWriteContract();
  const publicClient = usePublicClient();

  const { data: isGuardianRaw } = useReadContract({
    address: entry.address,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'isGuardian',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress },
  });

  const { data: guardianSetupComplete } = useReadContract({
    address: CONTRACT_ADDRESSES.VaultHub,
    abi: VAULT_HUB_ABI,
    functionName: 'guardianSetupComplete',
    args: [entry.address],
    query: { enabled: isVaultHubAvailable },
  });

  const { data: guardianThreshold } = useReadContract({
    address: entry.address,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'guardianThreshold',
  });

  const { data: pendingRotation, refetch: refetchPendingRotation } = useReadContract({
    address: entry.address,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'pendingRotation',
    query: { refetchInterval: 15000 },
  });

  const pendingRotationData = pendingRotation as
    | { newWallet: `0x${string}`; activateAt: bigint; approvals: bigint; proposalNonce: bigint }
    | undefined;

  const isGuardian = !!isGuardianRaw;
  const active = !!pendingRotationData && pendingRotationData.newWallet !== ZERO_ADDRESS;
  const approvals = Number(pendingRotationData?.approvals ?? 0n);
  const threshold = Number((guardianThreshold as bigint | undefined) ?? 0n);
  const proposedOwner = pendingRotationData?.newWallet ?? ZERO_ADDRESS;
  const activatesAtSec = Number(pendingRotationData?.activateAt ?? 0n);
  const daysLeft =
    activatesAtSec > 0
      ? Math.max(0, Math.ceil((activatesAtSec * 1000 - Date.now()) / (24 * 60 * 60 * 1000)))
      : null;

  const riskScore = useMemo(() => {
    let score = 0;
    if (active) score += 25;
    if (active && approvals < threshold) score += 20;
    if (active && daysLeft !== null && daysLeft <= 2) score += 25;
    if (!isGuardian) score += 15;
    if (!guardianSetupComplete) score += 15;
    return Math.min(100, score);
  }, [active, approvals, threshold, daysLeft, isGuardian, guardianSetupComplete]);

  const riskLevel = riskScore >= 70 ? 'High' : riskScore >= 40 ? 'Medium' : 'Low';

  const handleApprove = async () => {
    setActionNotice(null);
    setActionTone('info');

    try {
      if (!active) {
        setActionTone('error');
        setActionNotice('No pending wallet rotation on this vault.');
        return;
      }
      if (!isGuardian) {
        setActionTone('error');
        setActionNotice('This wallet is not an assigned guardian for this vault.');
        return;
      }
      if (!guardianSetupComplete) {
        setActionTone('error');
        setActionNotice(
          isVaultHubAvailable
            ? 'Guardian setup must be completed before rotation approvals are available.'
            : 'Vault hub contract is not configured in this environment.',
        );
        return;
      }

      setTxStage('signing');
      const txHash = await writeContractAsync({
        address: entry.address,
        abi: CARD_BOUND_VAULT_ABI,
        functionName: 'approveWalletRotation',
      });
      const txHashText = String(txHash);
      setTxHashPreview(txHashText);
      setTxStage('submitted');
      setActionTone('success');
      setActionNotice(`Rotation approval submitted: ${txHashText.slice(0, 12)}...`);

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
        setTxStage('confirmed');
        setActionNotice(`Rotation approval confirmed: ${txHashText.slice(0, 12)}...`);
      }

      setTimeout(() => {
        void refetchPendingRotation();
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
          flow: 'cardbound-rotation',
          watcher: userAddress || 'unknown',
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const err =
          typeof payload?.error === 'string' ? payload.error : `Fraud report failed (${response.status})`;
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
        <div className="min-w-0">
          <h3 className="text-white font-bold truncate">{entry.label || shortAddress(entry.address)}</h3>
          <p className="text-gray-400 text-sm font-mono truncate">{entry.address}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              active ? 'bg-amber-500/20 text-amber-300' : 'bg-green-500/20 text-green-300'
            }`}
          >
            {active ? 'Rotation Active' : 'No Pending Rotation'}
          </span>
          {onRemove ? (
            <button
              onClick={onRemove}
              className="px-3 py-1 border border-red-500/40 text-red-300 rounded-lg text-xs font-bold hover:bg-red-500/10"
            >
              Remove
            </button>
          ) : (
            <span className="px-3 py-1 border border-accent/40 text-cyan-300 rounded-lg text-xs font-bold">
              Attested
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-black/30 border border-white/10 rounded-xl p-3 min-w-0">
          <div className="text-gray-500 text-xs mb-1">Proposed Wallet</div>
          <div className="text-white text-sm font-mono truncate">
            {proposedOwner !== ZERO_ADDRESS ? shortAddress(proposedOwner) : 'n/a'}
          </div>
        </div>
        <div className="bg-black/30 border border-white/10 rounded-xl p-3">
          <div className="text-gray-500 text-xs mb-1">Approvals</div>
          <div className="text-white text-sm font-bold">
            {approvals}/{threshold}
          </div>
        </div>
        <div className="bg-black/30 border border-white/10 rounded-xl p-3">
          <div className="text-gray-500 text-xs mb-1">Activates In</div>
          <div className="text-white text-sm font-bold">{daysLeft !== null ? `${daysLeft}d` : 'n/a'}</div>
        </div>
        <div className="bg-black/30 border border-white/10 rounded-xl p-3">
          <div className="text-gray-500 text-xs mb-1">Your Guardian Status</div>
          <div className="text-white text-sm font-bold">
            {!isGuardian ? 'Not assigned' : guardianSetupComplete ? 'Assigned' : 'Setup Pending'}
          </div>
        </div>
        <div className="bg-black/30 border border-white/10 rounded-xl p-3">
          <div className="text-gray-500 text-xs mb-1">Risk Score</div>
          <div
            className={`text-sm font-bold ${
              riskLevel === 'High'
                ? 'text-red-300'
                : riskLevel === 'Medium'
                  ? 'text-yellow-300'
                  : 'text-green-300'
            }`}
          >
            {riskLevel} ({riskScore})
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <button
          onClick={() => void handleApprove()}
          disabled={
            !active || !isGuardian || !guardianSetupComplete || isPending || approvals >= threshold
          }
          className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold disabled:opacity-50"
        >
          {isPending
            ? 'Submitting...'
            : approvals >= threshold
              ? 'Threshold Reached'
              : 'Approve Rotation'}
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
        <p
          className={`text-xs mt-3 ${
            actionTone === 'error'
              ? 'text-red-300'
              : actionTone === 'success'
                ? 'text-green-300'
                : 'text-cyan-200'
          }`}
        >
          {actionNotice}
        </p>
      )}
      {txStage !== 'idle' && (
        <p className="text-xs text-gray-400 mt-2">
          Tx stage: {txStage}
          {txHashPreview ? ` (${txHashPreview.slice(0, 10)}...)` : ''}
        </p>
      )}
    </div>
  );
}
