'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount, useConnect, useDisconnect, useBalance, useChainId, useSwitchChain } from 'wagmi';
import { Wallet, ChevronDown, Check, Copy, ExternalLink, LogOut, RefreshCw, Zap, Keyboard, Clock, WifiOff, QrCode } from 'lucide-react';
import { baseSepolia, base } from 'wagmi/chains';
import { IS_TESTNET } from '@/lib/chains';
import Link from 'next/link';
import { WalletQRCode } from './WalletQRCode';
import { PendingTransactionsList, usePendingTransactions } from './PendingTransactions';
import { GasIndicator } from './GasPriceAlert';
import { useTransactionSounds } from '@/hooks/useTransactionSounds';
import { useWalletPersistence } from '@/hooks/useWalletPersistence';
import { isMobileDevice } from '@/lib/mobileDetection';

interface QuickWalletConnectProps {
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Streamlined One-Click Wallet Connection (Mobile-First)
 * 
 * Key Features:
 * 1. Mobile-first: WalletConnect prioritized on mobile devices
 * 2. Desktop-optimized: Browser extensions prioritized on desktop
 * 3. One-click connection with smart connector selection
 * 4. Inline wallet dropdown (no separate modal)
 * 5. Quick balance display and network switching
 * 6. Minimal UI, maximum speed
 * 
 * Mobile UX:
 * - Detects mobile devices automatically
 * - Uses WalletConnect for seamless in-browser experience
 * - No app switching required
 * - Works with Trust Wallet, MetaMask app, Rainbow, etc.
 */
export function QuickWalletConnect({ size = 'md' }: QuickWalletConnectProps) {
  const { address, isConnected, isConnecting, isReconnecting } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { data: balance } = useBalance({ address });
  const { pendingCount } = usePendingTransactions();
  const { playConnect, playClick } = useTransactionSounds();
  const { isReconnecting: isAutoReconnecting, minutesUntilDisconnect } = useWalletPersistence();
  
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showShortcutHint, setShowShortcutHint] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [activeTab, setActiveTab] = useState<'menu' | 'transactions'>('menu');

  // Mobile detection (SSR-safe, memoized)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  // Get WalletConnect connector (prioritize for mobile)
  const walletConnectConnector = connectors.find(c => 
    c.id === 'walletConnect' || c.name === 'WalletConnect'
  );

  // Get MetaMask connector for desktop
  const metaMaskConnector = connectors.find(c => 
    c.id === 'io.metamask' || c.id === 'metaMask' || c.name === 'MetaMask'
  );
  
  // Get injected connector as fallback
  const injectedConnector = connectors.find(c => c.id === 'injected');
  
  // Primary connector to use - WalletConnect on mobile, MetaMask on desktop
  const primaryConnector = isMobile 
    ? (walletConnectConnector || metaMaskConnector || injectedConnector)
    : (metaMaskConnector || injectedConnector);

  // Expected chain
  const expectedChain = IS_TESTNET ? baseSepolia : base;
  const isWrongNetwork = isConnected && chainId !== expectedChain.id;

  // One-click connect
  const handleQuickConnect = useCallback(() => {
    if (primaryConnector) {
      connect({ connector: primaryConnector });
      playConnect();
    }
  }, [primaryConnector, connect, playConnect]);

