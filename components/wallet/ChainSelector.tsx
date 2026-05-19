'use client';

/**
 * ChainSelector — compact chain-switching dropdown.
 *
 * Shows the currently connected chain. Clicking opens a dropdown listing
 * all configured chains in the wagmi config. Selecting one triggers
 * `switchChain`. Works on both desktop and mobile.
 *
 * Designed to be overflow-safe on narrow viewports (min-w-[200px],
 * max-w-[calc(100vw-2rem)]) and uses 44px minimum touch targets.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { ChevronDown, CheckCircle2, Loader2 } from 'lucide-react';
import { getChainList } from '@/lib/chains';

// Emoji / short labels per chain ID
const CHAIN_ICONS: Record<number, string> = {
  8453: '🔵',   // Base
  84532: '🔵',  // Base Sepolia
  137: '💜',    // Polygon
  80002: '💜',  // Polygon Amoy
  324: '⚡',    // zkSync Era
  300: '⚡',    // zkSync Sepolia
};

function chainIcon(chainId: number): string {
  return CHAIN_ICONS[chainId] ?? '🔗';
}

export interface ChainSelectorProps {
  /** Extra classes for the trigger button */
  className?: string;
}

export function ChainSelector({ className = '' }: ChainSelectorProps) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build chain list from wagmi-aware config
  const chainList = getChainList();

  // Find the display name for the current chain
  const currentChain = chainList.find(
    (c) => c.mainnet.id === chainId || c.testnet.id === chainId,
  );
  const currentName = currentChain?.name ?? 'Unknown';

  // Close on outside click / touch
  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const handleToggle = useCallback(() => {
    if (!isConnected) return;
    setOpen((prev) => !prev);
  }, [isConnected]);

  const handleSelect = useCallback(
    (targetChainId: number) => {
      setOpen(false);
      if (targetChainId !== chainId) {
        switchChain({ chainId: targetChainId as Parameters<typeof switchChain>[0]['chainId'] });
      }
    },
    [chainId, switchChain],
  );

  if (!isConnected) return null;

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select network"
        className={[
          'inline-flex items-center gap-1.5 min-h-[44px] px-3 py-1.5',
          'rounded-lg text-sm font-medium transition-colors',
          'bg-zinc-800 border border-zinc-700 text-zinc-200',
          'hover:bg-zinc-700 hover:border-zinc-600',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        ].join(' ')}
      >
        {isPending ? (
          <Loader2 size={14} className="animate-spin text-zinc-400" />
        ) : (
          <span aria-hidden>{chainIcon(chainId)}</span>
        )}
        <span className="hidden sm:inline">{currentName}</span>
        <ChevronDown
          size={14}
          className={`text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          aria-label="Select network"
          className={[
            'absolute z-50 mt-1 right-0',
            'min-w-[200px] max-w-[calc(100vw-2rem)]',
            'rounded-xl border border-zinc-700 bg-zinc-900/95 backdrop-blur shadow-xl',
            'py-1 overflow-hidden',
          ].join(' ')}
        >
          {chainList.map((chainCfg) => {
            // Pick the correct network (testnet vs mainnet) for the current environment
            const isTestnet =
              typeof window !== 'undefined' &&
              (window.location.hostname.includes('testnet') ||
                process.env.NEXT_PUBLIC_IS_TESTNET !== 'false');
            const network = isTestnet ? chainCfg.testnet : chainCfg.mainnet;
            const isActive = network.id === chainId;

            return (
              <button
                key={network.id}
                role="option"
                aria-selected={isActive}
                type="button"
                onClick={() => handleSelect(network.id)}
                className={[
                  'w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors',
                  'min-h-[44px] text-left',
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-300'
                    : 'text-zinc-300 hover:bg-zinc-800 hover:text-white',
                ].join(' ')}
              >
                <span className="text-base" aria-hidden>
                  {chainCfg.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{chainCfg.name}</div>
                  <div className="text-xs text-zinc-500 truncate">{network.name}</div>
                </div>
                {isActive && (
                  <CheckCircle2 size={14} className="text-cyan-400 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ChainSelector;
