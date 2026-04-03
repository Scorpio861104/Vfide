// @ts-nocheck
'use client';

import { useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { Shield, Users, Clock, CheckCircle2, AlertCircle, Lock, FileText, ArrowRightCircle } from 'lucide-react';
import { mergeInboxEntries, useGuardianAttestations, useGuardianWatchlist } from './hooks';

export function ResponsibilitiesTab({ isConnected }: { isConnected: boolean }) {
  const [vaultInput, setVaultInput] = useState('');
  const [vaultLabel, setVaultLabel] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const { address } = useAccount();
  const { entries, addEntry, removeEntry } = useGuardianWatchlist();
  const { attestations } = useGuardianAttestations(address);
  const inboxEntries = useMemo(() => mergeInboxEntries(entries, attestations), [entries, attestations]);

  const handleAddVault = () => {
    const result = addEntry(vaultInput, vaultLabel);
    setNotice(result.message);
    if (result.ok) {
      setVaultInput('');
      setVaultLabel('');
    }
  };

  if (!isConnected) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-16"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Shield className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        </motion.div>
        <h2 className="text-2xl font-bold text-white mb-4">Connect Wallet</h2>
        <p className="text-gray-400">Connect your wallet to see vaults you&apos;re guarding</p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-4xl mx-auto"
    >
      <div className="bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Guardian Vault Watchlist</h2>
        <p className="text-gray-400 text-sm mb-4">
          Closed-system inbox: add specific vaults where you were selected as guardian. No public guardian discovery.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Vault address (0x...)"
            value={vaultInput}
            onChange={(e) => setVaultInput(e.target.value)}
            className="md:col-span-2 px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 font-mono"
          />
          <input
            type="text"
            placeholder="Label (optional)"
            value={vaultLabel}
            onChange={(e) => setVaultLabel(e.target.value)}
            className="px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
          />
        </div>
        <button
          onClick={handleAddVault}
          className="mt-3 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold"
        >
          Add Vault to Watchlist
        </button>
        {notice && <p className="text-sm text-cyan-200 mt-3">{notice}</p>}
      </div>

      <div className="bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-cyan-400" />
          Vaults You&apos;re Guarding ({inboxEntries.length})
        </h2>

        {inboxEntries.length === 0 ? (
          <div className="p-6 bg-black/30 border border-white/10 rounded-xl text-center">
            <p className="text-gray-400">No tracked vaults yet.</p>
            <p className="text-gray-500 text-sm mt-1">Add known vault addresses to build your private guardian inbox.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {inboxEntries.map((entry) => (
              <GuardianResponsibilitiesCard
                key={entry.address}
                entry={entry}
                userAddress={address}
                onRemove={entry.source === 'watchlist' ? () => removeEntry(entry.address) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-yellow-500/10 to-amber-500/5 border border-yellow-500/30 rounded-2xl p-6"
      >
        <h3 className="text-lg font-bold text-yellow-400 mb-3">⚠️ Guardian Responsibilities</h3>
        <ul className="space-y-2 text-white text-sm">
          <li>• <strong>Verify identity</strong> before approving any recovery request</li>
          <li>• <strong>Contact the owner</strong> through known channels (phone, in-person)</li>
          <li>• <strong>Never approve</strong> if you can&apos;t verify the request is legitimate</li>
          <li>• <strong>Report suspicious</strong> activity if you suspect fraud</li>
        </ul>
      </motion.div>
    </motion.div>
  );
}

export function PendingActionsTab({ isConnected }: { isConnected: boolean }) {
  const [vaultInput, setVaultInput] = useState('');
  const [vaultLabel, setVaultLabel] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const { address } = useAccount();
  const { entries, addEntry, removeEntry } = useGuardianWatchlist();
  const { attestations } = useGuardianAttestations(address);
  const inboxEntries = useMemo(() => mergeInboxEntries(entries, attestations), [entries, attestations]);

  const handleAddVault = () => {
    const result = addEntry(vaultInput, vaultLabel);
    setNotice(result.message);
    if (result.ok) {
      setVaultInput('');
      setVaultLabel('');
    }
  };

  if (!isConnected) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-16"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Shield className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        </motion.div>
        <h2 className="text-2xl font-bold text-white mb-4">Connect Wallet</h2>
        <p className="text-gray-400">Connect your wallet to see pending recovery requests</p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-4xl mx-auto"
    >
      <div className="bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Pending Recovery Inbox</h2>
        <p className="text-gray-400 text-sm mb-4">
          This inbox checks only vaults you add manually from trusted relationships. It is not an open guardian feed.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Vault address (0x...)"
            value={vaultInput}
            onChange={(e) => setVaultInput(e.target.value)}
            className="md:col-span-2 px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 font-mono"
          />
          <input
            type="text"
            placeholder="Label (optional)"
            value={vaultLabel}
            onChange={(e) => setVaultLabel(e.target.value)}
            className="px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
          />
        </div>
        <button
          onClick={handleAddVault}
          className="mt-3 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold"
        >
          Add Vault to Inbox
        </button>
        {notice && <p className="text-sm text-cyan-200 mt-3">{notice}</p>}
      </div>

      {inboxEntries.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-10"
        >
          <p className="text-gray-400">No tracked vaults yet. Add vault addresses to monitor active recovery requests.</p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {inboxEntries.map((entry) => (
            <GuardianPendingRecoveryCard
              key={entry.address}
              entry={entry}
              userAddress={address}
              onRemove={entry.source === 'watchlist' ? () => removeEntry(entry.address) : undefined}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

export function GuardianResponsibilitiesCard({
  entry,
  userAddress,
  onRemove,
}: {
  entry: WatchedVault;
  userAddress?: `0x${string}`;
  onRemove?: () => void;
}) {
  const recoverySupported = !isCardBoundVaultMode();

  const { data: owner } = useReadContract({
    address: entry.address,
    abi: USER_VAULT_ABI,
    functionName: 'owner',
    query: { enabled: recoverySupported },
  });

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

  const { data: recoveryStatus } = useReadContract({
    address: entry.address,
    abi: USER_VAULT_ABI,
    functionName: 'getRecoveryStatus',
    query: { enabled: recoverySupported },
  });

  const recovery = recoveryStatus as [string, bigint, bigint, bigint, boolean] | undefined;
  const activeRecovery = !!recovery && recovery[4];

  const status = !isGuardian
    ? { label: 'Not Assigned', className: 'text-red-300 bg-red-500/20' }
    : !isGuardianMature
      ? { label: 'Maturing', className: 'text-yellow-300 bg-yellow-500/20' }
      : activeRecovery
        ? { label: 'Action Required', className: 'text-amber-300 bg-amber-500/20' }
        : { label: 'Healthy', className: 'text-green-300 bg-green-500/20' };

  return (
    <div className="p-4 bg-black/20 border border-white/10 rounded-xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-white font-bold">{entry.label || shortAddress(entry.address)}</p>
          <p className="text-gray-400 text-sm font-mono">{entry.address}</p>
          <p className="text-gray-500 text-xs mt-1">Owner: {owner ? shortAddress(owner as string) : 'Loading...'}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${status.className}`}>{status.label}</span>
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
    </div>
  );
}

