'use client';

/**
 * Enhanced Wallet Connection Component
 * 
 * Provides a seamless wallet connection experience with:
 * - Connection state management
 * - Auto-reconnect on disconnect
 * - Network switching prompts
 * - Connection status display
 * - Disconnect confirmation
 */

import React, { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  LogOut,
  ChevronDown,
  Check,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Copy,
  Shield,
} from 'lucide-react';
import { WalletCapabilities } from './WalletCapabilities';
import { useSmartWallet, useWalletTypeLabel } from '@/hooks/useSmartWallet';

// ==================== TYPES ====================

interface ChainInfo {
  id: number;
  name: string;
  icon?: string;
  isTestnet?: boolean;
}

export interface EnhancedConnectButtonProps {
  /** Show wallet capabilities in dropdown */
  showCapabilities?: boolean;
  /** Show chain switcher */
  showChainSwitcher?: boolean;
  /** Show balance */
  showBalance?: boolean;
  /** Custom button size */
  size?: 'sm' | 'md' | 'lg';
  /** Custom class name */
  className?: string;
}

// ==================== CONSTANTS ====================

const SUPPORTED_CHAINS: ChainInfo[] = [
  { id: 8453, name: 'Base', icon: '🔵' },
  { id: 137, name: 'Polygon', icon: '💜' },
  { id: 324, name: 'zkSync Era', icon: '⚡' },
  { id: 84532, name: 'Base Sepolia', icon: '🔵', isTestnet: true },
  { id: 80002, name: 'Polygon Amoy', icon: '💜', isTestnet: true },
  { id: 300, name: 'zkSync Sepolia', icon: '⚡', isTestnet: true },
];

// Pre-filter chains for better performance
const MAINNET_CHAINS = SUPPORTED_CHAINS.filter(c => !c.isTestnet);
const TESTNET_CHAINS = SUPPORTED_CHAINS.filter(c => c.isTestnet);

// ==================== HOOKS ====================

function useNetworkStatus() {
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching, error: switchError } = useSwitchChain();
  
  const currentChain = SUPPORTED_CHAINS.find(c => c.id === chainId);
  const isSupported = !!currentChain;
  
  // Validate chain ID before switching
  const validateAndSwitchChain = (targetChainId: number) => {
    const supportedIds = [8453, 137, 324, 84532, 80002, 300];
    if (!supportedIds.includes(targetChainId)) {
      console.warn(`Unsupported chain ID: ${targetChainId}`);
      return;
    }
    switchChain({ chainId: targetChainId as 8453 | 137 | 324 | 84532 | 80002 | 300 });
  };
  
  return {
    chainId,
    currentChain,
    isSupported,
    isSwitching,
    switchError,
    switchChain: validateAndSwitchChain,
  };
}

// ==================== COMPONENTS ====================

function AddressCopyButton({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      title="Copy address"
    >
      {copied ? (
        <Check className="w-4 h-4 text-green-500" />
      ) : (
        <Copy className="w-4 h-4 text-gray-400" />
      )}
    </button>
  );
}

