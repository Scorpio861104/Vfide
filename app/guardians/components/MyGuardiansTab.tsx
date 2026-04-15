'use client';

import { useState } from 'react';
import { useAccount, usePublicClient, useReadContract, useSignMessage, useWriteContract } from 'wagmi';
import { motion } from 'framer-motion';
import { Shield, Users, UserMinus, CheckCircle2, FileText, AlertTriangle } from 'lucide-react';
import { useVaultHub } from '@/hooks/useVaultHub';
import { useVaultRecovery } from '@/hooks/useVaultRecovery';
import { ACTIVE_VAULT_ABI, CONTRACT_ADDRESSES, VAULT_HUB_ABI, ZERO_ADDRESS, isCardBoundVaultMode, isConfiguredContractAddress } from '@/lib/contracts';
import { buildGuardianAttestationMessage, type GuardianAttestationPayload } from '@/lib/recovery/guardianAttestation';

import { AddGuardianForm } from './AddGuardianForm';

export function MyGuardiansTab({ isConnected }: { isConnected: boolean }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGuardianAddress, setNewGuardianAddress] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const cardBoundMode = isCardBoundVaultMode();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { signMessageAsync } = useSignMessage();
  const { writeContractAsync, isPending: isGuardianSetupPending } = useWriteContract();
  const isVaultHubAvailable = isConfiguredContractAddress(CONTRACT_ADDRESSES.VaultHub);
  const { vaultAddress, hasVault, isLoadingVault, createVault, isCreatingVault } = useVaultHub();
  const { vaultOwner, guardians, guardianCount, isWritePending, addGuardian, removeGuardian } = useVaultRecovery(vaultAddress);
  const { data: vaultGuardianCountRaw } = useReadContract({
    address: vaultAddress,
    abi: ACTIVE_VAULT_ABI,
    functionName: 'guardianCount',
    query: { enabled: !!vaultAddress },
  });
  const { data: guardianThresholdRaw } = useReadContract({
    address: vaultAddress,
    abi: ACTIVE_VAULT_ABI,
    functionName: 'guardianThreshold',
    query: { enabled: !!vaultAddress },
  });
  const { data: guardianSetupCompleteRaw } = useReadContract({
    address: CONTRACT_ADDRESSES.VaultHub,
    abi: VAULT_HUB_ABI,
    functionName: 'guardianSetupComplete',
    args: vaultAddress ? [vaultAddress] : undefined,
    query: { enabled: isVaultHubAvailable && !!vaultAddress },
  });
  const { data: guardianSetupExpiredRaw } = useReadContract({
    address: CONTRACT_ADDRESSES.VaultHub,
    abi: VAULT_HUB_ABI,
    functionName: 'isGuardianSetupExpired',
    args: vaultAddress ? [vaultAddress] : undefined,
    query: { enabled: isVaultHubAvailable && !!vaultAddress },
  });
  const { data: pendingGuardianChangeRaw } = useReadContract({
    address: vaultAddress,
    abi: ACTIVE_VAULT_ABI,
    functionName: 'pendingGuardianChange',
    query: { enabled: cardBoundMode && !!vaultAddress },
  });

  const guardianList = guardians || [];
  const recoveryThreshold = guardianCount < 2 ? 2 : Math.floor(guardianCount / 2) + 1;
  const guardianCountOnChain = Number(vaultGuardianCountRaw || 0);
  const guardianThreshold = Number(guardianThresholdRaw || 0);
  const guardianSetupComplete = !!guardianSetupCompleteRaw;
  const guardianSetupExpired = !!guardianSetupExpiredRaw;
  const canCompleteGuardianSetup = !!vaultAddress && guardianCountOnChain >= 2 && guardianThreshold >= 2 && !guardianSetupComplete;
  const isOwner = !!address && !!vaultOwner && address.toLowerCase() === (vaultOwner as string).toLowerCase();
  const pendingGuardianChange = pendingGuardianChangeRaw as [string, boolean, bigint] | undefined;
  const pendingGuardianAddress = pendingGuardianChange?.[0];
  const pendingGuardianActive = pendingGuardianChange?.[1] ?? false;
  const pendingGuardianEffectiveAt = Number(pendingGuardianChange?.[2] ?? 0n);
  const hasPendingGuardianChange = !!pendingGuardianAddress && pendingGuardianAddress !== CONTRACT_ADDRESSES.VFIDEToken && pendingGuardianAddress !== ZERO_ADDRESS && pendingGuardianEffectiveAt > 0;

  const clearNotices = () => { setActionError(null); setActionSuccess(null); };

  const withNotice = async (fn: () => Promise<unknown>, ok: string, fail: string) => {
    clearNotices();
    try { await fn(); setActionSuccess(ok); } catch (e) { setActionError(e instanceof Error ? e.message : fail); }
  };

  const handleAddGuardian = async () => {
    clearNotices();
    try {
      if (cardBoundMode && guardianSetupComplete && vaultAddress) {
        const hash = await writeContractAsync({
          address: vaultAddress,
          abi: ACTIVE_VAULT_ABI,
          functionName: 'proposeGuardianChange',
          args: [newGuardianAddress as `0x${string}`, true],
        });
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash });
        }
        setActionSuccess('Guardian add proposal submitted. Apply it after the 24-hour timelock.');
      } else {
        await addGuardian(newGuardianAddress as `0x${string}`);
        setActionSuccess('Guardian add transaction submitted.');
      }
      setNewGuardianAddress('');
      setShowAddForm(false);
    } catch (e) { setActionError(e instanceof Error ? e.message : 'Failed to add guardian'); }
  };

  const handleRemoveGuardian = async (guardianAddress: `0x${string}`) => {
    clearNotices();
    try {
      if (cardBoundMode && guardianSetupComplete && vaultAddress) {
        const hash = await writeContractAsync({
          address: vaultAddress,
          abi: ACTIVE_VAULT_ABI,
          functionName: 'proposeGuardianChange',
          args: [guardianAddress, false],
        });
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash });
        }
        setActionSuccess('Guardian removal proposal submitted. Apply it after the 24-hour timelock.');
        return;
      }

      await removeGuardian(guardianAddress);
      setActionSuccess('Guardian removal submitted.');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to remove guardian');
    }
  };

  const handleIssueAttestation = async (guardianAddress: `0x${string}`) => {
    clearNotices();
    if (!isOwner || !address || !vaultAddress) { setActionError('Only the vault owner can issue guardian attestations.'); return; }
    try {
      const now = Math.floor(Date.now() / 1000);
      const payload: GuardianAttestationPayload = { version: 'vfide-guardian-attestation-v1', owner: address, vault: vaultAddress, guardian: guardianAddress, issuedAt: now, expiresAt: now + 365 * 24 * 60 * 60 };
      const signature = await signMessageAsync({ message: buildGuardianAttestationMessage(payload) });
      const response = await fetch('/api/security/guardian-attestations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, signature }) });
      if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(typeof data?.error === 'string' ? data.error : `Attestation publish failed (${response.status})`); }
      setActionSuccess('Guardian attestation signed and published.');
    } catch (e) { setActionError(e instanceof Error ? e.message : 'Failed to issue guardian attestation'); }
  };

  const handleCompleteGuardianSetup = async () => {
    clearNotices();
    if (!isVaultHubAvailable) {
      setActionError('Vault hub contract is not configured in this environment.');
      return;
    }
    if (!vaultAddress) {
      setActionError('Create a vault before finalizing guardian setup.');
      return;
    }

    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.VaultHub,
        abi: VAULT_HUB_ABI,
        functionName: 'completeGuardianSetup',
        args: [vaultAddress],
      });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      setActionSuccess('Guardian setup finalized. Vault recovery and transfer protections are now fully enabled.');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to complete guardian setup');
    }
  };

  const handleApplyGuardianChange = async () => {
    clearNotices();
    if (!vaultAddress) {
      setActionError('Create a vault before applying guardian changes.');
      return;
    }

    try {
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: ACTIVE_VAULT_ABI,
        functionName: 'applyGuardianChange',
      });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      setActionSuccess('Pending guardian change applied.');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to apply guardian change');
    }
  };

  const handleCancelGuardianChange = async () => {
    clearNotices();
    if (!vaultAddress) {
      setActionError('Create a vault before cancelling guardian changes.');
      return;
    }

    try {
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: ACTIVE_VAULT_ABI,
        functionName: 'cancelGuardianChange',
      });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      setActionSuccess('Pending guardian change cancelled.');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to cancel guardian change');
    }
  };

  if (!isConnected) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        </motion.div>
        <h2 className="text-2xl font-bold text-white mb-4">Connect Wallet</h2>
        <p className="text-gray-400">Connect your wallet to manage your guardians</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-4xl mx-auto">
      {!hasVault && !isLoadingVault && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-amber-400 mb-2">Create Vault First</h3>
          <p className="text-gray-300 mb-4">Guardian management is tied to your vault contract.</p>
          <button onClick={() => void withNotice(() => createVault(), 'Vault creation submitted.', 'Failed to create vault')} disabled={isCreatingVault}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold disabled:opacity-50">
            {isCreatingVault ? 'Creating Vault...' : 'Create Vault'}
          </button>
        </div>
      )}

      {actionError && <div className="bg-red-500/15 border border-red-500/40 rounded-xl p-4 text-red-300 text-sm">{actionError}</div>}
      {actionSuccess && <div className="bg-green-500/15 border border-green-500/40 rounded-xl p-4 text-green-300 text-sm">{actionSuccess}</div>}

      {hasVault && (
        <div className={`rounded-2xl p-6 border ${guardianSetupExpired ? 'bg-red-500/10 border-red-500/30' : guardianSetupComplete ? 'bg-green-500/10 border-green-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className={`mt-1 ${guardianSetupExpired ? 'text-red-300' : guardianSetupComplete ? 'text-green-300' : 'text-amber-300'}`} size={20} />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-2">Guardian Setup Status</h3>
              <p className="text-sm text-gray-200 mb-3">
                {guardianSetupComplete
                  ? 'Guardian setup is complete. Recovery rotation and vault-to-vault transfer protections remain active.'
                  : guardianSetupExpired
                    ? 'Guardian setup grace period has expired. Complete setup now to restore guarded recovery and transfer flows.'
                    : 'Guardian setup is not yet finalized. Add enough guardians, then complete setup before the grace period expires.'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm mb-4">
                <div className="bg-black/20 rounded-lg p-3">
                  <p className="text-gray-400">Guardians</p>
                  <p className="text-white font-bold">{guardianCountOnChain}</p>
                </div>
                <div className="bg-black/20 rounded-lg p-3">
                  <p className="text-gray-400">Threshold</p>
                  <p className="text-white font-bold">{guardianThreshold}</p>
                </div>
                <div className="bg-black/20 rounded-lg p-3">
                  <p className="text-gray-400">Vault Status</p>
                  <p className="text-white font-bold">{guardianSetupComplete ? 'Complete' : guardianSetupExpired ? 'Expired' : 'Pending'}</p>
                </div>
              </div>
              {!guardianSetupComplete && (
                <button
                  onClick={() => void handleCompleteGuardianSetup()}
                  disabled={!canCompleteGuardianSetup || isGuardianSetupPending}
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold px-4 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGuardianSetupPending ? 'Finalizing...' : 'Complete Guardian Setup'}
                </button>
              )}
              {!canCompleteGuardianSetup && !guardianSetupComplete && (
                <p className="text-xs text-gray-400 mt-3">
                  You need at least 2 guardians and a threshold of at least 2 before guardian setup can be finalized.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {cardBoundMode && guardianSetupComplete && hasPendingGuardianChange && (
        <div className="rounded-2xl p-6 border border-cyan-500/30 bg-cyan-500/10">
          <h3 className="text-lg font-bold text-white mb-2">Pending Guardian Change</h3>
          <p className="text-sm text-gray-200 mb-3">
            {pendingGuardianActive ? 'Add guardian' : 'Remove guardian'} {pendingGuardianAddress}. This proposal can be applied after the 24-hour timelock expires or cancelled before then.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm mb-4">
            <div className="bg-black/20 rounded-lg p-3">
              <p className="text-gray-400">Guardian</p>
              <p className="text-white font-mono text-xs break-all">{pendingGuardianAddress}</p>
            </div>
            <div className="bg-black/20 rounded-lg p-3">
              <p className="text-gray-400">Action</p>
              <p className="text-white font-bold">{pendingGuardianActive ? 'Add' : 'Remove'}</p>
            </div>
            <div className="bg-black/20 rounded-lg p-3">
              <p className="text-gray-400">Effective At</p>
              <p className="text-white font-bold">{new Date(pendingGuardianEffectiveAt * 1000).toLocaleString()}</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => void handleApplyGuardianChange()}
              disabled={isGuardianSetupPending}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold px-4 py-3 disabled:opacity-50"
            >
              Apply Guardian Change
            </button>
            <button
              onClick={() => void handleCancelGuardianChange()}
              disabled={isGuardianSetupPending}
              className="border border-red-500/60 text-red-300 rounded-xl font-bold px-4 py-3 hover:bg-red-500/10 disabled:opacity-50"
            >
              Cancel Pending Change
            </button>
          </div>
        </div>
      )}

      {/* Guardian Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Guardians', value: guardianList.length, sub: 'Max recommended: 5', icon: Users, iconColor: 'text-cyan-400', textColor: 'text-cyan-400', gradient: 'from-cyan-500/20 to-blue-500/20' },
          { label: 'Mature Guardians', value: 'On-chain', sub: 'Checked at vote-time', icon: CheckCircle2, iconColor: 'text-green-400', textColor: 'text-green-400', gradient: 'from-green-500/20 to-emerald-500/20' },
          { label: 'Recovery Threshold', value: `${recoveryThreshold}/${guardianList.length || 1}`, sub: 'Approvals needed', icon: Shield, iconColor: 'text-yellow-400', textColor: 'text-yellow-400', gradient: 'from-yellow-500/20 to-amber-500/20' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            whileHover={{ scale: 1.02, y: -2 }} className={`relative overflow-hidden bg-gradient-to-br ${stat.gradient} backdrop-blur-xl border border-white/10 rounded-2xl p-6`}>
            <div className="flex items-center justify-between mb-2"><span className="text-gray-400 text-sm">{stat.label}</span><stat.icon className={stat.iconColor} size={20} /></div>
            <div className={`text-3xl font-bold ${stat.textColor}`}>{stat.value}</div>
            <div className="text-gray-500 text-xs">{stat.sub}</div>
          </motion.div>
        ))}
      </div>

      <AddGuardianForm showForm={showAddForm} setShowForm={setShowAddForm}
        newGuardianAddress={newGuardianAddress} setNewGuardianAddress={setNewGuardianAddress}
        onAdd={() => void handleAddGuardian()} isWritePending={isWritePending || isGuardianSetupPending} hasVault={hasVault} />

      {/* Guardian List */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Your Guardians</h3>
        {guardianList.length === 0 ? (
          <div className="p-6 bg-black/30 border border-white/10 rounded-xl text-center">
            <p className="text-gray-400">{cardBoundMode && guardianCountOnChain > 0 ? 'Guardian addresses are not enumerable from the current CardBound view.' : 'No guardians set yet.'}</p>
            <p className="text-gray-500 text-sm mt-1">{cardBoundMode && guardianCountOnChain > 0 ? 'The vault reports guardians on-chain, but this UI cannot list each address from the active ABI yet.' : 'Add trusted contacts to secure recovery.'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {guardianList.map((guardian, index) => (
              <motion.div key={guardian} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} whileHover={{ scale: 1.01 }}
                className="p-4 bg-black/20 border border-white/10 rounded-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-full bg-cyan-500/20"><Users className="text-cyan-400" size={20} /></div>
                    <div>
                      <div className="text-white font-bold">Guardian {index + 1}</div>
                      <div className="text-gray-400 text-sm font-mono">{guardian}</div>
                      <div className="text-gray-500 text-xs">Maturity checked on-chain when approving recovery</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      onClick={() => void handleIssueAttestation(guardian as `0x${string}`)} disabled={!isOwner || !hasVault}
                      className="p-2 border border-cyan-500/50 text-cyan-300 rounded-lg hover:bg-cyan-500/10 transition-colors disabled:opacity-50"
                      title="Issue owner-signed guardian attestation"><FileText size={18} /></motion.button>
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      onClick={() => void handleRemoveGuardian(guardian as `0x${string}`)}
                      disabled={isWritePending || !hasVault}
                      className="p-2 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"><UserMinus size={18} /></motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
