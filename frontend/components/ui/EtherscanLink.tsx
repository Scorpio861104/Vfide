"use client";

import { ExternalLink, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useChainId } from 'wagmi';

const EXPLORER_URLS: Record<number, string> = {
  1: 'https://etherscan.io',
  11155111: 'https://sepolia.etherscan.io',
  8453: 'https://basescan.org',
  84532: 'https://sepolia.basescan.org',
  324: 'https://explorer.zksync.io',
  300: 'https://sepolia.explorer.zksync.io',
  42161: 'https://arbiscan.io',
  137: 'https://polygonscan.com',
  80002: 'https://amoy.polygonscan.com',
};

interface EtherscanLinkProps {
  address?: string;
  txHash?: string;
  type?: 'address' | 'tx' | 'token';
  label?: string;
  showCopy?: boolean;
  className?: string;
}

/**
 * Clickable Etherscan link with copy functionality
 */
export function EtherscanLink({
  address,
  txHash,
  type = 'address',
  label,
  showCopy = true,
  className = '',
}: EtherscanLinkProps) {
  const chainId = useChainId();
  const [copied, setCopied] = useState(false);

  const explorerUrl = EXPLORER_URLS[chainId] || EXPLORER_URLS[11155111];
  const value = txHash || address;

  if (!value) return null;

  const path = type === 'tx' ? 'tx' : type === 'token' ? 'token' : 'address';
  const href = `${explorerUrl}/${path}/${value}`;

  const displayValue = label || `${value.slice(0, 6)}...${value.slice(-4)}`;

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[#00F0FF] hover:text-[#00D4FF] transition-colors font-mono text-sm"
      >
        {displayValue}
        <ExternalLink size={12} className="opacity-60" />
      </a>
      {showCopy && (
        <button
          onClick={handleCopy}
          className="p-1 hover:bg-[#2A2A2F] rounded transition-colors"
          title="Copy to clipboard"
        >
          {copied ? (
            <Check size={12} className="text-green-400" />
          ) : (
            <Copy size={12} className="text-[#A0A0A5] hover:text-[#F5F3E8]" />
          )}
        </button>
      )}
    </span>
  );
}

/**
 * Contract address display with verification badge idea
 */
export function ContractLink({
  address,
  name,
  verified = false,
  className = '',
}: {
  address: string;
  name: string;
  verified?: boolean;
  className?: string;
}) {
  // chainId is used implicitly by EtherscanLink component
  useChainId();

  return (
    <div className={`flex items-center justify-between p-3 bg-[#2A2A2F] rounded-lg ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-[#F5F3E8] font-medium">{name}</span>
        {verified && (
          <span className="px-1.5 py-0.5 bg-green-600/20 text-green-400 text-xs rounded">
            ✓ Verified
          </span>
        )}
      </div>
      <EtherscanLink address={address} showCopy />
    </div>
  );
}

/**
 * Get explorer URL for a chain
 */
export function getExplorerUrl(chainId: number): string {
  return EXPLORER_URLS[chainId] || EXPLORER_URLS[11155111];
}

/**
 * Get full link to address/tx on explorer
 */
export function getExplorerLink(
  chainId: number,
  value: string,
  type: 'address' | 'tx' | 'token' = 'address'
): string {
  const explorerUrl = getExplorerUrl(chainId);
  const path = type === 'tx' ? 'tx' : type === 'token' ? 'token' : 'address';
  return `${explorerUrl}/${path}/${value}`;
}
