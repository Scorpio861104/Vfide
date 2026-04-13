'use client';

import { useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import { useGuardianWatchlist, useGuardianAttestations, mergeInboxEntries } from './hooks';
import { GuardianResponsibilitiesCard } from './GuardianResponsibilitiesCard';
import { GuardianPendingRecoveryCard } from './GuardianPendingRecoveryCard';

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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
          <Shield className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        </motion.div>
        <h2 className="text-2xl font-bold text-white mb-4">Connect Wallet</h2>
        <p className="text-gray-400">Connect your wallet to see pending recovery requests</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-3">
          <Shield size={24} />
          Guardian Inbox
        </h2>
        <p className="text-white mb-4">
          As a guardian, you may be asked to vote on recovery or inheritance requests. Track vault addresses you guard and act when needed.
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-2">Guardian Watchlist</h3>
        <p className="text-gray-400 text-sm mb-4">Add vault addresses you guard. This is local and private.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input type="text" value={vaultInput} onChange={(e) => setVaultInput(e.target.value)}
            className="md:col-span-2 px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 font-mono" />
          <input type="text" value={vaultLabel} onChange={(e) => setVaultLabel(e.target.value)}
            className="px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50" />
        </div>
        <button onClick={handleAddVault}
          className="mt-3 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold">
          Add Vault to Watchlist
        </button>
        {notice && <p className="text-sm text-cyan-200 mt-3">{notice}</p>}

        {inboxEntries.length === 0 ? (
          <div className="mt-4 p-6 bg-black/30 border border-white/10 rounded-xl text-center">
            <p className="text-gray-400">No vaults in watchlist yet.</p>
            <p className="text-gray-500 text-sm mt-1">Add vault addresses to monitor recovery and inheritance status.</p>
          </div>
        ) : (
          <div className="space-y-3 mt-4">
            {inboxEntries.map((entry) => (
              <GuardianPendingRecoveryCard key={entry.address} entry={entry} userAddress={address} onRemove={() => removeEntry(entry.address)} />
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
