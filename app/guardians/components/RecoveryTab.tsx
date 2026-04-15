'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { isAddress } from 'viem';
import { motion, AnimatePresence } from 'framer-motion';
import { Key } from 'lucide-react';
import { useVaultHub } from '@/hooks/useVaultHub';
import { useVaultRecovery } from '@/hooks/useVaultRecovery';
import { isCardBoundVaultMode } from '@/lib/contracts';

import { RecoveryActivePanel } from './RecoveryActivePanel';
import { RecoveryTimeline } from './RecoveryTimeline';

export function RecoveryTab({ isConnected }: { isConnected: boolean }) {
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const { address } = useAccount();
  const cardBoundMode = isCardBoundVaultMode();
  const { vaultAddress, hasVault, isLoadingVault, createVault, isCreatingVault } = useVaultHub();
  const {
    vaultOwner, recoveryStatus, guardianCount, isUserGuardian, isUserGuardianMature,
    isWritePending, requestRecovery, approveRecovery, finalizeRecovery, cancelRecovery,
  } = useVaultRecovery(vaultAddress);
  const isVaultOwner = !!address && !!vaultOwner && address.toLowerCase() === String(vaultOwner).toLowerCase();

  const clearNotices = () => { setActionError(null); setActionSuccess(null); };

  const withNotice = async (fn: () => Promise<unknown>, successMsg: string, failMsg: string) => {
    clearNotices();
    try { await fn(); setActionSuccess(successMsg); }
    catch (error) { setActionError(error instanceof Error ? error.message : failMsg); }
  };

  const handleRequestRecovery = async () => {
    clearNotices();
    if (cardBoundMode) {
      if (!isVaultOwner) { setActionError('Only the active CardBound vault admin can propose a wallet rotation.'); return; }
    } else {
      if (!isUserGuardian) { setActionError('Only guardians selected by the vault holder can open Chain of Return recovery.'); return; }
      if (!isUserGuardianMature) { setActionError('Guardian is still in maturity period. Wait 7 days before opening recovery.'); return; }
    }
    if (guardianCount < 2) { setActionError('Chain of Return in this vault requires at least 2 guardians before recovery can be finalized.'); return; }
    if (!isAddress(newAddress)) { setActionError('Enter a valid wallet address for the proposed new owner.'); return; }
    try {
      await requestRecovery(newAddress as `0x${string}`);
      setActionSuccess(cardBoundMode ? 'Wallet rotation proposed. Guardians can now approve until the timelock expires.' : 'Recovery request submitted. Guardians can now approve.');
      setShowRequestForm(false);
    } catch (error) { setActionError(error instanceof Error ? error.message : 'Failed to request recovery'); }
  };

  if (!isConnected) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
          <Key className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        </motion.div>
        <h2 className="text-2xl font-bold text-white mb-4">Connect Wallet</h2>
        <p className="text-gray-400">Connect your wallet to manage recovery</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-4xl mx-auto">
      {!hasVault && !isLoadingVault && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-amber-400 mb-2">Create Vault First</h3>
          <p className="text-gray-300 mb-4">
            {cardBoundMode
              ? 'Wallet rotation requires an active vault for guardian setup, pending rotation state, and approval checks.'
              : 'Chain of Return requires an active vault for recovery state and guardian checks.'}
          </p>
          <button onClick={() => void withNotice(() => createVault(), 'Vault creation submitted.', 'Failed to create vault')} disabled={isCreatingVault}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold disabled:opacity-50">
            {isCreatingVault ? 'Creating Vault...' : 'Create Vault'}
          </button>
        </div>
      )}

      {actionError && <div className="bg-red-500/15 border border-red-500/40 rounded-xl p-4 text-red-300 text-sm">{actionError}</div>}
      {actionSuccess && <div className="bg-green-500/15 border border-green-500/40 rounded-xl p-4 text-green-300 text-sm">{actionSuccess}</div>}

      {/* What is Chain of Return */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-3"><Key size={24} />{cardBoundMode ? 'CardBound Wallet Rotation' : 'Chain of Return'}</h2>
        <p className="text-white mb-4">
          {cardBoundMode
            ? 'CardBound vaults use guarded wallet rotation. The current vault admin proposes a new active wallet, guardians approve it, and the rotation finalizes after the configured timelock.'
            : 'Lost your wallet? Chain of Return allows you to recover vault access to a new wallet address with guardian approval. This is for living users who lost access, not for inheritance.'}
        </p>
        <div className="bg-black/30 rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-sm">
            {cardBoundMode
              ? 'Requires guardian approval plus a timelocked finalization. CardBound mode does not use legacy recovery cancellation or inheritance flows.'
              : 'Requires 2/3 guardian approval + 7-day maturity. Recovery expires after 30 days. Owner can cancel fraudulent requests at any time.'}
          </p>
        </div>
      </motion.div>

      {/* Active Recovery or Request Form */}
      {recoveryStatus.isActive ? (
        <RecoveryActivePanel
          cardBoundMode={cardBoundMode}
          recoveryStatus={recoveryStatus}
          isUserGuardian={isUserGuardian}
          isUserGuardianMature={isUserGuardianMature}
          isWritePending={isWritePending}
          hasVault={hasVault}
          onFinalize={() => void withNotice(() => finalizeRecovery(), cardBoundMode ? 'Wallet rotation finalized.' : 'Recovery finalized.', cardBoundMode ? 'Failed to finalize wallet rotation' : 'Failed to finalize recovery')}
          onCancel={() => void withNotice(() => cancelRecovery(), 'Recovery cancelled.', 'Failed to cancel recovery')}
          onApprove={() => void withNotice(() => approveRecovery(), cardBoundMode ? 'Rotation approval submitted.' : 'Approval submitted.', cardBoundMode ? 'Failed to approve wallet rotation' : 'Failed to approve recovery')}
        />
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">{cardBoundMode ? 'Propose Wallet Rotation' : 'Request Recovery'}</h3>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setShowRequestForm(!showRequestForm)} disabled={!hasVault}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-500/25">
              {showRequestForm ? 'Cancel' : cardBoundMode ? 'Start Rotation' : 'Start Recovery'}
            </motion.button>
          </div>
          <p className="text-gray-400 mb-4">{cardBoundMode ? 'No pending wallet rotation. Propose a new active wallet address to start the guarded rotation flow.' : 'No active recovery request. If you lost your wallet, start a recovery to regain access via a new address.'}</p>
          {!cardBoundMode && !isUserGuardian && <p className="text-amber-300 text-sm mb-4">Your current wallet is not configured as a guardian for this vault.</p>}
          {!cardBoundMode && isUserGuardian && !isUserGuardianMature && <p className="text-amber-300 text-sm mb-4">You are a guardian, but still in maturity period.</p>}
          {cardBoundMode && !isVaultOwner && <p className="text-amber-300 text-sm mb-4">Only the current CardBound vault admin can propose a wallet rotation.</p>}
          {guardianCount < 2 && (
            <p className="text-amber-300 text-sm mb-4">
              {cardBoundMode
                ? 'This CardBound vault needs at least 2 guardians before wallet rotation can be finalized.'
                : 'This vault has fewer than 2 guardians. Add at least one more.'}
            </p>
          )}

          <AnimatePresence>
            {showRequestForm && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="space-y-4 pt-4 border-t border-white/10">
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4">
                  <p className="text-yellow-400 text-sm"><strong>{cardBoundMode ? 'Who can propose rotation?' : 'Who can request recovery?'}</strong> {cardBoundMode ? 'The active CardBound vault admin, followed by guardian approvals.' : 'A mature guardian selected by the vault holder.'}</p>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">{cardBoundMode ? 'New Active Wallet Address' : 'New Owner Address (your new wallet)'}</label>
                  <input type="text" value={newAddress} onChange={(e) => setNewAddress(e.target.value)}
                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 font-mono transition-all" />
                </div>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => void handleRequestRecovery()}
                  disabled={isWritePending || !hasVault || !isAddress(newAddress) || (cardBoundMode ? !isVaultOwner : !isUserGuardian || !isUserGuardianMature) || guardianCount < 2}
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-500/25 disabled:opacity-50">
                  {cardBoundMode ? 'Propose Wallet Rotation' : 'Request Recovery'}
                </motion.button>
                <p className="text-gray-500 text-xs text-center">{cardBoundMode ? 'Rotation finalization is timelocked and requires guardian approvals.' : 'Recovery expires after 30 days. Finalization requires the minimum 7-day timelock.'}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      <RecoveryTimeline cardBoundMode={cardBoundMode} />
    </motion.div>
  );
}
