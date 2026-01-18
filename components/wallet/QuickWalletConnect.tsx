"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount, useConnect, useDisconnect, useBalance, useChainId, useSwitchChain } from 'wagmi';
import { Wallet, ChevronDown, Check, Copy, ExternalLink, LogOut, RefreshCw, Zap } from 'lucide-react';
import { baseSepolia, base } from 'wagmi/chains';
import { IS_TESTNET } from '@/lib/chains';

interface QuickWalletConnectProps {
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Streamlined One-Click Wallet Connection
 * 
 * Improvements over the original:
 * 1. One-click MetaMask connection (no modal)
 * 2. Inline wallet dropdown (no separate modal)
 * 3. Quick balance display
 * 4. Fast network switching
 * 5. Minimal UI, maximum speed
 */
export function QuickWalletConnect({ size = 'md' }: QuickWalletConnectProps) {
  const { address, isConnected, isConnecting, isReconnecting } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { data: balance } = useBalance({ address });
  
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Get MetaMask connector for one-click connect
  const metaMaskConnector = connectors.find(c => 
    c.id === 'io.metamask' || c.id === 'metaMask' || c.name === 'MetaMask'
  );
  
  // Get injected connector as fallback
  const injectedConnector = connectors.find(c => c.id === 'injected');
  
  // Primary connector to use
  const primaryConnector = metaMaskConnector || injectedConnector;

  // Expected chain
  const expectedChain = IS_TESTNET ? baseSepolia : base;
  const isWrongNetwork = isConnected && chainId !== expectedChain.id;

  // One-click connect
  const handleQuickConnect = () => {
    if (primaryConnector) {
      connect({ connector: primaryConnector });
    }
  };

  // Copy address
  const handleCopy = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Format balance
  const formatBalance = (bal: typeof balance) => {
    if (!bal) return '0.00';
    const value = parseFloat(bal.formatted);
    if (value < 0.0001) return '< 0.0001';
    return value.toFixed(4);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (isOpen && !(e.target as HTMLElement).closest('.wallet-dropdown')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [isOpen]);

  // Loading state
  if (isConnecting || isPending || isReconnecting) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800/80 rounded-xl border border-zinc-700">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <RefreshCw size={18} className="text-cyan-400" />
        </motion.div>
        <span className="text-sm text-zinc-300">Connecting...</span>
      </div>
    );
  }

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-8 py-4 text-lg'
  };

  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 24
  };

  // Not connected - show one-click connect
  if (!isConnected) {
    return (
      <div className="flex items-center gap-2">
        {/* Primary one-click button */}
        <motion.button
          onClick={handleQuickConnect}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`flex items-center gap-2 ${sizeClasses[size]} bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-cyan-500/25 transition-shadow`}
        >
          <Zap size={iconSizes[size]} />
          <span>Connect</span>
        </motion.button>
      </div>
    );
  }

  // Connected - show wallet info with dropdown
  return (
    <div className="relative wallet-dropdown">
      {/* Wrong network warning */}
      {isWrongNetwork && (
        <motion.button
          onClick={() => switchChain({ chainId: expectedChain.id })}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-12 right-0 flex items-center gap-2 px-3 py-1.5 bg-orange-500/20 text-orange-400 text-xs rounded-lg border border-orange-500/30 hover:bg-orange-500/30 transition-colors"
        >
          <span>Switch to {expectedChain.name}</span>
        </motion.button>
      )}

      {/* Main wallet button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.01 }}
        className={`flex items-center gap-3 px-4 py-2.5 bg-zinc-800/80 rounded-xl border transition-colors ${
          isOpen ? 'border-cyan-500/50' : 'border-zinc-700 hover:border-zinc-600'
        }`}
      >
        {/* Balance */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full" />
          <span className="text-sm font-medium text-white">
            {formatBalance(balance)} {balance?.symbol || 'ETH'}
          </span>
        </div>

        {/* Separator */}
        <div className="w-px h-5 bg-zinc-600" />

        {/* Address */}
        <span className="text-sm text-zinc-400 font-mono">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>

        {/* Dropdown arrow */}
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={16} className="text-zinc-500" />
        </motion.div>
      </motion.button>

      {/* Dropdown menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-64 bg-zinc-900 rounded-xl border border-zinc-700 shadow-xl overflow-hidden z-50"
          >
            {/* Wallet info */}
            <div className="p-4 border-b border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-500 uppercase tracking-wide">Connected</span>
                <span className="flex items-center gap-1 text-xs text-green-400">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  {IS_TESTNET ? 'Base Sepolia' : 'Base'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
                  <Wallet size={16} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-mono text-white">
                    {address?.slice(0, 10)}...{address?.slice(-8)}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {formatBalance(balance)} {balance?.symbol}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-2">
              <button
                onClick={handleCopy}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                <span>{copied ? 'Copied!' : 'Copy Address'}</span>
              </button>

              <a
                href={`https://${IS_TESTNET ? 'sepolia.' : ''}basescan.org/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <ExternalLink size={16} />
                <span>View on Explorer</span>
              </a>

              <div className="my-2 border-t border-zinc-800" />

              <button
                onClick={() => {
                  disconnect();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <LogOut size={16} />
                <span>Disconnect</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
