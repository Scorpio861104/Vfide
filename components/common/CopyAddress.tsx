/**
 * CopyAddress — inline address display with one-click copy.
 *
 * Used anywhere we truncate a wallet address. The copy icon flashes
 * green on success, using the existing useCopyToClipboard hook.
 *
 * Usage:
 *   <CopyAddress address="0x1234...5678" />
 *   <CopyAddress address={address} className="text-sm" chars={6} />
 */
'use client';

import { Copy, Check } from 'lucide-react';
import { useCopyToClipboard } from '@/lib/hooks/useCopyToClipboard';
import { cn } from '@/lib/utils';

interface CopyAddressProps {
  address: string;
  /** Characters to show at start and end. Default 6 */
  chars?: number;
  /** Extra className on the wrapper */
  className?: string;
  /** Show the full address in a tooltip/title attribute */
  showTooltip?: boolean;
}

export function CopyAddress({
  address,
  chars = 6,
  className,
  showTooltip = true,
}: CopyAddressProps) {
  const { copied, copy } = useCopyToClipboard({ resetDelay: 1500 });

  const truncated = address.length > chars * 2 + 3
    ? `${address.slice(0, chars)}…${address.slice(-chars + 2)}`
    : address;

  return (
    <>
      {/* Screen reader announcement — politely announces "Copied!" once */}
      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {copied ? 'Address copied to clipboard' : ''}
      </span>
      <button
        onClick={() => copy(address)}
        title={showTooltip ? address : undefined}
        aria-label={`Copy address ${address}`}
        aria-pressed={copied}
        className={cn(
          'inline-flex items-center gap-1.5 font-mono text-sm rounded-lg px-2 py-1',
          'text-zinc-300 hover:text-white bg-zinc-800/50 hover:bg-zinc-800',
          'transition-all duration-150 cursor-pointer select-none',
          copied && 'bg-green-900/30 text-green-300 hover:bg-green-900/40',
          className
        )}
      >
        <span>{truncated}</span>
        {copied ? (
          <>
            <Check size={12} className="text-green-400 shrink-0" aria-hidden />
            <span className="text-[11px] text-green-400 font-sans font-medium">Copied!</span>
          </>
        ) : (
          <Copy size={12} className="text-zinc-500 shrink-0" aria-hidden />
        )}
      </button>
    </>
  );
}
