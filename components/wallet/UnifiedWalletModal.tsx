'use client';

/**
 * Unified Wallet Modal
 * 
 * A complete wallet experience combining:
 * - Traditional wallet connection (MetaMask, etc.)
 * - Embedded wallet (email/social login)
 * - Smart wallet features display
 * - Gasless transaction status
 * - Session key management
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useChainId } from 'wagmi';
import {
  X,
  Wallet,
  ArrowLeft,
  Sparkles,
  Key,
  Zap,
  Settings,
  ExternalLink,
  Shield,
  ChevronRight,
} from 'lucide-react';
import { WalletCapabilities } from './WalletCapabilities';
import { GaslessStatus } from './GaslessTransaction';
import { SessionKeyManager } from './SessionKeyManager';
import { useSmartWallet } from '@/hooks/useSmartWallet';
import { getExplorerLink } from '@/components/ui/EtherscanLink';

// ==================== TYPES ====================

type WalletView = 'main' | 'embedded' | 'capabilities' | 'gasless' | 'sessions' | 'settings';

export interface UnifiedWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Default to embedded wallet for new users */
  defaultToEmbedded?: boolean;
}

// ==================== TAB NAVIGATION ====================

interface TabButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: React.ReactNode;
}

function TabButton({ icon, label, active, onClick, badge }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg transition-colors w-full text-left
        ${active
          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
        }
      `}
    >
      {icon}
      <span className="flex-1 font-medium">{label}</span>
      {badge}
      <ChevronRight className="w-4 h-4 text-gray-400" />
    </button>
  );
}

// ==================== MAIN COMPONENT ====================

export function UnifiedWalletModal({
  isOpen,
  onClose,
  defaultToEmbedded = false,
}: UnifiedWalletModalProps) {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { capabilities } = useSmartWallet();
  const [view, setView] = useState<WalletView>(defaultToEmbedded ? 'main' : 'main');

  const isAuthenticated = isConnected;
  const walletAddress = address;

  if (!isOpen) return null;

  const renderContent = () => {
    switch (view) {
      case 'embedded':
        return (
          <div className="p-6">
            <button
              onClick={() => setView('main')}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div className="rounded-xl border border-amber-300/30 bg-amber-50/60 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
              Email and social embedded wallet login is temporarily unavailable in this build. Use wallet connection for now.
            </div>
          </div>
        );

      case 'capabilities':
        return (
          <div className="p-6">
            <button
              onClick={() => setView('main')}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <h2 className="text-xl font-bold mb-4">Wallet Capabilities</h2>
            <WalletCapabilities />
          </div>
        );

      case 'gasless':
        return (
          <div className="p-6">
            <button
              onClick={() => setView('main')}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <h2 className="text-xl font-bold mb-4">Gas Sponsorship</h2>
            <GaslessStatus />
          </div>
        );

      case 'sessions':
        return (
          <div className="p-6">
            <button
              onClick={() => setView('main')}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <SessionKeyManager />
          </div>
        );

      case 'settings':
        return (
          <div className="p-6">
            <button
              onClick={() => setView('main')}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <h2 className="text-xl font-bold mb-4">Wallet Settings</h2>
            <div className="space-y-4">
              <a
                href={walletAddress ? getExplorerLink(chainId, walletAddress, 'address') : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span>View on Explorer</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        );

      default:
        return (
          <div className="p-6">
            {isAuthenticated ? (
              <>
                {/* Connected Header */}
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                    <Wallet className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-xl font-bold">Connected</h2>
                  <p className="text-sm text-gray-500 font-mono mt-1">
                    {walletAddress?.slice(0, 8)}...{walletAddress?.slice(-6)}
                  </p>
                  {capabilities.isSmartWallet && (
                    <span className="inline-flex items-center gap-1 mt-2 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full">
                      <Shield className="w-3 h-3" />
                      Smart Wallet
                    </span>
                  )}
                </div>

                {/* Navigation */}
                <div className="space-y-2">
                  <TabButton
                    icon={<Sparkles className="w-5 h-5 text-purple-500" />}
                    label="Wallet Capabilities"
                    active={false}
                    onClick={() => setView('capabilities')}
                  />
                  <TabButton
                    icon={<Zap className="w-5 h-5 text-green-500" />}
                    label="Gasless Transactions"
                    active={false}
                    onClick={() => setView('gasless')}
                    badge={
                      capabilities.supportsGasless && (
                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
                          Available
                        </span>
                      )
                    }
                  />
                  <TabButton
                    icon={<Key className="w-5 h-5 text-amber-500" />}
                    label="Session Keys"
                    active={false}
                    onClick={() => setView('sessions')}
                    badge={
                      capabilities.supportsSessionKeys && (
                        <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs rounded-full">
                          Supported
                        </span>
                      )
                    }
                  />
                  <TabButton
                    icon={<Settings className="w-5 h-5 text-gray-500" />}
                    label="Settings"
                    active={false}
                    onClick={() => setView('settings')}
                  />
                </div>
              </>
            ) : (
              <>
                {/* Not Connected */}
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold mb-2">Connect Wallet</h2>
                  <p className="text-gray-500">
                    Choose how you want to connect
                  </p>
                </div>

                {/* Connection Options */}
                <div className="space-y-4">
                  {/* Traditional Wallet */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div className="flex items-center gap-3 mb-3">
                      <Wallet className="w-6 h-6 text-blue-500" />
                      <div>
                        <p className="font-semibold">Connect Wallet</p>
                        <p className="text-xs text-gray-500">MetaMask, Coinbase, etc.</p>
                      </div>
                    </div>
                    <ConnectButton.Custom>
                      {({ openConnectModal, mounted }) => (
                        <button
                          onClick={openConnectModal}
                          disabled={!mounted}
                          className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors"
                        >
                          Connect Wallet
                        </button>
                      )}
                    </ConnectButton.Custom>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white dark:bg-gray-900 text-gray-500">
                        or
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-amber-300/30 bg-amber-50/60 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                    Email/social embedded wallet login is disabled until the provider integration is fully wired and audited.
                  </div>
                </div>
              </>
            )}
          </div>
        );
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <div className="absolute top-4 right-4">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {renderContent()}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default UnifiedWalletModal;
