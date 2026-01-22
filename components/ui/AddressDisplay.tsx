'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, ExternalLink, User } from 'lucide-react';
import { useENS, useENSProfile, formatAddressWithENS, type ENSProfile } from '@/hooks/useENS';
import Image from 'next/image';

// ==================== TYPES ====================

interface AddressDisplayProps {
  address: string;
  showAvatar?: boolean;
  showCopy?: boolean;
  showExternalLink?: boolean;
  showProfile?: boolean;
  truncate?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// ==================== UTILITIES ====================

function getExplorerUrl(address: string, chainId: number = 1): string {
  const explorers: Record<number, string> = {
    1: 'https://etherscan.io',
    8453: 'https://basescan.org',
    84532: 'https://sepolia.basescan.org',
    10: 'https://optimistic.etherscan.io',
    42161: 'https://arbiscan.io',
    137: 'https://polygonscan.com',
  };

  const explorer = explorers[chainId] || 'https://etherscan.io';
  return `${explorer}/address/${address}`;
}

// ==================== SUB-COMPONENTS ====================

function AvatarFallback({ name, size }: { name?: string | null; size: number }) {
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  
  return (
    <div
      className="flex items-center justify-center bg-zinc-800 text-gray-400 font-bold rounded-full"
      style={{ width: size, height: size }}
    >
      {initial}
    </div>
  );
}

function ENSAvatar({
  avatar,
  name,
  size,
}: {
  avatar: string | null;
  name: string | null;
  size: number;
}) {
  const [error, setError] = useState(false);

  if (!avatar || error) {
    return <AvatarFallback name={name} size={size} />;
  }

  return (
    <Image
      src={avatar}
      alt={name || 'Avatar'}
      width={size}
      height={size}
      className="rounded-full object-cover"
      onError={() => setError(true)}
    />
  );
}

function ProfilePopover({ profile }: { profile: ENSProfile }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 5, scale: 0.95 }}
      className="absolute z-50 top-full left-0 mt-2 p-4 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl min-w-64"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <ENSAvatar avatar={profile.avatar} name={profile.name} size={48} />
        <div>
          {profile.name && (
            <div className="text-white font-bold">{profile.name}</div>
          )}
          <div className="text-gray-400 text-sm font-mono">
            {profile.address.slice(0, 6)}...{profile.address.slice(-4)}
          </div>
        </div>
      </div>

      {/* Description */}
      {profile.description && (
        <p className="text-gray-300 text-sm mb-3">{profile.description}</p>
      )}

      {/* Links */}
      <div className="flex flex-wrap gap-2">
        {profile.twitter && (
          <a
            href={`https://twitter.com/${profile.twitter}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-lg hover:bg-blue-500/30 transition-colors"
          >
            @{profile.twitter}
          </a>
        )}
        {profile.github && (
          <a
            href={`https://github.com/${profile.github}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2 py-1 bg-gray-500/20 text-gray-300 text-xs rounded-lg hover:bg-gray-500/30 transition-colors"
          >
            {profile.github}
          </a>
        )}
        {profile.url && (
          <a
            href={profile.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-lg hover:bg-green-500/30 transition-colors flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            Website
          </a>
        )}
      </div>
    </motion.div>
  );
}

// ==================== MAIN COMPONENT ====================

export function AddressDisplay({
  address,
  showAvatar = true,
  showCopy = true,
  showExternalLink = true,
  showProfile = false,
  truncate = true,
  size = 'md',
  className = '',
}: AddressDisplayProps) {
  const { ensName, ensAvatar, isLoading } = useENS(address);
  const { profile } = useENSProfile(showProfile ? address : undefined);
  const [copied, setCopied] = useState(false);
  const [showPopover, setShowPopover] = useState(false);

  const sizeConfig = {
    sm: { avatar: 20, text: 'text-xs', gap: 'gap-1.5' },
    md: { avatar: 24, text: 'text-sm', gap: 'gap-2' },
    lg: { avatar: 32, text: 'text-base', gap: 'gap-3' },
  };

  const { avatar: avatarSize, text: textSize, gap } = sizeConfig[size];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const displayText = formatAddressWithENS(address, ensName, { truncate });

  return (
    <div
      className={`relative inline-flex items-center ${gap} ${className}`}
      onMouseEnter={() => showProfile && setShowPopover(true)}
      onMouseLeave={() => showProfile && setShowPopover(false)}
    >
      {/* Avatar */}
      {showAvatar && (
        <div className="shrink-0">
          {isLoading ? (
            <div
              className="rounded-full bg-zinc-800 animate-pulse"
              style={{ width: avatarSize, height: avatarSize }}
            />
          ) : ensAvatar ? (
            <ENSAvatar avatar={ensAvatar} name={ensName} size={avatarSize} />
          ) : (
            <div
              className="rounded-full bg-zinc-800 flex items-center justify-center"
              style={{ width: avatarSize, height: avatarSize }}
            >
              <User className="w-3 h-3 text-gray-500" />
            </div>
          )}
        </div>
      )}

      {/* Address/Name */}
      <span className={`font-mono ${textSize} text-white`}>
        {isLoading ? (
          <span className="animate-pulse bg-zinc-800 rounded px-4">&nbsp;&nbsp;&nbsp;&nbsp;</span>
        ) : (
          displayText
        )}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Copy Button */}
        {showCopy && (
          <button
            onClick={handleCopy}
            className="p-1 hover:bg-zinc-800 rounded transition-colors text-gray-400 hover:text-white"
            title="Copy address"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        )}

        {/* External Link */}
        {showExternalLink && (
          <a
            href={getExplorerUrl(address)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 hover:bg-zinc-800 rounded transition-colors text-gray-400 hover:text-white"
            title="View on explorer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* Profile Popover */}
      <AnimatePresence>
        {showProfile && showPopover && profile && profile.name && (
          <ProfilePopover profile={profile} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ==================== SIMPLE VARIANT ====================

/**
 * Simple inline address with ENS resolution
 */
export function InlineAddress({
  address,
  className = '',
}: {
  address: string;
  className?: string;
}) {
  const { ensName, isLoading } = useENS(address);
  
  if (isLoading) {
    return (
      <span className={`font-mono ${className}`}>
        {address.slice(0, 6)}...{address.slice(-4)}
      </span>
    );
  }

  return (
    <span className={`font-mono ${className}`} title={address}>
      {ensName || `${address.slice(0, 6)}...${address.slice(-4)}`}
    </span>
  );
}

export default AddressDisplay;
