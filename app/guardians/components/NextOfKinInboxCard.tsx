'use client';

import { useState } from 'react';
import { useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { USER_VAULT_ABI, isCardBoundVaultMode } from '@/lib/contracts';
import { shortAddress, ZERO_ADDRESS, type NextOfKinWatchedVault } from './types';

interface NextOfKinInboxCardProps {
  entry: NextOfKinWatchedVault;
  userAddress?: `0x${string}`;
  onRemove: () => void;
}

export function NextOfKinInboxCard({ entry, userAddress, onRemove }: NextOfKinInboxCardProps) {
  const recoverySupported = !isCardBoundVaultMode();
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionTone, setActionTone] = useState<'info' | 'success' | 'error'>('info');
  const [isReportingFraud, setIsReportingFraud] = useState(false);
  const [txStage, setTxStage] = useState<'idle' | 'signing' | 'submitted' | 'confirmed' | 'failed'>('idle');
  const [txHashPreview, setTxHashPreview] = useState<string | null>(null);
  const { writeContractAsync, isPending } = useWriteContract();
  const publicClient = usePublicClient();

  const { data: owner } = useReadContract({
    address: entry.address, abi: USER_VAULT_ABI, functionName: 'owner',
    query: { enabled: recoverySupported },
  });

  const { data: nextOfKin } = useReadContract({
    address: entry.address, abi: USER_VAULT_ABI, functionName: 'nextOfKin',
    query: { enabled: recoverySupported },
  });

  const { data: isGuardian } = useReadContract({
    address: entry.address, abi: USER_VAULT_ABI, functionName: 'isGuardian',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: recoverySupported && !!userAddress },
  });

  const { data: isGuardianMature } = useReadContract({
    address: entry.address, abi: USER_VAULT_ABI, functionName: 'isGuardianMature',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: recoverySupported && !!userAddress && !!isGuardian },
  });

  const { data: inheritanceStatus, refetch: refetchInheritanceStatus } = useReadContract({
    address: entry.address, abi: USER_VAULT_ABI, functionName: 'getInheritanceStatus',
    query: { enabled: recoverySupported, refetchInterval: 15000 },
  });

  const inheritance = inheritanceStatus as [boolean, bigint, bigint, bigint, boolean] | undefined;
  const active = !!inheritance && inheritance[0];
  const approvals = inheritance ? Number(inheritance[1]) : 0;
  const threshold = inheritance ? Number(inheritance[2]) : 0;
  const expirySec = inheritance ? Number(inheritance[3]) : 0;
  const denied = inheritance ? inheritance[4] : false;
  const daysLeft = expirySec > 0 ? Math.max(0, Math.ceil((expirySec * 1000 - Date.now()) / (24 * 60 * 60 * 1000))) : null;

  const ownerAddress = (owner as string | undefined) || ZERO_ADDRESS;
  const nextOfKinAddress = (nextOfKin as string | undefined) || ZERO_ADDRESS;
  const normalizedUser = userAddress?.toLowerCase();
  const isOwner = !!normalizedUser && ownerAddress.toLowerCase() === normalizedUser;
  const isConfiguredNextOfKin = !!normalizedUser && nextOfKinAddress.toLowerCase() === normalizedUser;

  const execute = async (functionName: 'requestInheritance' | 'finalizeInheritance' | 'approveInheritance' | 'guardianCancelInheritance' | 'denyInheritance' | 'cancelInheritance') => {
    setActionNotice(null);
    setActionTone('info');

    if (!recoverySupported) {
      setActionTone('error');
      setActionNotice('Inheritance actions are not supported in CardBound vault mode.');
      return;
    }

    try {
      setTxStage('signing');
      const txHash = await writeContractAsync({
        address: entry.address, abi: USER_VAULT_ABI, functionName,
      });

      const txHashText = String(txHash);
      setTxHashPreview(txHashText);
      setTxStage('submitted');
      setActionTone('success');
      setActionNotice(`${functionName} submitted: ${txHashText.slice(0, 12)}...`);

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
        setTxStage('confirmed');
        setActionNotice(`${functionName} confirmed: ${txHashText.slice(0, 12)}...`);
      }

      setTimeout(() => { void refetchInheritanceStatus(); }, 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : `${functionName} failed`;
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
      const response = await fetch('/api/security/next-of-kin-fraud-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vault: entry.address, label: entry.label, source: 'next-of-kin-inbox',
          nextOfKin: nextOfKinAddress, approvals, threshold, active, denied,
          watcher: userAddress || 'unknown',
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(typeof payload?.error === 'string' ? payload.error : `Fraud report failed (${response.status})`);
      }

      setActionTone('success');
      setActionNotice('Next of Kin fraud report submitted to security telemetry.');
    } catch (error) {
      setActionTone('error');
      setActionNotice(error instanceof Error ? error.message : 'Fraud report failed');
    } finally {
      setIsReportingFraud(false);
    }
  };

  const actionButtons = [
    { label: 'Request (Next of Kin)', fn: 'requestInheritance' as const, disabled: !isConfiguredNextOfKin || active || denied, style: 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white' },
    { label: 'Finalize (Next of Kin)', fn: 'finalizeInheritance' as const, disabled: !isConfiguredNextOfKin || !active, style: 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white' },
    { label: 'Approve (Guardian)', fn: 'approveInheritance' as const, disabled: !isGuardian || !isGuardianMature || !active, style: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' },
    { label: 'Cancel Vote (Guardian)', fn: 'guardianCancelInheritance' as const, disabled: !isGuardian || !isGuardianMature || !active, style: 'border border-red-500/60 text-red-300 hover:bg-red-500/10' },
    { label: 'Deny (Owner)', fn: 'denyInheritance' as const, disabled: !isOwner || !active, style: 'border border-red-500/60 text-red-300 hover:bg-red-500/10' },
    { label: 'Cancel (Owner)', fn: 'cancelInheritance' as const, disabled: !isOwner || !active, style: 'border border-orange-500/60 text-orange-300 hover:bg-orange-500/10' },
  ];

  return (
    <div className="bg-black/20 border border-yellow-500/30 rounded-xl p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
        <div>
          <p className="text-white font-bold">{entry.label || shortAddress(entry.address)}</p>
          <p className="text-gray-400 text-sm font-mono">{entry.address}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${active ? 'bg-amber-500/20 text-amber-300' : 'bg-green-500/20 text-green-300'}`}>
            {active ? 'Inheritance Active' : 'No Active Inheritance'}
          </span>
          <button onClick={onRemove} className="px-3 py-1 border border-red-500/40 text-red-300 rounded-lg text-xs font-bold hover:bg-red-500/10">Remove</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
        {[
          { label: 'Owner', value: ownerAddress !== ZERO_ADDRESS ? shortAddress(ownerAddress) : 'n/a' },
          { label: 'Configured Kin', value: nextOfKinAddress !== ZERO_ADDRESS ? shortAddress(nextOfKinAddress) : 'none' },
          { label: 'Approvals', value: `${approvals}/${threshold}` },
          { label: 'Expires In', value: daysLeft !== null ? `${daysLeft}d` : 'n/a' },
          { label: 'Owner Denied', value: denied ? 'Yes' : 'No', color: denied ? 'text-red-300' : 'text-green-300' },
        ].map((item) => (
          <div key={item.label} className="bg-black/30 border border-white/10 rounded-xl p-3">
            <div className="text-gray-500 text-xs mb-1">{item.label}</div>
            <div className={`text-sm font-bold ${item.color || 'text-white'} ${item.label === 'Owner' || item.label === 'Configured Kin' ? 'font-mono' : ''}`}>{item.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {actionButtons.map(({ label, fn, disabled, style }) => (
          <button key={fn} onClick={() => void execute(fn)} disabled={disabled || isPending}
            className={`px-3 py-2 rounded-lg text-sm font-bold disabled:opacity-50 ${style}`}>
            {label}
          </button>
        ))}
        <button onClick={() => void handleReportFraud()} disabled={isReportingFraud}
          className="px-3 py-2 border border-fuchsia-500/60 text-fuchsia-300 rounded-lg text-sm font-bold hover:bg-fuchsia-500/10 disabled:opacity-50">
          {isReportingFraud ? 'Reporting...' : 'Report Fraud'}
        </button>
      </div>

      {actionNotice && (
        <p className={`text-xs mt-3 ${actionTone === 'error' ? 'text-red-300' : actionTone === 'success' ? 'text-green-300' : 'text-cyan-200'}`}>{actionNotice}</p>
      )}
      {txStage !== 'idle' && (
        <p className="text-xs text-gray-400 mt-2">Tx stage: {txStage}{txHashPreview ? ` (${txHashPreview.slice(0, 10)}...)` : ''}</p>
      )}
    </div>
  );
}
