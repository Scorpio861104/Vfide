'use client';

import { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { motion } from 'framer-motion';
import { Shield, Users, UserMinus, CheckCircle2, FileText } from 'lucide-react';
import { useVaultHub } from '@/hooks/useVaultHub';
import { useVaultRecovery } from '@/hooks/useVaultRecovery';
import { buildGuardianAttestationMessage, type GuardianAttestationPayload } from '@/lib/recovery/guardianAttestation';

import { AddGuardianForm } from './AddGuardianForm';

export function MyGuardiansTab({ isConnected }: { isConnected: boolean }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGuardianAddress, setNewGuardianAddress] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { vaultAddress, hasVault, isLoadingVault, createVault, isCreatingVault } = useVaultHub();
  const { vaultOwner, guardians, guardianCount, isWritePending, addGuardian, removeGuardian } = useVaultRecovery(vaultAddress);
  const guardianList = guardians || [];
  const recoveryThreshold = guardianCount < 2 ? 2 : Math.floor(guardianCount / 2) + 1;
  const isOwner = !!address && !!vaultOwner && address.toLowerCase() === (vaultOwner as string).toLowerCase();

  const clearNotices = () => { setActionError(null); setActionSuccess(null); };

  const withNotice = async (fn: () => Promise<void>, ok: string, fail: string) => {
    clearNotices();
    try { await fn(); setActionSuccess(ok); } catch (e) { setActionError(e instanceof Error ? e.message : fail); }
  };

  const handleAddGuardian = async () => {
    clearNotices();
    try {
      await addGuardian(newGuardianAddress as `0x${string}`);
      setActionSuccess('Guardian add transaction submitted.');
      setNewGuardianAddress('');
      setShowAddForm(false);
    } catch (e) { setActionError(e instanceof Error ? e.message : 'Failed to add guardian'); }
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
        onAdd={() => void handleAddGuardian()} isWritePending={isWritePending} hasVault={hasVault} />

      {/* Guardian List */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Your Guardians</h3>
        {guardianList.length === 0 ? (
          <div className="p-6 bg-black/30 border border-white/10 rounded-xl text-center">
            <p className="text-gray-400">No guardians set yet.</p>
            <p className="text-gray-500 text-sm mt-1">Add trusted contacts to secure recovery.</p>
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
                      onClick={() => void withNotice(() => removeGuardian(guardian as `0x${string}`), 'Guardian removal submitted.', 'Failed to remove guardian')}
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
