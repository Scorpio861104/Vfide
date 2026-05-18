'use client';

/**
 * Identicon — deterministic visual identity for vault addresses.
 *
 * Per VFIDE_MERCHANT_PROFILE_SPEC.md §7: every place the UI shows a vault
 * address, it must render either the merchant's avatar (if profile exists)
 * or this identicon (otherwise). This is the always-non-empty fallback.
 *
 * Uses @metamask/jazzicon — visually pleasant, widely recognized in crypto.
 * The library returns a raw DOM element built from an address-derived seed,
 * so we mount it via a ref + useEffect instead of returning JSX directly.
 *
 * Determinism guarantee: identical address + identical size always produces
 * identical pixels. Users build visual memory for their vaults over time.
 */

import { useEffect, useRef, useMemo } from 'react';
import jazzicon from '@metamask/jazzicon';

export interface IdenticonProps {
  /** Vault address (any case, with or without 0x prefix). Required. */
  address: string;
  /** Pixel size of the square icon. Default 32. */
  size?: number;
  /** Optional class for the wrapping div (e.g. rounded-full, border, etc.) */
  className?: string;
  /** Accessible label override; defaults to "Vault {truncated address}" */
  ariaLabel?: string;
}

/**
 * Convert an ethereum address (0x...) into the integer seed jazzicon expects.
 * Per the library convention, take the first 8 hex chars of the address
 * (after 0x) and parse as int. This is widely used and produces stable seeds.
 */
function addressToSeed(address: string): number {
  const clean = address.startsWith('0x') ? address.slice(2) : address;
  // First 8 hex chars = 32 bits, fits in a JS number safely.
  const slice = clean.slice(0, 8);
  return parseInt(slice, 16) || 0;
}

/**
 * Truncate an address to a friendly 0x1234…5678 form for screen readers.
 */
function truncate(address: string): string {
  if (address.length < 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function Identicon({
  address,
  size = 32,
  className,
  ariaLabel,
}: IdenticonProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Compute seed once per address. Avoids reparsing on every render.
  const seed = useMemo(() => addressToSeed(address), [address]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // Clear any previous render (handles size/address changes)
    container.innerHTML = '';
    try {
      const icon = jazzicon(size, seed) as unknown as HTMLElement;
      // Jazzicon sets style.display = 'inline-block' by default; the wrapping
      // div controls layout via className, so we let the inner element flow.
      container.appendChild(icon);
    } catch {
      // If the library throws (shouldn't happen with valid inputs), leave
      // the container empty. The fallback at the call site is to render
      // the truncated address as text alongside, so empty identicon doesn't
      // break the page.
    }
    return () => {
      if (container) container.innerHTML = '';
    };
  }, [seed, size]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: size, height: size, display: 'inline-block', lineHeight: 0 }}
      role="img"
      aria-label={ariaLabel ?? `Vault ${truncate(address)}`}
    />
  );
}
