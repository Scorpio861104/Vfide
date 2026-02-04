'use client';

/**
 * Wallet Capabilities Display Component
 * 
 * Shows the current wallet's smart wallet features and capabilities
 * in a beautiful, informative UI.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSmartWallet, useWalletTypeLabel } from '@/hooks/useSmartWallet';
import { useAccount } from 'wagmi';
import {
  CheckCircle,
  XCircle,
  Loader2,
  Shield,
  Zap,
  Layers,
  Users,
  Key,
  RefreshCcw,
  Info,
  Wallet,
  Sparkles,
} from 'lucide-react';

// ==================== TYPES ====================

interface CapabilityItemProps {
  icon: React.ReactNode;
  label: string;
  supported: boolean;
  description: string;
}

// ==================== SUB-COMPONENTS ====================

function CapabilityItem({ icon, label, supported, description }: CapabilityItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`
        flex items-center gap-3 p-3 rounded-lg border transition-colors
        ${supported 
          ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400' 
          : 'bg-gray-500/10 border-gray-500/20 text-gray-500 dark:text-gray-400'
        }
      `}
    >
      <div className="shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{label}</span>
          {supported ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <XCircle className="w-4 h-4 text-gray-400" />
          )}
        </div>
        <p className="text-xs opacity-75 mt-0.5 truncate">{description}</p>
      </div>
    </motion.div>
  );
}

function WalletTypeCard({ type, label }: { type: string; label: string }) {
  const getTypeStyles = () => {
    switch (type) {
      case 'safe':
        return 'from-green-500 to-emerald-600';
      case 'coinbase-smart':
        return 'from-blue-500 to-indigo-600';
      case 'smart-contract':
        return 'from-purple-500 to-violet-600';
      case 'eoa':
        return 'from-gray-500 to-gray-600';
      default:
        return 'from-gray-400 to-gray-500';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'safe':
        return <Users className="w-6 h-6" />;
      case 'coinbase-smart':
        return <Sparkles className="w-6 h-6" />;
      case 'smart-contract':
        return <Shield className="w-6 h-6" />;
      default:
        return <Wallet className="w-6 h-6" />;
    }
  };

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`
        bg-gradient-to-br ${getTypeStyles()}
        text-white rounded-xl p-4 shadow-lg
      `}
    >
      <div className="flex items-center gap-3">
        {getIcon()}
        <div>
          <p className="text-sm opacity-80">Wallet Type</p>
          <p className="font-semibold text-lg">{label}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ==================== MAIN COMPONENT ====================

export interface WalletCapabilitiesProps {
  /** Whether to show in compact mode */
  compact?: boolean;
  /** Custom class name */
  className?: string;
}

export function WalletCapabilities({ compact = false, className = '' }: WalletCapabilitiesProps) {
  const { isConnected } = useAccount();
  const { capabilities, isLoading, error, refresh, implementationAddress } = useSmartWallet();
  const walletTypeLabel = useWalletTypeLabel();

  if (!isConnected) {
    return (
      <div className={`p-4 rounded-lg bg-gray-100 dark:bg-gray-800 text-center ${className}`}>
        <Wallet className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-500">Connect a wallet to view capabilities</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`p-4 rounded-lg bg-gray-100 dark:bg-gray-800 text-center ${className}`}>
        <Loader2 className="w-8 h-8 mx-auto mb-2 text-blue-500 animate-spin" />
        <p className="text-sm text-gray-500">Detecting wallet capabilities...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 ${className}`}>
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
          <XCircle className="w-5 h-5" />
          <span className="font-medium">Detection Failed</span>
        </div>
        <p className="text-sm text-red-500">{error}</p>
        <button
          onClick={refresh}
          className="mt-3 text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
        >
          <RefreshCcw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  const capabilityItems = [
    {
      icon: <Layers className="w-5 h-5" />,
      label: 'Transaction Batching',
      supported: capabilities.supportsBatching,
      description: 'Execute multiple transactions in one',
    },
    {
      icon: <Zap className="w-5 h-5" />,
      label: 'Gasless Transactions',
      supported: capabilities.supportsGasless,
      description: 'Transactions without gas fees',
    },
    {
      icon: <Key className="w-5 h-5" />,
      label: 'Session Keys',
      supported: capabilities.supportsSessionKeys,
      description: 'Pre-approve specific actions',
    },
    {
      icon: <RefreshCcw className="w-5 h-5" />,
      label: 'Social Recovery',
      supported: capabilities.supportsSocialRecovery,
      description: 'Recover wallet via trusted contacts',
    },
    {
      icon: <Users className="w-5 h-5" />,
      label: 'Multisig Support',
      supported: capabilities.supportsMultisig,
      description: 'Multiple signers required',
    },
    {
      icon: <Shield className="w-5 h-5" />,
      label: 'Paymaster Support',
      supported: capabilities.supportsPaymaster,
      description: 'Sponsored transaction fees',
    },
  ];

  if (compact) {
    // Compact mode - just show supported features as badges
    const supportedFeatures = capabilityItems.filter(item => item.supported);
    
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {capabilities.isSmartWallet && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
            <Sparkles className="w-3 h-3" />
            Smart Wallet
          </span>
        )}
        {supportedFeatures.map((feature) => (
          <span
            key={feature.label}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
            title={feature.description}
          >
            {feature.icon}
            {feature.label}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Wallet Type Header */}
      <WalletTypeCard type={capabilities.walletType} label={walletTypeLabel} />

      {/* Smart Wallet Info Banner */}
      {capabilities.isSmartWallet && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
        >
          <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-700 dark:text-blue-300">
              Smart Contract Wallet Detected
            </p>
            <p className="text-blue-600 dark:text-blue-400 opacity-80 mt-1">
              Your wallet has enhanced capabilities compared to standard EOA wallets.
              {capabilities.supportsNativeAA && ' Native account abstraction is available on this chain.'}
            </p>
          </div>
        </motion.div>
      )}

      {/* Capabilities Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <AnimatePresence mode="popLayout">
          {capabilityItems.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <CapabilityItem {...item} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Implementation Address (for advanced users) */}
      {implementationAddress && (
        <div className="text-xs text-gray-500 dark:text-gray-400 p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
          <span className="font-medium">Implementation:</span>{' '}
          <code className="font-mono">
            {implementationAddress.slice(0, 10)}...{implementationAddress.slice(-8)}
          </code>
        </div>
      )}

      {/* Refresh Button */}
      <button
        onClick={refresh}
        className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center justify-center gap-2 transition-colors"
      >
        <RefreshCcw className="w-4 h-4" />
        Refresh Detection
      </button>
    </div>
  );
}

export default WalletCapabilities;