function ChainSelector({
  currentChain,
  onSwitch,
  isSwitching,
}: {
  currentChain: ChainInfo | undefined;
  onSwitch: (chainId: number) => void;
  isSwitching: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        disabled={isSwitching}
      >
        {isSwitching ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : currentChain ? (
          <>
            <span>{currentChain.icon}</span>
            <span className="text-sm font-medium">{currentChain.name}</span>
          </>
        ) : (
          <>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-sm text-amber-600">Wrong Network</span>
          </>
        )}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
          >
            <div className="p-2">
              <p className="text-xs text-gray-500 px-2 py-1 uppercase tracking-wide">Mainnets</p>
              {MAINNET_CHAINS.map((chain) => (
                <button
                  key={chain.id}
                  onClick={() => {
                    onSwitch(chain.id);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left
                    transition-colors
                    ${currentChain?.id === chain.id 
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  <span className="text-lg">{chain.icon}</span>
                  <span className="font-medium">{chain.name}</span>
                  {currentChain?.id === chain.id && (
                    <Check className="w-4 h-4 ml-auto" />
                  )}
                </button>
              ))}
            </div>
            
            <div className="border-t border-gray-200 dark:border-gray-700 p-2">
              <p className="text-xs text-gray-500 px-2 py-1 uppercase tracking-wide">Testnets</p>
              {TESTNET_CHAINS.map((chain) => (
                <button
                  key={chain.id}
                  onClick={() => {
                    onSwitch(chain.id);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left
                    transition-colors
                    ${currentChain?.id === chain.id 
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  <span className="text-lg">{chain.icon}</span>
                  <span className="font-medium">{chain.name}</span>
                  {currentChain?.id === chain.id && (
                    <Check className="w-4 h-4 ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AccountDropdown({
  address,
  onDisconnect,
  showCapabilities,
}: {
  address: string;
  onDisconnect: () => void;
  showCapabilities: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { capabilities } = useSmartWallet();
  const walletTypeLabel = useWalletTypeLabel();
  
  const truncatedAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
  
  const handleDisconnect = () => {
    if (showConfirm) {
      onDisconnect();
      setIsOpen(false);
      setShowConfirm(false);
    } else {
      setShowConfirm(true);
    }
  };
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-linear-to-r from-blue-500 to-purple-500 text-white font-medium shadow-lg hover:shadow-xl transition-all"
      >
        <Wallet className="w-4 h-4" />
        <span>{truncatedAddress}</span>
        {capabilities.isSmartWallet && (
          <Shield className="w-3.5 h-3.5 text-blue-200" aria-label="Smart Wallet" />
        )}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
          >
            {/* Address Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-linear-to-r from-blue-400 to-purple-400" />
                  <div>
                    <p className="font-mono text-sm">{truncatedAddress}</p>
                    <p className="text-xs text-gray-500">{walletTypeLabel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <AddressCopyButton address={address} />
                  <a
                    href={`https://basescan.org/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="View on explorer"
                  >
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </a>
                </div>
              </div>
            </div>
            
            {/* Capabilities */}
            {showCapabilities && (
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <WalletCapabilities compact />
              </div>
            )}
            
            {/* Actions */}
            <div className="p-2">
              <button
                onClick={handleDisconnect}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left
                  transition-colors
                  ${showConfirm 
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }
                `}
                onBlur={() => setTimeout(() => setShowConfirm(false), 200)}
              >
                <LogOut className="w-4 h-4" />
                <span className="font-medium">
                  {showConfirm ? 'Click again to confirm' : 'Disconnect'}
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

export function EnhancedConnectButton({
  showCapabilities = true,
  showChainSwitcher = true,
  showBalance: _showBalance = true,
  size = 'md',
  className = '',
}: EnhancedConnectButtonProps) {
  const { address, isConnected, isConnecting, isReconnecting } = useAccount();
  const { disconnect } = useDisconnect();
  const { currentChain, isSupported, isSwitching, switchChain } = useNetworkStatus();
  
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };
  
  // Show RainbowKit's native button when not connected
  if (!isConnected) {
    return (
      <div className={className}>
        <ConnectButton.Custom>
          {({ openConnectModal, mounted }) => {
            const ready = mounted;
            
            return (
              <div
                {...(!ready && {
                  'aria-hidden': true,
                  style: {
                    opacity: 0,
                    pointerEvents: 'none',
                    userSelect: 'none',
                  },
                })}
              >
                <button
                  onClick={openConnectModal}
                  disabled={isConnecting || isReconnecting}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-xl
                    bg-linear-to-r from-blue-500 to-purple-500
                    text-white font-semibold shadow-lg
                    hover:shadow-xl hover:scale-[1.02]
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all duration-200
                    ${sizeClasses[size]}
                  `}
                >
                  {(isConnecting || isReconnecting) ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <Wallet className="w-5 h-5" />
                      <span>Connect Wallet</span>
                    </>
                  )}
                </button>
              </div>
            );
          }}
        </ConnectButton.Custom>
      </div>
    );
  }
  
  // Connected state
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Chain Selector */}
      {showChainSwitcher && (
        <ChainSelector
          currentChain={currentChain}
          onSwitch={switchChain}
          isSwitching={isSwitching}
        />
      )}
      
      {/* Wrong Network Warning */}
      <AnimatePresence>
        {!isSupported && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={() => switchChain(8453)} // Switch to Base by default
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-sm font-medium"
          >
            <AlertTriangle className="w-4 h-4" />
            Switch Network
          </motion.button>
        )}
      </AnimatePresence>
      
      {/* Account Dropdown */}
      {address && (
        <AccountDropdown
          address={address}
          onDisconnect={() => disconnect()}
          showCapabilities={showCapabilities}
        />
      )}
    </div>
  );
}

export default EnhancedConnectButton;
