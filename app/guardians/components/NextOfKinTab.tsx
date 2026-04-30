'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { isAddress } from 'viem';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, AlertCircle } from 'lucide-react';
import { useVaultHub } from '@/hooks/useVaultHub';
import { useVaultRecovery } from '@/hooks/useVaultRecovery';
import { isCardBoundVaultMode } from '@/lib/contracts';

import { useNextOfKinWatchlist } from './hooks';
import { ZERO_ADDRESS } from './types';
import { NextOfKinInboxCard } from './NextOfKinInboxCard';

export function NextOfKinTab({ isConnected }: { isConnected: boolean }) {
  const [showSetForm, setShowSetForm] = useState(false);
  const [newKinAddress, setNewKinAddress] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [inboxVaultInput, setInboxVaultInput] = useState('');
  const [inboxVaultLabel, setInboxVaultLabel] = useState('');
  const [inboxNotice, setInboxNotice] = useState<string | null>(null);

  const cardBoundMode = isCardBoundVaultMode();
  const { address } = useAccount();
  const { vaultAddress, hasVault, isLoadingVault, createVault, isCreatingVault } = useVaultHub();
  const { entries: inboxEntries, addEntry: addInboxEntry, removeEntry: removeInboxEntry } = useNextOfKinWatchlist();
  const {
    vaultOwner, nextOfKin, inheritanceStatus,
    isUserGuardian, isUserGuardianMature, isWritePending,
    setNextOfKinAddress, requestInheritance, approveInheritance,
    denyInheritance, finalizeInheritance, cancelInheritance, guardianCancelInheritance,
  } = useVaultRecovery(vaultAddress);

  const inheritanceRequest = inheritanceStatus.isActive;
  const nextOfKinValue = (nextOfKin as string | null | undefined) ?? null;
  const normalizedNextOfKin = nextOfKinValue ? nextOfKinValue.toLowerCase() : null;
  const isOwner = !!address && !!vaultOwner && address.toLowerCase() === (vaultOwner as string).toLowerCase();
  const isNextOfKin = !!address && !!normalizedNextOfKin && address.toLowerCase() === normalizedNextOfKin;

  const clearNotices = () => { setActionError(null); setActionSuccess(null); };

  const safeExec = async (fn: () => Promise<unknown>, successMsg: string, failMsg: string) => {
    clearNotices();
    try { await fn(); setActionSuccess(successMsg); }
    catch (error) { setActionError(error instanceof Error ? error.message : failMsg); }
  };

  if (!isConnected) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
          <Heart className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        </motion.div>
        <h2 className="text-2xl font-bold text-white mb-4">Connect Wallet</h2>
        <p className="text-gray-400">Connect your wallet to manage your Next of Kin</p>
      </motion.div>
    );
  }

  if (cardBoundMode) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-3"><Heart size={24} />Next of Kin Unavailable</h2>
          <p className="text-white mb-4">
            CardBound vaults do not implement the legacy inheritance and next-of-kin contract surface. This tab is disabled in CardBound mode to avoid calling missing functions.
          </p>
          <div className="bg-black/30 rounded-xl p-4 border border-white/10 text-sm text-gray-300">
            Guardian setup, wallet rotation, and vault-to-vault transfer protections remain available. Inheritance-specific actions require a legacy UserVault deployment and are not part of the active CardBound system.
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-4xl mx-auto">
      {/* Create Vault CTA */}
      {!hasVault && !isLoadingVault && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-amber-400 mb-2">Create Vault First</h3>
          <p className="text-gray-300 mb-4">Next of Kin configuration and inheritance status are managed from your vault contract.</p>
          <button onClick={() => void safeExec(createVault, 'Vault creation submitted.', 'Failed to create vault')}
            disabled={isCreatingVault} className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-black rounded-xl font-bold disabled:opacity-50">
            {isCreatingVault ? 'Creating Vault...' : 'Create Vault'}
          </button>
        </div>
      )}

      {actionError && <div className="bg-red-500/15 border border-red-500/40 rounded-xl p-4 text-red-300 text-sm">{actionError}</div>}
      {actionSuccess && <div className="bg-green-500/15 border border-green-500/40 rounded-xl p-4 text-green-300 text-sm">{actionSuccess}</div>}

      {/* What is Next of Kin */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-3"><Heart size={24} />What is Next of Kin?</h2>
        <p className="text-white mb-4">Next of Kin is your designated heir who can inherit your vault funds if you pass away. This is different from recovery (lost wallet) - inheritance requires guardian verification of death.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="bg-black/30 rounded-xl p-4 border border-white/10">
            <h4 className="text-cyan-400 font-bold mb-2">Chain of Return</h4>
            <p className="text-gray-400 text-sm">Lost wallet recovery. You&apos;re alive but can&apos;t access your wallet.</p>
          </div>
          <div className="bg-black/30 rounded-xl p-4 border border-white/10">
            <h4 className="text-yellow-400 font-bold mb-2">Next of Kin (Inheritance)</h4>
            <p className="text-gray-400 text-sm">Death inheritance. Funds transfer to designated heir after guardian verification.</p>
          </div>
        </div>
      </motion.div>

      {/* Current Next of Kin */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Current Next of Kin</h3>
          {isOwner && (
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowSetForm(!showSetForm)}
              className="px-4 py-2 border border-cyan-500/50 text-cyan-400 rounded-xl font-bold hover:bg-cyan-500/10 transition-colors">
              {showSetForm ? 'Cancel' : 'Change'}
            </motion.button>
          )}
        </div>

        {nextOfKin && nextOfKin !== ZERO_ADDRESS ? (
          <div className="p-4 bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/20 rounded-full"><Heart className="text-yellow-400" size={24} /></div>
              <div>
                <div className="text-white font-bold text-lg">Configured On-Chain</div>
                <div className="text-gray-400 text-sm font-mono">{nextOfKin}</div>
                {inheritanceStatus.isActive && <div className="text-amber-300 text-xs mt-1">Active claim: {inheritanceStatus.approvals}/{inheritanceStatus.threshold} approvals</div>}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-black/30 border border-white/10 rounded-xl text-center">
            <Heart className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-400">No Next of Kin designated</p>
            <p className="text-gray-500 text-sm mt-1">Protect your legacy by setting an inheritor</p>
          </div>
        )}

        <AnimatePresence>
          {showSetForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="space-y-4 pt-4 mt-4 border-t border-white/10">
              <div>
                <label className="block text-gray-400 text-sm mb-2">New Next of Kin Address</label>
                <input type="text" value={newKinAddress} onChange={(e) => setNewKinAddress(e.target.value)}
                  className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 font-mono transition-all" />
              </div>
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-red-400 text-sm"><strong>Warning:</strong> Your Next of Kin must have their own VFIDE vault. They need 2/3 guardian approval to claim.</p>
              </div>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => void safeExec(async () => { await setNextOfKinAddress(newKinAddress as `0x${string}`); setShowSetForm(false); setNewKinAddress(''); }, 'Next of Kin update submitted.', 'Failed to set Next of Kin')}
                disabled={!isOwner || !isAddress(newKinAddress) || isWritePending || !hasVault}
                className="w-full py-3 bg-gradient-to-r from-yellow-500 to-amber-500 text-black rounded-xl font-bold shadow-lg shadow-yellow-500/25">
                Set Next of Kin
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Active Inheritance Request */}
      {inheritanceRequest && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/30 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2"><AlertCircle size={20} />Active Inheritance Request</h3>
          <p className="text-white mb-4">Inheritance claim is currently active on this vault. Actions below are role-gated on-chain.</p>
          <div className="bg-black/30 border border-white/10 rounded-xl p-3 mb-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div><div className="text-gray-500">Approvals</div><div className="text-white font-bold">{inheritanceStatus.approvals}/{inheritanceStatus.threshold}</div></div>
            <div><div className="text-gray-500">Expires In</div><div className="text-white font-bold">{inheritanceStatus.daysRemaining !== null ? `${inheritanceStatus.daysRemaining} days` : 'n/a'}</div></div>
            <div><div className="text-gray-500">Owner Denied</div><div className={`font-bold ${inheritanceStatus.denied ? 'text-red-300' : 'text-green-300'}`}>{inheritanceStatus.denied ? 'Yes' : 'No'}</div></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {isUserGuardian && <button onClick={() => void safeExec(approveInheritance, 'Approval submitted.', 'Failed')} disabled={isWritePending || !hasVault || !isUserGuardianMature} className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-green-500/25 disabled:opacity-50">Approve (Guardian)</button>}
            {isUserGuardian && <button onClick={() => void safeExec(guardianCancelInheritance, 'Cancellation submitted.', 'Failed')} disabled={isWritePending || !hasVault || !isUserGuardianMature} className="w-full py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-500/25 disabled:opacity-50">Cancel Vote (Guardian)</button>}
            {isNextOfKin && <button onClick={() => void safeExec(finalizeInheritance, 'Finalization submitted.', 'Failed')} disabled={isWritePending || !hasVault} className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold shadow-lg shadow-cyan-500/25 disabled:opacity-50">Finalize (Next of Kin)</button>}
            {isOwner && <button onClick={() => void safeExec(denyInheritance, 'Denial submitted.', 'Failed')} disabled={isWritePending || !hasVault} className="w-full py-3 border border-red-500/60 text-red-300 rounded-xl font-bold hover:bg-red-500/10 disabled:opacity-50">Deny (Owner)</button>}
            {isOwner && <button onClick={() => void safeExec(cancelInheritance, 'Cancellation submitted.', 'Failed')} disabled={isWritePending || !hasVault} className="w-full py-3 border border-red-500/60 text-red-300 rounded-xl font-bold hover:bg-red-500/10 disabled:opacity-50">Cancel (Owner)</button>}
          </div>
        </motion.div>
      )}

      {/* Next of Kin can request inheritance */}
      {!inheritanceRequest && isNextOfKin && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border border-cyan-500/30 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-cyan-400 mb-3">You are the configured Next of Kin</h3>
          <p className="text-gray-300 mb-4">If inheritance conditions are met, you can open the claim process on this vault from this tab.</p>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => void safeExec(requestInheritance, 'Inheritance request submitted.', 'Failed')}
            disabled={isWritePending || !hasVault}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold shadow-lg shadow-cyan-500/25 disabled:opacity-50">
            Request Inheritance (Next of Kin)
          </motion.button>
        </motion.div>
      )}

      {/* Inbox */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-2">Next of Kin Claim Inbox</h3>
        <p className="text-gray-400 text-sm mb-4">Track external vaults where you may be configured as Next of Kin. This is private and manual; there is no public heir directory.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input type="text" value={inboxVaultInput} onChange={(e) => setInboxVaultInput(e.target.value)}
            className="md:col-span-2 px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-yellow-500/50 font-mono" />
          <input type="text" value={inboxVaultLabel} onChange={(e) => setInboxVaultLabel(e.target.value)}
            className="px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-yellow-500/50" />
        </div>
        <button onClick={() => { const r = addInboxEntry(inboxVaultInput, inboxVaultLabel); setInboxNotice(r.message); if (r.ok) { setInboxVaultInput(''); setInboxVaultLabel(''); } }}
          className="mt-3 px-4 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-black rounded-xl font-bold">Add Vault to Kin Inbox</button>
        {inboxNotice && <p className="text-sm text-yellow-200 mt-3">{inboxNotice}</p>}

        {inboxEntries.length === 0 ? (
          <div className="mt-4 p-6 bg-black/30 border border-white/10 rounded-xl text-center">
            <p className="text-gray-400">No tracked inheritance vaults yet.</p>
            <p className="text-gray-500 text-sm mt-1">Add known vault addresses to monitor inheritance status.</p>
          </div>
        ) : (
          <div className="space-y-3 mt-4">
            {inboxEntries.map((entry) => (
              <NextOfKinInboxCard key={entry.address} entry={entry} userAddress={address} onRemove={() => removeInboxEntry(entry.address)} />
            ))}
          </div>
        )}
      </motion.div>

      {/* Inheritance Process Steps */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Inheritance Process</h3>
        <div className="space-y-3">
          {[
            { step: '1', title: 'Next of Kin Initiates Claim', desc: 'After your passing, they call requestInheritance()' },
            { step: '2', title: '7-Day Timelock', desc: 'Mandatory delay before finalization, even after threshold approvals' },
            { step: '3', title: 'Guardian Verification', desc: '2/3 guardians must verify death and approve transfer' },
            { step: '4', title: 'Finalize Before Expiry', desc: 'Finalization must happen within 30 days, then funds transfer to heir vault' },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
              className="flex gap-4 p-3 bg-black/20 rounded-xl border border-white/10">
              <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-full flex items-center justify-center text-black font-bold shrink-0 text-sm shadow-lg shadow-yellow-500/25">{item.step}</div>
              <div><div className="text-white font-bold text-sm">{item.title}</div><div className="text-gray-400 text-xs">{item.desc}</div></div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
