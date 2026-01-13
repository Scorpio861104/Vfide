"use client";

import { useCopyToClipboard } from '@/lib/hooks/useCopyToClipboard';
import { FAUCET_URLS } from '@/lib/testnet';
import { isTestnetChainId } from '@/lib/chains';
import { safeParseFloat } from '@/lib/validation';
import { Check, Copy, Droplets, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { useAccount, useBalance, useChainId } from 'wagmi';

/**
 * Faucet button for testnet - shows "Get ETH" when balance is low
 * Opens a dropdown with faucet links and address copy
 */
export function FaucetButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { copied, copy } = useCopyToClipboard();
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const chainId = useChainId();

  // Only show on testnet chains when connected
  if (!isConnected || !chainId || !isTestnetChainId(chainId)) return null;

  const ethBalance = balance ? safeParseFloat(balance.formatted, 0) : 0;
  const isLowBalance = ethBalance < 0.01;

  const copyAddress = () => address && copy(address);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
          isLowBalance
            ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 animate-pulse'
            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
        }`}
      >
        <Droplets size={14} />
        <span className="hidden xs:inline">{isLowBalance ? 'Get ETH' : 'Faucet'}</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          
          {/* Dropdown */}
          <div className="fixed sm:absolute right-3 sm:right-0 top-14 sm:top-full mt-2 w-[calc(100vw-1.5rem)] sm:w-72 max-w-md bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden">
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
