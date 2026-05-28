'use client';

/**
 * Address — renders an Ethereum address with proper overflow + truncation.
 *
 * Why this exists: addresses are 42 characters of hex that don't wrap at
 * word boundaries. Rendering them in a normal `<span>` inside a flex layout
 * pushes the parent's width and breaks responsive design on mobile. There
 * were 48 sites in this codebase rendering addresses without break/truncate
 * protection.
 *
 * Default behavior (variant="short"): shows "0x1234…abcd" in a font-mono
 * span. Click-to-copy is enabled by default. Falls back gracefully if the
 * address isn't valid hex.
 *
 * Use variant="full" when you actually need the full address visible (e.g.
 * a receipt or QR-target display) — that variant uses break-all so the
 * address wraps at any character boundary instead of overflowing.
 */

import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';

export interface AddressProps {
  /** The address to display. Accepts any string; non-hex values fall back to raw display. */
  address: string | undefined | null;
  /** "short" = "0x1234…abcd" (default), "full" = entire address with break-all wrapping. */
  variant?: 'short' | 'full';
  /** Number of leading/trailing chars in short mode (default 6 / 4). */
  leading?: number;
  trailing?: number;
  /** Disable click-to-copy interaction. */
  noCopy?: boolean;
  /** Show a copy-icon trigger next to the text. */
  showCopyIcon?: boolean;
  /** Custom className appended to the wrapping span. */
  className?: string;
  /** Optional label for screen readers; defaults to the full address. */
  ariaLabel?: string;
}

const HEX_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

function shorten(addr: string, leading: number, trailing: number): string {
  if (addr.length <= leading + trailing + 1) return addr;
  return `${addr.slice(0, leading)}…${addr.slice(-trailing)}`;
}

export function Address({
  address,
  variant = 'short',
  leading = 6,
  trailing = 4,
  noCopy = false,
  showCopyIcon = false,
  className = '',
  ariaLabel,
}: AddressProps) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Older browsers or insecure context — silently ignore; the user
      // can still read the displayed address.
    }
  }, [address]);

  if (!address) {
    return (
      <span className={`font-mono text-zinc-500 ${className}`}>—</span>
    );
  }

  const display = variant === 'full'
    ? address
    : HEX_ADDRESS.test(address)
      ? shorten(address, leading, trailing)
      : address;

  // `break-all` for full mode so the address wraps at character boundaries
  // and never overflows its parent. Short mode is naturally non-overflowing
  // because it's bounded length, but we still apply truncate as a belt-and-
  // suspenders measure in case the parent forces narrow width.
  const overflowClass = variant === 'full'
    ? 'break-all'
    : 'truncate inline-block max-w-full align-bottom';

  const label = ariaLabel ?? address;

  if (noCopy) {
    return (
      <span
        className={`font-mono ${overflowClass} ${className}`}
        aria-label={label}
        title={address}
      >
        {display}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 max-w-full ${className}`}>
      <button
        type="button"
        onClick={copy}
        className={`font-mono ${overflowClass} hover:text-accent cursor-pointer text-left`}
        aria-label={`Copy address ${label}`}
        title={`Click to copy: ${address}`}
      >
        {display}
      </button>
      {showCopyIcon && (
        <button
          type="button"
          onClick={copy}
          className="text-zinc-500 hover:text-accent flex-shrink-0"
          aria-label="Copy address"
          title="Copy address"
        >
          {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
        </button>
      )}
    </span>
  );
}
