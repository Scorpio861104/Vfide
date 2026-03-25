'use client';

/**
 * Premium Wallet Connect Component
 * 
 * A beautiful, modern wallet connection UI with:
 * - Glassmorphism design
 * - Smooth micro-animations
 * - ENS/avatar support
 * - Multi-chain indicators
 * - Quick action dropdown
 * - Balance display with token icons
 */

import React, { useState, useRef, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import Image from 'next/image';
import { 
  Wallet, 
  ChevronDown, 
  Copy, 
  Check, 
  LogOut, 
  ExternalLink, 
  Settings, 
  Zap,
  Shield,
  Clock,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  QrCode,
} from 'lucide-react';
import { useBalance, useDisconnect } from 'wagmi';
import { useToast } from '@/components/ui/toast';
import { useENS } from '@/hooks/useENS';
import { formatEther } from 'viem';

// ==================== TYPES ====================

interface WalletConnectProps {
  showBalance?: boolean;
  showChain?: boolean;
  compact?: boolean;
  onSettingsClick?: () => void;
}

// ==================== WALLET AVATAR ====================

function WalletAvatar({ 
  address, 
  ensAvatar, 
  size = 40 
}: { 
  address: string; 
  ensAvatar?: string | null;
  size?: number;
}) {
  const [imageError, setImageError] = useState(false);

  // Generate gradient from address
  const gradientColors = React.useMemo(() => {
    const hash = address.slice(2, 10);
    const hue1 = parseInt(hash.slice(0, 4), 16) % 360;
    const hue2 = (hue1 + 40) % 360;
    return [`hsl(${hue1}, 70%, 50%)`, `hsl(${hue2}, 70%, 40%)`];
  }, [address]);

  if (ensAvatar && !imageError) {
    return (
      <div 
        className="rounded-full overflow-hidden ring-2 ring-white/10"
        style={{ width: size, height: size }}
      >
        <Image
          src={ensAvatar}
          alt="ENS Avatar"
          width={size}
          height={size}
          className="object-cover"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className="rounded-full ring-2 ring-white/10 flex items-center justify-center text-white font-bold"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${gradientColors[0]}, ${gradientColors[1]})`,
        fontSize: size * 0.35,
      }}
    >
      {address.slice(2, 4).toUpperCase()}
    </div>
  );
}

// ==================== CHAIN BADGE ====================

function ChainBadge({ 
  chain, 
  showName = true,
  onClick,
}: { 
  chain: {
    hasIcon?: boolean;
    iconUrl?: string;
    iconBackground?: string;
    name?: string;
    id: number;
  };
  showName?: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="flex items-center gap-1.5 px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-colors text-xs"
    >
      {chain.hasIcon && chain.iconUrl && (
        <div
          className="rounded-full overflow-hidden"
          style={{
            background: chain.iconBackground,
            width: 14,
            height: 14,
          }}
        >
          <Image
            alt={chain.name ?? 'Chain'}
            src={chain.iconUrl}
            width={14}
            height={14}
            unoptimized
          />
        </div>
      )}
      {showName && (
        <span className="text-gray-300 font-medium">{chain.name}</span>
      )}
    </motion.button>
  );
}

// ==================== BALANCE DISPLAY ====================

function BalanceDisplay({ 
  balance, 
  symbol = 'ETH',
  usdValue,
}: { 
  balance?: string;
  symbol?: string;
  usdValue?: string;
}) {
  const displayBalance = balance ? parseFloat(balance).toFixed(4) : '0.0000';
  
  return (
    <div className="flex flex-col items-end">
      <span className="text-white font-bold text-sm">
        {displayBalance} {symbol}
      </span>
      {usdValue && (
        <span className="text-gray-400 text-xs">${usdValue}</span>
      )}
    </div>
  );
}

// ==================== CONNECT BUTTON ====================

function ConnectWalletButton({ 
  onClick, 
  isLoading = false,
}: { 
  onClick: () => void;
  isLoading?: boolean;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const gradientX = useTransform(mouseX, [0, 1], ['0%', '100%']);
  const gradientY = useTransform(mouseY, [0, 1], ['0%', '100%']);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  };

  return (
    <motion.button
      ref={buttonRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      disabled={isLoading}
      data-wallet-connect
      data-onboarding="wallet-button"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="relative group px-6 py-3 rounded-2xl font-bold text-white overflow-hidden transition-shadow hover:shadow-xl hover:shadow-cyan-500/25"
      style={{
        background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)',
      }}
    >
      {/* Animated shine effect */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          background: `radial-gradient(circle at ${gradientX} ${gradientY}, rgba(255,255,255,0.3) 0%, transparent 50%)`,
        }}
      />
      
      {/* Button content */}
      <span className="relative flex items-center justify-center gap-2">
        {isLoading ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <RefreshCw className="w-5 h-5" />
            </motion.div>
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <Wallet className="w-5 h-5" />
            <span>Connect Wallet</span>
            <Sparkles className="w-4 h-4 opacity-70" />
          </>
        )}
      </span>
    </motion.button>
  );
}

// ==================== CONNECTED WALLET DISPLAY ====================

function ConnectedWallet({
  account,
  chain,
  openAccountModal,
  openChainModal,
  showBalance = true,
  showChain = true,
  onSettingsClick,
}: {
  account: {
    address: string;
    displayName: string;
    displayBalance?: string;
    balanceFormatted?: string;
    balanceSymbol?: string;
  };
  chain: {
    hasIcon?: boolean;
    iconUrl?: string;
    iconBackground?: string;
    name?: string;
    id: number;
    unsupported?: boolean;
  };
  openAccountModal: () => void;
  openChainModal: () => void;
  showBalance?: boolean;
  showChain?: boolean;
  onSettingsClick?: () => void;
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { disconnect } = useDisconnect();
  const { showToast } = useToast();
  
  // ENS data
  const { ensName, ensAvatar } = useENS(account.address);
  
  // Get balance
  const { data: balance } = useBalance({ 
    address: account.address as `0x${string}`,
  });

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const copyAddress = async () => {
    try {
      // Try modern clipboard API first
      await navigator.clipboard.writeText(account.address);
      setCopied(true);
      showToast('Address copied!', 'success', 2000);
      setTimeout(() => setCopied(false), 2000);
    } catch (_err) {
      // Fallback for non-HTTPS contexts or if clipboard API fails
      try {
        const textArea = document.createElement('textarea');
        textArea.value = account.address;
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
          showToast('Address copied!', 'success', 2000);
          setTimeout(() => setCopied(false), 2000);
        } else {
          throw new Error('Copy command failed');
        }
      } catch {
        showToast('Failed to copy address. Please copy manually.', 'error', 3000);
      }
    }
  };

  const displayName = ensName || account.displayName;
  const formattedBalance = balance ? formatEther(balance.value) : account.displayBalance;

  // Wrong network state
  if (chain.unsupported) {
    return (
      <motion.button
        onClick={openChainModal}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-2 px-4 py-2.5 bg-red-500/20 border border-red-500/50 text-red-400 rounded-xl font-medium hover:bg-red-500/30 transition-all"
      >
        <AlertTriangle className="w-4 h-4" />
        <span>Wrong Network</span>
        <ChevronDown className="w-4 h-4" />
      </motion.button>
    );
  }

  return (
    <div ref={dropdownRef} className="relative">
      {/* Main wallet button */}
      <motion.button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="flex items-center gap-3 px-3 py-2 bg-gradient-to-r from-zinc-800/80 to-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl hover:border-cyan-500/30 transition-all group"
      >
        {/* Avatar */}
        <WalletAvatar 
          address={account.address} 
          ensAvatar={ensAvatar}
          size={36}
        />
        
        {/* Info */}
        <div className="flex flex-col items-start">
          <span className="text-white font-semibold text-sm flex items-center gap-1">
            {displayName}
            {ensName && (
              <Shield className="w-3 h-3 text-cyan-400" />
            )}
          </span>
          {showBalance && formattedBalance && (
            <span className="text-gray-400 text-xs">
              {parseFloat(formattedBalance).toFixed(4)} {balance?.symbol || 'ETH'}
            </span>
          )}
        </div>

        {/* Chain indicator */}
        {showChain && (
          <div className="hidden sm:block">
            <ChainBadge chain={chain} showName={false} />
          </div>
        )}

        {/* Dropdown arrow */}
        <motion.div
          animate={{ rotate: isDropdownOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </motion.div>
      </motion.button>

      {/* Dropdown menu */}
      <AnimatePresence>
        {isDropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-72 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
          >
            {/* Account header */}
            <div className="p-4 border-b border-white/5">
              <div className="flex items-center gap-3 mb-3">
                <WalletAvatar 
                  address={account.address} 
                  ensAvatar={ensAvatar}
                  size={48}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-white font-semibold truncate flex items-center gap-1">
                    {displayName}
                    {ensName && <Shield className="w-3.5 h-3.5 text-cyan-400" />}
                  </div>
                  <div className="flex items-center gap-1 text-gray-400 text-xs">
                    <span className="truncate">{account.address.slice(0, 8)}...{account.address.slice(-6)}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyAddress();
                      }}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                    >
                      {copied ? (
                        <Check className="w-3 h-3 text-green-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Balance */}
              {formattedBalance && (
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <span className="text-gray-400 text-sm">Balance</span>
                  <BalanceDisplay 
                    balance={formattedBalance}
                    symbol={balance?.symbol || 'ETH'}
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-2">
              {/* Chain selector */}
              <button
                onClick={() => {
                  openChainModal();
                  setIsDropdownOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
              >
                {chain.hasIcon && chain.iconUrl ? (
                  <div
                    className="w-5 h-5 rounded-full overflow-hidden"
                    style={{ background: chain.iconBackground }}
                  >
                    <Image
                      alt={chain.name ?? 'Chain'}
                      src={chain.iconUrl}
                      width={20}
                      height={20}
                      unoptimized
                    />
                  </div>
                ) : (
                  <Zap className="w-5 h-5" />
                )}
                <span className="flex-1 text-left text-sm">{chain.name}</span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>

              {/* View on explorer */}
              <a
                href={`https://basescan.org/address/${account.address}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsDropdownOpen(false)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
              >
                <ExternalLink className="w-5 h-5" />
                <span className="flex-1 text-left text-sm">View on Explorer</span>
              </a>

              {/* QR Code */}
              <button
                onClick={() => {
                  openAccountModal();
                  setIsDropdownOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
              >
                <QrCode className="w-5 h-5" />
                <span className="flex-1 text-left text-sm">Show QR Code</span>
              </button>

              {/* Settings */}
              {onSettingsClick && (
                <button
                  onClick={() => {
                    onSettingsClick();
                    setIsDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                >
                  <Settings className="w-5 h-5" />
                  <span className="flex-1 text-left text-sm">Wallet Settings</span>
                </button>
              )}

              <div className="my-2 border-t border-white/5" />

              {/* Disconnect */}
              <button
                onClick={() => {
                  disconnect();
                  setIsDropdownOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="flex-1 text-left text-sm">Disconnect</span>
              </button>
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-white/5">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                <span>Connected with {chain.name}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

export function PremiumWalletConnect({
  showBalance = true,
  showChain = true,
  compact = false,
  onSettingsClick,
}: WalletConnectProps) {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted;
        const connected = ready && account && chain;
        const isLoading = authenticationStatus === 'loading';

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
            {!connected ? (
              <ConnectWalletButton 
                onClick={openConnectModal}
                isLoading={isLoading}
              />
            ) : (
              <ConnectedWallet
                account={account}
                chain={chain}
                openAccountModal={openAccountModal}
                openChainModal={openChainModal}
                showBalance={showBalance && !compact}
                showChain={showChain}
                onSettingsClick={onSettingsClick}
              />
            )}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

// ==================== COMPACT VERSION ====================

export function PremiumWalletConnectCompact() {
  return <PremiumWalletConnect compact showBalance={false} />;
}

export default PremiumWalletConnect;
