"use client";

import { useState } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { IS_TESTNET, FAUCET_URLS } from '@/lib/testnet';
import { Droplets, ExternalLink, Copy, Check } from 'lucide-react';

/**
 * Faucet button for testnet - shows "Get ETH" when balance is low
 * Opens a dropdown with faucet links and address copy
 */
export function FaucetButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });

  // Only show on testnet when connected
  if (!IS_TESTNET || !isConnected) return null;

  const ethBalance = balance ? parseFloat(balance.formatted) : 0;
  const isLowBalance = ethBalance < 0.01;

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          isLowBalance
            ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 animate-pulse'
            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
        }`}
      >
        <Droplets size={14} />
        <span>{isLowBalance ? 'Get ETH' : 'Faucet'}</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-72 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="p-4 border-b border-zinc-800">
              <div className="flex justify-between items-center mb-2">
                <span className="text-zinc-400 text-xs">Your Address</span>
                <button
                  onClick={copyAddress}
                  className="text-zinc-500 hover:text-zinc-300"
                >
                  {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
              </div>
              <div className="font-mono text-sm text-zinc-300 truncate">
                {address}
              </div>
              <div className="mt-2 text-xs">
                <span className="text-zinc-500">Balance: </span>
                <span className={ethBalance < 0.01 ? 'text-amber-400' : 'text-green-400'}>
                  {ethBalance.toFixed(4)} ETH
                </span>
              </div>
            </div>

            <div className="p-2">
              <p className="text-xs text-zinc-500 px-2 py-1">Get free test ETH:</p>
              
              <a
                href={FAUCET_URLS.coinbase}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-3 py-2.5 hover:bg-zinc-800 rounded-lg transition-colors group"
              >
                <span className="text-zinc-200 text-sm font-medium">Coinbase Faucet</span>
                <ExternalLink size={14} className="text-zinc-500 group-hover:text-zinc-300" />
              </a>
              
              <a
                href={FAUCET_URLS.alchemy}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-3 py-2.5 hover:bg-zinc-800 rounded-lg transition-colors group"
              >
                <span className="text-zinc-200 text-sm font-medium">Alchemy Faucet</span>
                <ExternalLink size={14} className="text-zinc-500 group-hover:text-zinc-300" />
              </a>
              
              <a
                href={FAUCET_URLS.quicknode}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-3 py-2.5 hover:bg-zinc-800 rounded-lg transition-colors group"
              >
                <span className="text-zinc-200 text-sm font-medium">QuickNode Faucet</span>
                <ExternalLink size={14} className="text-zinc-500 group-hover:text-zinc-300" />
              </a>
            </div>

            <div className="px-4 py-3 bg-zinc-800/50 border-t border-zinc-800">
              <p className="text-xs text-zinc-500">
                Tokens arrive in ~30 seconds after faucet claim.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
