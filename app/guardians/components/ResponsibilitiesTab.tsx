'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Users } from 'lucide-react';
import { useAccount } from 'wagmi';

import { mergeInboxEntries, useGuardianAttestations, useGuardianWatchlist } from './hooks';
import { GuardianResponsibilitiesCard } from './GuardianResponsibilitiesCard';

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
        className="py-16 text-center"
      >
        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
          <Shield className="mx-auto mb-4 h-16 w-16 text-gray-400" />
        </motion.div>
        <h2 className="mb-4 text-2xl font-bold text-white">Connect Wallet</h2>
        <p className="text-gray-400">Connect your wallet to see vaults you&apos;re guarding</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-4xl space-y-6"
    >
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/8 to-white/2 p-6 backdrop-blur-xl">
        <h2 className="mb-4 text-xl font-bold text-white">Guardian Vault Watchlist</h2>
        <p className="mb-4 text-sm text-gray-400">
          Closed-system inbox: add specific vaults where you were selected as guardian. No public guardian discovery.
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            type="text"
           
            value={vaultInput}
            onChange={(e) => setVaultInput(e.target.value)}
            className="font-mono md:col-span-2 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white focus:border-cyan-500/50 focus:outline-none"
          />
          <input
            type="text"
           
            value={vaultLabel}
            onChange={(e) => setVaultLabel(e.target.value)}
            className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white focus:border-cyan-500/50 focus:outline-none"
          />
        </div>
        <button
          onClick={handleAddVault}
          className="mt-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 font-bold text-white"
        >
          Add Vault to Watchlist
        </button>
        {notice && <p className="mt-3 text-sm text-cyan-200">{notice}</p>}
      </div>

      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/8 to-white/2 p-6 backdrop-blur-xl">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-white">
          <Users className="h-5 w-5 text-cyan-400" />
          Vaults You&apos;re Guarding ({inboxEntries.length})
        </h2>

        {inboxEntries.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-black/30 p-6 text-center">
            <p className="text-gray-400">No tracked vaults yet.</p>
            <p className="mt-1 text-sm text-gray-500">Add known vault addresses to build your private guardian inbox.</p>
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
        className="rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-amber-500/5 p-6"
      >
        <h3 className="mb-3 text-lg font-bold text-yellow-400">⚠️ Guardian Responsibilities</h3>
        <ul className="space-y-2 text-sm text-white">
          <li>• <strong>Verify identity</strong> before approving any recovery request</li>
          <li>• <strong>Contact the owner</strong> through known channels (phone, in-person)</li>
          <li>• <strong>Never approve</strong> if you can&apos;t verify the request is legitimate</li>
          <li>• <strong>Report suspicious</strong> activity if you suspect fraud</li>
        </ul>
      </motion.div>
    </motion.div>
  );
}

export { PendingActionsTab } from './PendingActionsTab';
export { GuardianResponsibilitiesCard } from './GuardianResponsibilitiesCard';

