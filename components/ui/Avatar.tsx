'use client';

/**
 * Avatar — VFIDE's canonical user/merchant avatar primitive.
 *
 * Tier 3 Round 10 (2026-05-17). Built to consolidate ~25 hand-copied
 * cyan-to-violet gradient circles containing emoji or first-letters that
 * passed for avatars across PostCard, CreatePostCard, TrendingSidebar,
 * UserProfile, GlobalUserSearch, FriendRequestsPanel, MessagingCenter,
 * MarketStory, ProductReels, and several other social surfaces.
 *
 * Hierarchy (first match wins):
 *   1. `src` — explicit image URL (uploaded profile picture)
 *   2. `address` — render <Identicon> (deterministic jazzicon)
 *   3. `name` — render first character in a tinted circle
 *   4. Nothing — render a neutral User icon
 *
 * Why this hierarchy: an uploaded image is the most personal; the identicon
 * is the most identifying (same address = same visual fingerprint, builds
 * recognition over time); the letter is a polite fallback when neither
 * exists; the icon is the last-resort neutral placeholder.
 *
 * Sizes match the social/messaging needs in the codebase: xs (avatar
 * stack), sm (chat list), md (post header), lg (profile hero), xl (modal).
 */

import Image from 'next/image';
import { User } from 'lucide-react';
import { Identicon } from '@/components/identity/Identicon';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface AvatarProps {
  /** Explicit image source. Highest priority. */
  src?: string | null;
  /** Vault address. Renders Identicon (jazzicon) if provided and no src. */
  address?: string | null;
  /** Display name. First letter used as fallback if no src or address. */
  name?: string | null;
  /** Visual size. Default 'md' (40px). */
  size?: AvatarSize;
  /** Optional extra class for the outer wrapper. */
  className?: string;
  /** aria-label override. Default uses the name or "Avatar". */
  ariaLabel?: string;
}

const SIZE = {
  xs:   { px: 24, classes: 'w-6 h-6 text-[10px]' },
  sm:   { px: 32, classes: 'w-8 h-8 text-xs' },
  md:   { px: 40, classes: 'w-10 h-10 text-sm' },
  lg:   { px: 48, classes: 'w-12 h-12 text-base' },
  xl:   { px: 64, classes: 'w-16 h-16 text-xl' },
  '2xl': { px: 96, classes: 'w-24 h-24 text-3xl' },
} as const;

export function Avatar({
  src,
  address,
  name,
  size = 'md',
  className = '',
  ariaLabel,
}: AvatarProps) {
  const s = SIZE[size];
  const label = ariaLabel ?? (name ? `${name} avatar` : 'Avatar');
  const baseRound = `rounded-full overflow-hidden flex-shrink-0 ${s.classes} ${className}`.trim();

  // Treat src as a URL only if it looks like one. Legacy data sometimes stores
  // an emoji character in the same field — passing that to next/image throws.
  const isUrlSrc =
    typeof src === 'string' &&
    (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/'));

  // 1. Uploaded image (real URL only)
  if (isUrlSrc && src) {
    return (
      <div className={baseRound}>
        <Image
          src={src}
          alt={label}
          width={s.px}
          height={s.px}
          className="object-cover w-full h-full"
        />
      </div>
    );
  }

  // 2. Deterministic identicon from address
  if (address) {
    return (
      <Identicon
        address={address}
        size={s.px}
        className={baseRound}
        ariaLabel={label}
      />
    );
  }

  // 3. First-letter fallback
  if (name && name.length > 0) {
    return (
      <div
        className={`${baseRound} bg-gradient-to-br from-accent/30 to-violet-500/30 border border-white/10 flex items-center justify-center font-bold text-accent`}
        role="img"
        aria-label={label}
      >
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }

  // 4. Neutral icon — last resort
  return (
    <div
      className={`${baseRound} bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-500`}
      role="img"
      aria-label={label}
    >
      <User size={Math.max(12, s.px / 2.5)} />
    </div>
  );
}
