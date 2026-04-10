'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Wallet, Plus, Check, Trash2, Edit2, X } from 'lucide-react';
import { getLinkedWallets, unlinkWallet, updateWalletLabel, setPrimaryWallet } from '@/lib/biometricAuth';

interface LinkedWallet {
  address: string;
  label?: string;
  isPrimary: boolean;
  linkedAt: number;
}

/**
 * Quick Wallet Switcher
 * 
 * Features:
 * - View all linked wallets
 * - Quick switch between wallets
 * - Add/remove wallets
 * - Set wallet labels
 */
export function WalletSwitcher() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  
  const [wallets, setWallets] = useState<LinkedWallet[]>(getLinkedWallets());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  // Refresh wallets list
  const refreshWallets = () => {
    setWallets(getLinkedWallets());
  };

  // Get injected connector
  const injectedConnector = connectors.find(c => 
    c.id === 'injected' || c.id === 'io.metamask' || c.id === 'metaMask'
  );

  // Switch to a different wallet
  const handleSwitchWallet = async (wallet: LinkedWallet) => {
    if (wallet.address.toLowerCase() === address?.toLowerCase()) return;
    
    // Disconnect current wallet
    disconnect();
    
    // Connect with injected (user will select wallet in MetaMask)
    if (injectedConnector) {
      setTimeout(() => {
        connect({ connector: injectedConnector });
      }, 500);
    }
  };

  // Add new wallet
  const handleAddWallet = () => {
    if (injectedConnector) {
      disconnect();
      setTimeout(() => {
        connect({ connector: injectedConnector });
      }, 500);
    }
  };

  // Remove wallet
  const handleRemoveWallet = (walletAddress: string) => {
    unlinkWallet(walletAddress);
    refreshWallets();
  };

  // Start editing label
  const handleStartEdit = (wallet: LinkedWallet) => {
    setEditingId(wallet.address);
    setEditLabel(wallet.label || '');
  };

  // Save label
  const handleSaveLabel = (walletAddress: string) => {
    updateWalletLabel(walletAddress, editLabel);
    setEditingId(null);
    refreshWallets();
  };

  // Set as primary
  const handleSetPrimary = (walletAddress: string) => {
    setPrimaryWallet(walletAddress);
    refreshWallets();
  };

  // Format address
  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  if (!isConnected) {
    return null;
  }

  return (
    <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Your Wallets</h3>
        <button
          onClick={handleAddWallet}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors"
        >
          <Plus size={14} />
          <span>Add Wallet</span>
        </button>
      </div>

      <div className="space-y-2">
        {wallets.map((wallet) => {
          const isCurrentWallet = wallet.address.toLowerCase() === address?.toLowerCase();
          const isEditing = editingId === wallet.address;

          return (
            <motion.div
              key={wallet.address}
              layout
              className={`p-3 rounded-lg border transition-colors ${
                isCurrentWallet 
                  ? 'bg-cyan-500/10 border-cyan-500/30' 
                  : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isCurrentWallet ? 'bg-cyan-500/20' : 'bg-zinc-700'
                }`}>
                  <Wallet size={18} className={isCurrentWallet ? 'text-cyan-400' : 'text-zinc-400'} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editLabel}
                        onChange={(e) =>  setEditLabel(e.target.value)}
                        placeholder="Wallet label..."
                        className="flex-1 px-2 py-1 text-sm bg-zinc-700 border border-zinc-600 rounded text-white focus:outline-none focus:border-cyan-500"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveLabel(wallet.address)}
                        className="p-1 text-green-400 hover:bg-green-500/20 rounded"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1 text-zinc-400 hover:bg-zinc-700 rounded"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">
                          {wallet.label || formatAddress(wallet.address)}
                        </span>
                        {wallet.isPrimary && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-cyan-500/20 text-cyan-400 rounded">
                            Primary
                          </span>
                        )}
                        {isCurrentWallet && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-green-500/20 text-green-400 rounded">
                            Active
                          </span>
                        )}
                      </div>
                      {wallet.label && (
                        <span className="text-xs text-zinc-500 font-mono">
                          {formatAddress(wallet.address)}
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Actions */}
                {!isEditing && (
                  <div className="flex items-center gap-1">
                    {!isCurrentWallet && (
                      <button
                        onClick={() => handleSwitchWallet(wallet)}
                        className="px-3 py-1.5 text-xs bg-zinc-700 text-zinc-300 rounded hover:bg-zinc-600 transition-colors"
                      >
                        Switch
                      </button>
                    )}
                    <button
                      onClick={() => handleStartEdit(wallet)}
                      className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    {!wallet.isPrimary && (
                      <button
                        onClick={() => handleRemoveWallet(wallet.address)}
                        className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Set as primary */}
              {!wallet.isPrimary && !isEditing && (
                <button
                  onClick={() => handleSetPrimary(wallet.address)}
                  className="mt-2 text-xs text-zinc-500 hover:text-cyan-400 transition-colors"
                >
                  Set as primary wallet
                </button>
              )}
            </motion.div>
          );
        })}

        {wallets.length === 0 && (
          <div className="text-center py-6 text-zinc-500">
            <Wallet size={24} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No wallets linked yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
