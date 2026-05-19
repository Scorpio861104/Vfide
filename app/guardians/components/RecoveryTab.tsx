'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
/**
 * RecoveryTab — CardBound wallet rotation flow.
 *
 * Pre-cleanup this file had a parallel "Chain of Return" recovery flow
 * for legacy non-CardBound vaults (initiated by a mature guardian rather
 * than the vault admin, with a 7-day maturity wait, 30-day expiry, and
 * `cancelRecovery`). That flow is unreachable in this build —
 * `isCardBoundVaultMode()` is always true and `cancelRecovery` on the
 * recovery hook throws. All non-CardBound branches removed.
 */

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { isAddress } from 'viem';
import { motion, AnimatePresence } from 'framer-motion';
import { Key } from 'lucide-react';
import { useVaultHub } from '@/hooks/useVaultHub';
import { useVaultRecovery } from '@/hooks/useVaultRecovery';

import { RecoveryActivePanel } from './RecoveryActivePanel';
import { RecoveryTimeline } from './RecoveryTimeline';

export function RecoveryTab({ isConnected }: { isConnected: boolean }) {
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const { address } = useAccount();
  const { vaultAddress, hasVault, isLoadingVault, createVault, isCreatingVault } = useVaultHub();
  const {
    vaultOwner,
    recoveryStatus,
    guardianCount,
    isUserGuardian,
    isWritePending,
    requestRecovery,
    approveRecovery,
    finalizeRecovery,
  } = useVaultRecovery(vaultAddress);
  const isVaultOwner = !!address && !!vaultOwner && address.toLowerCase() === String(vaultOwner).toLowerCase();

  const clearNotices = () => {
    setActionError(null);
    setActionSuccess(null);
  };

  const withNotice = async (fn: () => Promise<unknown>, successMsg: string, failMsg: string) => {
    clearNotices();
    try {
      await fn();
      setActionSuccess(successMsg);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : failMsg);
    }
  };

  const handleRequestRecovery = async () => {
    clearNotices();
    if (!isVaultOwner) {
      setActionError('Only the active CardBound vault admin can propose a wallet rotation.');
      return;
    }
    if (guardianCount < 2) {
      setActionError('Wallet rotation requires at least 2 guardians before it can be finalized.');
      return;
    }
    if (!isAddress(newAddress)) {
      setActionError('Enter a valid wallet address for the new active signer.');
      return;
    }
    try {
      await requestRecovery(newAddress as `0x${string}`);
      setActionSuccess('Wallet rotation proposed. Guardians can now approve until the timelock expires.');
      setShowRequestForm(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to propose wallet rotation');
    }
  };

  if (!isConnected) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
          <Key className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        </motion.div>
        <h2 className="text-2xl font-bold text-white mb-4">Connect Wallet</h2>
        <p className="text-gray-400">Connect your wallet to manage wallet rotation</p>
        <div className="mt-6 flex justify-center"><ConnectButton /></div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-4xl mx-auto">
      {!hasVault && !isLoadingVault && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-amber-400 mb-2">Create Vault First</h3>
          <p className="text-gray-300 mb-4">
            Wallet rotation requires an active vault for guardian setup, pending rotation state, and approval checks.
          </p>
          <button
            onClick={() => void withNotice(() => createVault(), 'Vault creation submitted.', 'Failed to create vault')}
            disabled={isCreatingVault}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold disabled:opacity-50"
          >
            {isCreatingVault ? 'Creating Vault...' : 'Create Vault'}
          </button>
        </div>
      )}

      {actionError && (
        <div className="bg-red-500/15 border border-red-500/40 rounded-xl p-4 text-red-300 text-sm">
          {actionError}
        </div>
      )}
      {actionSuccess && (
        <div className="bg-green-500/15 border border-green-500/40 rounded-xl p-4 text-green-300 text-sm">
          {actionSuccess}
        </div>
      )}

      {/* About wallet rotation */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-2xl p-6"
      >
        <h2 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-3">
          <Key size={24} />
          CardBound Wallet Rotation
        </h2>
        <p className="text-white mb-4">
          CardBound vaults use guarded wallet rotation. The current vault admin proposes a new active wallet,
          guardians approve it, and the rotation finalizes after the configured timelock.
        </p>
        <div className="bg-black/30 rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-sm">
            Requires guardian approval plus a timelocked finalization.
          </p>
        </div>
      </motion.div>

      {/* Active rotation OR request form */}
      {recoveryStatus.isActive ? (
        <RecoveryActivePanel
          recoveryStatus={recoveryStatus}
          isUserGuardian={isUserGuardian}
          isWritePending={isWritePending}
          hasVault={hasVault}
          onFinalize={() =>
            void withNotice(() => finalizeRecovery(), 'Wallet rotation finalized.', 'Failed to finalize wallet rotation')
          }
          onApprove={() =>
            void withNotice(() => approveRecovery(), 'Rotation approval submitted.', 'Failed to approve wallet rotation')
          }
        />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4 gap-3">
            <h3 className="text-xl font-bold text-white min-w-0">Propose Wallet Rotation</h3>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowRequestForm(!showRequestForm)}
              disabled={!hasVault}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-500/25 disabled:opacity-50 flex-shrink-0"
            >
              {showRequestForm ? 'Cancel' : 'Start Rotation'}
            </motion.button>
          </div>
          <p className="text-gray-400 mb-4">
            No pending wallet rotation. Propose a new active wallet address to start the guarded rotation flow.
          </p>
          {!isVaultOwner && (
            <p className="text-amber-300 text-sm mb-4">
              Only the current CardBound vault admin can propose a wallet rotation.
            </p>
          )}
          {guardianCount < 2 && (
            <p className="text-amber-300 text-sm mb-4">
              This CardBound vault needs at least 2 guardians before wallet rotation can be finalized.
            </p>
          )}

          <AnimatePresence>
            {showRequestForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 pt-4 border-t border-white/10"
              >
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4">
                  <p className="text-yellow-400 text-sm">
                    <strong>Who can propose rotation?</strong> The active CardBound vault admin, followed by guardian approvals.
                  </p>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">New Active Wallet Address</label>
                  <input
                    type="text"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 font-mono transition-all"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => void handleRequestRecovery()}
                  disabled={isWritePending || !hasVault || !isAddress(newAddress) || !isVaultOwner || guardianCount < 2}
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-500/25 disabled:opacity-50"
                >
                  Propose Wallet Rotation
                </motion.button>
                <p className="text-gray-500 text-xs text-center">
                  Rotation finalization is timelocked and requires guardian approvals.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      <RecoveryTimeline />
    </motion.div>
  );
}
