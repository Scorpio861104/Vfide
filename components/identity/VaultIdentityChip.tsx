'use client';

/**
 * VaultIdentityChip — canonical address-rendering component.
 *
 * Composes useVaultIdentity + Identicon + display name + truncated address.
 * Per VFIDE_MERCHANT_PROFILE_SPEC.md §7, the truncated address MUST always
 * be visible alongside any display name — names are hints, addresses are truth.
 *
 * Use this everywhere a vault address would otherwise be rendered as a raw
 * 0x… string. Payment screens, transaction history, governance voter lists,
 * inheritance heir displays, merchant directories — all of them.
 *
 * Sizes:
 *   - sm: 20px identicon, compact text (inline in tables)
 *   - md: 32px identicon, normal text (default — most places)
 *   - lg: 56px identicon, large text + bio preview (merchant detail pages)
 */

import Image from 'next/image';
import { useVaultIdentity } from '@/hooks/useVaultIdentity';
import { Identicon } from './Identicon';

export type VaultIdentityChipSize = 'sm' | 'md' | 'lg';

export interface VaultIdentityChipProps {
  /** Vault address to render. */
  address: string | undefined;
  /** Visual size. Default 'md'. */
  size?: VaultIdentityChipSize;
  /** Optional click handler — typically opens the merchant detail view. */
  onClick?: () => void;
  /** Override the truncated address with a custom suffix (e.g. "you", "merchant"). */
  suffixOverride?: string;
  /** Hide the address suffix (e.g. when the chip is large and address shows elsewhere). NEVER pass this in payment confirmation flows. */
  hideAddress?: boolean;
  /** Wrap the chip in a glassmorphic container — backdrop blur + translucent bg + border. Use on dark surfaces where the chip would otherwise look like floating bare text. */
  glass?: boolean;
  /** Optional extra class on the wrapping container. */
  className?: string;
}

const SIZE_CONFIG = {
  sm: {
    identicon: 20,
    nameClass: 'text-xs font-medium',
    addrClass: 'text-[10px] text-zinc-500',
    gap: 'gap-1.5',
  },
  md: {
    identicon: 32,
    nameClass: 'text-sm font-medium',
    addrClass: 'text-xs text-zinc-500',
    gap: 'gap-2',
  },
  lg: {
    identicon: 56,
    nameClass: 'text-base font-semibold',
    addrClass: 'text-sm text-zinc-500',
    gap: 'gap-3',
  },
} as const;

function truncateAddress(address: string): string {
  if (!address || address.length < 12) return address || '0x…';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function VaultIdentityChip({
  address,
  size = 'md',
  onClick,
  suffixOverride,
  hideAddress = false,
  glass = false,
  className,
}: VaultIdentityChipProps) {
  const { identity, isLoading } = useVaultIdentity(address);
  const cfg = SIZE_CONFIG[size];

  // Glass treatment: backdrop-blur + transparent surface + subtle border.
  // Matches the GlassCard aesthetic for inline elements where a full card
  // would be too heavy. Padding scales with size so the chip stays balanced.
  const glassClass = glass
    ? size === 'sm'
      ? 'rounded-lg bg-white/5 backdrop-blur-md border border-white/10 px-2 py-1'
      : size === 'md'
      ? 'rounded-xl bg-white/5 backdrop-blur-md border border-white/10 px-3 py-1.5'
      : 'rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2'
    : '';

  // Skeleton state — preserve layout while resolving
  if (!address) {
    return (
      <div
        className={`inline-flex items-center ${cfg.gap} ${glassClass} ${className ?? ''}`}
        aria-busy="true"
      >
        <div
          className="rounded-full bg-zinc-200/20 animate-pulse"
          style={{ width: cfg.identicon, height: cfg.identicon }}
        />
        <span className={`${cfg.nameClass} text-zinc-400`}>—</span>
      </div>
    );
  }

  const displayName = identity?.displayName ?? truncateAddress(address);
  const addressSuffix = suffixOverride ?? truncateAddress(address);
  const isDelisted = identity?.status === 'delisted';
  const isSuspended = identity?.status === 'suspended';
  const hasAvatar = Boolean(identity?.avatarUrl) && !isDelisted;

  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      onClick={onClick}
      className={`inline-flex items-center ${cfg.gap} ${glassClass} ${onClick ? 'hover:opacity-80 hover:border-white/20 cursor-pointer transition-colors' : ''} ${className ?? ''}`}
      aria-label={`${displayName} (${truncateAddress(address)})`}
    >
      {/* Avatar or identicon. Avatar wins if profile has one and merchant isn't delisted. */}
      {hasAvatar && identity?.avatarUrl ? (
        // Avatar URL comes from a profile we validated. We still render
        // through a controlled <Image> so we get Next.js's loading semantics.
        // For SVG/IPFS we lean on the unoptimized prop since Next can't transform those.
        <Image
          src={identity.avatarUrl}
          alt=""
          width={cfg.identicon}
          height={cfg.identicon}
          className="rounded-full object-cover"
          unoptimized
          // If the image fails to load, we'd want to fall back to identicon.
          // Next/Image doesn't expose a great onError pattern that swaps source,
          // so we rely on the validation step in useVaultIdentity to have
          // already rejected obviously bad URLs. Failed loads will show as broken
          // image icons, which the moderation queue + report flow will catch.
        />
      ) : (
        <Identicon address={address} size={cfg.identicon} className="rounded-full" />
      )}

      {/* Name + address column */}
      <span className="flex flex-col text-left leading-tight">
        <span className={`${cfg.nameClass} ${isDelisted ? 'text-red-600' : isSuspended ? 'text-amber-600' : 'text-zinc-900 dark:text-zinc-100'}`}>
          {displayName}
          {isLoading && !identity ? '…' : null}
        </span>
        {!hideAddress && (
          <span className={cfg.addrClass}>{addressSuffix}</span>
        )}
      </span>

      {/* Status pill — only renders for non-individual, non-active merchants */}
      {isSuspended && (
        <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wide font-semibold bg-amber-100 text-amber-800">
          Suspended
        </span>
      )}
      {isDelisted && (
        <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wide font-semibold bg-red-100 text-red-800">
          Delisted
        </span>
      )}
    </Wrapper>
  );
}