  // Keyboard shortcut (Cmd/Ctrl + W to connect/disconnect)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + W to toggle wallet
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        if (isConnected) {
          setIsOpen(prev => !prev);
        } else {
          handleQuickConnect();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isConnected, handleQuickConnect]);

  // Network status detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Copy address
  const handleCopy = async () => {
    if (!address) return;
    
    try {
      // Try modern clipboard API first
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_err) {
      // Fallback for non-HTTPS contexts or if clipboard API fails
      try {
        const textArea = document.createElement('textarea');
        textArea.value = address;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        textArea.remove();
        
        if (successful) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } else {
          throw new Error('Copy command failed');
        }
      } catch {
        // Silent fail for copy - user can still manually copy
        console.warn('Failed to copy address');
      }
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

  // Loading state (includes both auto-reconnecting and manual reconnecting)
  if (isConnecting || isPending || isReconnecting || isAutoReconnecting) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800/80 rounded-xl border border-zinc-700">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <RefreshCw size={18} className="text-cyan-400" />
        </motion.div>
        <span className="text-sm text-zinc-300">
          {isAutoReconnecting ? 'Auto-reconnecting...' : 'Connecting...'}
        </span>
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

  // Offline state
  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 rounded-xl border border-red-500/30">
        <WifiOff size={18} className="text-red-400" />
        <span className="text-sm text-red-400">Offline</span>
      </div>
    );
  }

  // Not connected - show one-click connect
  if (!isConnected) {
    return (
      <div 
        className="relative flex items-center gap-2"
        onMouseEnter={() => setShowShortcutHint(true)}
        onMouseLeave={() => setShowShortcutHint(false)}
      >
        {/* Keyboard shortcut hint */}
        <AnimatePresence>
          {showShortcutHint && size !== 'lg' && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 text-xs text-zinc-500 whitespace-nowrap"
            >
              <Keyboard size={12} />
              <span>⌘⇧W</span>
            </motion.div>
          )}
        </AnimatePresence>

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
    <>
      {/* Inactivity Warning Banner */}
      <AnimatePresence>
        {minutesUntilDisconnect !== null && minutesUntilDisconnect > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute -top-14 right-0 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-lg shadow-lg backdrop-blur-sm whitespace-nowrap z-50"
            role="alert"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="flex items-center gap-2 text-xs font-medium">
              <Clock size={14} className="animate-pulse" />
              <span>Auto-disconnect in {minutesUntilDisconnect}m</span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      
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

        {/* Pending transaction badge */}
        {pendingCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center"
          >
            <span className="text-[10px] font-bold text-black">{pendingCount}</span>
          </motion.div>
        )}
      </motion.button>

      {/* QR Code Modal */}
      <WalletQRCode isOpen={showQR} onClose={() => setShowQR(false)} />

      {/* Dropdown menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-72 bg-zinc-900 rounded-xl border border-zinc-700 shadow-xl overflow-hidden z-50"
          >
            {/* Wallet info header */}
            <div className="p-4 border-b border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 uppercase tracking-wide">Connected</span>
                  <GasIndicator />
                </div>
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

            {/* Tab switcher */}
            <div className="flex border-b border-zinc-800">
              <button
                onClick={() => { setActiveTab('menu'); playClick(); }}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  activeTab === 'menu' 
                    ? 'text-cyan-400 border-b-2 border-cyan-400' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Menu
              </button>
              <button
                onClick={() => { setActiveTab('transactions'); playClick(); }}
                className={`flex-1 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                  activeTab === 'transactions' 
                    ? 'text-cyan-400 border-b-2 border-cyan-400' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Transactions
                {pendingCount > 0 && (
                  <span className="w-4 h-4 bg-yellow-500 rounded-full text-[10px] text-black font-bold flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </button>
            </div>

            {/* Tab content */}
            {activeTab === 'menu' ? (
              <div className="p-2">
                <button
                  onClick={() => { handleCopy(); playClick(); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                <span>{copied ? 'Copied!' : 'Copy Address'}</span>
              </button>

              <button
                onClick={() => { setShowQR(true); setIsOpen(false); playClick(); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <QrCode size={16} />
                <span>Show QR Code</span>
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

              <Link
                href="/crypto"
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <Clock size={16} />
                <span>Transaction History</span>
              </Link>

              <Link
                href="/profile"
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <Keyboard size={16} />
                <span>Wallet Settings</span>
              </Link>

              <div className="my-2 border-t border-zinc-800" />

              {/* Keyboard shortcut hint */}
              <div className="px-3 py-2 text-xs text-zinc-600 flex items-center justify-between">
                <span>Toggle menu</span>
                <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-500">⌘⇧W</kbd>
              </div>

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
            ) : (
              /* Transactions Tab */
              <PendingTransactionsList compact maxItems={5} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </>
  );
}
