/**
 * Wallet Connection Button
 * 
 * Connect/disconnect wallet with balance display.
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, LogOut, Copy, Check, ExternalLink, TrendingUp } from 'lucide-react';
import { useWallet } from '@/lib/crypto';
import { useAnnounce } from '@/lib/accessibility';

export function WalletButton() {
  const { wallet, connecting, error, connect, disconnect, isConnected } = useWallet();
  const { announce } = useAnnounce();
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleConnect = async () => {
    try {
      await connect();
      announce('Wallet connected', 'polite');
    } catch (err) {
      announce('Failed to connect wallet', 'assertive');
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setShowDetails(false);
    announce('Wallet disconnected', 'polite');
  };

  const copyAddress = () => {
    if (wallet) {
      navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      announce('Address copied', 'polite');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!isConnected) {
    return (
      <button
        onClick={handleConnect}
        disabled={connecting}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {connecting ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <Wallet className="w-4 h-4" />
            <span>Connect Wallet</span>
          </>
        )}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-3 px-4 py-2 bg-[#1A1A1F] border border-[#2A2A2F] hover:border-blue-500/50 rounded-lg transition-colors"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
          <Wallet className="w-4 h-4 text-white" />
        </div>
        <div className="text-left">
          <div className="text-white font-medium text-sm">
            {wallet?.ensName || formatAddress(wallet?.address || '')}
          </div>
          <div className="text-xs text-gray-400 flex items-center gap-1">
            <span>{wallet?.balance} ETH</span>
            <span className="text-gray-600">•</span>
            <span>{wallet?.tokenBalance} VFIDE</span>
          </div>
        </div>
      </button>

      {/* Wallet Details Dropdown */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full right-0 mt-2 w-80 bg-[#1A1A1F] border border-[#2A2A2F] rounded-lg shadow-xl z-50"
          >
            {/* Header */}
            <div className="p-4 border-b border-[#2A2A2F]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400 text-sm">Wallet Address</span>
                <button
                  onClick={copyAddress}
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <div className="font-mono text-white text-sm break-all">
                {wallet?.address}
              </div>
              {wallet?.ensName && (
                <div className="mt-2 text-blue-400 text-sm">{wallet.ensName}</div>
              )}
            </div>

            {/* Balance */}
            <div className="p-4 space-y-3">
              <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-3">
                <div className="text-gray-400 text-xs mb-1">ETH Balance</div>
                <div className="text-white text-2xl font-bold mb-1">
                  {wallet?.balance} ETH
                </div>
                <div className="text-gray-400 text-sm">
                  ≈ ${wallet?.usdValue.toFixed(2)} USD
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-400 text-xs">VFIDE Token</span>
                  <TrendingUp className="w-4 h-4 text-green-400" />
                </div>
                <div className="text-white text-2xl font-bold">
                  {wallet?.tokenBalance}
                </div>
                <div className="text-gray-400 text-sm">Community Points</div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-[#2A2A2F] space-y-2">
              <a
                href={`https://etherscan.io/address/${wallet?.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-[#2A2A2F] hover:bg-[#3A3A3F] text-white rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>View on Etherscan</span>
              </a>

              <button
                onClick={handleDisconnect}
                className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-red-900/20 hover:bg-red-900/30 text-red-400 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Disconnect</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Toast */}
      {error && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-red-900/20 border border-red-900/30 rounded-lg p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
