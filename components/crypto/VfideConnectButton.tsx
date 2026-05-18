'use client';

/**
 * VfideConnectButton — canonical wallet connect button for VFIDE.
 *
 * Tier 3 Round 10 (2026-05-17). Replaces the raw `<ConnectButton/>` from
 * RainbowKit, which renders in RainbowKit's default colorful "rainbow"
 * palette and clashes with the VFIDE dark/cyan design system. Particularly
 * jarring in the TopNav where everything else is dark zinc + cyan and the
 * wallet pill stuck out with its colorful avatar and bright background.
 *
 * Three visible states (matching RainbowKit's mounted lifecycle):
 *   1. **Disconnected** — cyan gradient CTA labeled "Connect" (with Wallet
 *      icon when not size="sm"). Opens RainbowKit's connect modal.
 *   2. **Connected** — Identicon (deterministic per-address jazzicon) +
 *      truncated 0x1234…5678 + ChevronDown affordance. Opens RainbowKit's
 *      account modal (switch / sign out).
 *   3. **Wrong network** — amber warning pill with AlertTriangle. Opens
 *      RainbowKit's chain modal so the user can switch.
 *
 * Pre-mount state is rendered with opacity-0 + aria-hidden + no pointer
 * events to avoid hydration mismatch flash, as recommended by RainbowKit.
 *
 * Sizes:
 *   - sm — nav-bar height (h-9), label only on "Connect"
 *   - md — default (h-10), label always shown
 *   - lg — hero CTA (h-12, larger icon, bold)
 */

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ChevronDown, AlertTriangle, Wallet } from 'lucide-react';
import { Identicon } from '@/components/identity/Identicon';

export type VfideConnectButtonSize = 'sm' | 'md' | 'lg';

export interface VfideConnectButtonProps {
  /** Visual size. Default 'sm' for nav usage. */
  size?: VfideConnectButtonSize;
  /** Hide the chain (network) indicator when connected. Default true (cleaner). */
  hideChain?: boolean;
}

const SIZE = {
  sm: {
    container: 'h-9 px-3 text-sm',
    iconSize: 14,
    identicon: 18,
  },
  md: {
    container: 'h-10 px-4 text-sm',
    iconSize: 16,
    identicon: 22,
  },
  lg: {
    container: 'h-12 px-5 text-base',
    iconSize: 18,
    identicon: 26,
  },
} as const;

export function VfideConnectButton({
  size = 'sm',
  hideChain: _hideChain = true,
}: VfideConnectButtonProps = {}) {
  const s = SIZE[size];

  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' },
            })}
          >
            {(() => {
              // ── 1. Disconnected ──
              if (!connected) {
                return (
                  <button
                    type="button"
                    onClick={openConnectModal}
                    aria-label="Connect wallet"
                    className={`inline-flex items-center gap-2 ${s.container} rounded-lg font-semibold text-zinc-950 bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 active:scale-[0.98] shadow-lg shadow-cyan-500/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950`}
                  >
                    {size !== 'sm' && <Wallet size={s.iconSize} />}
                    Connect{size === 'lg' ? ' Wallet' : ''}
                  </button>
                );
              }

              // ── 2. Wrong network ──
              if (chain.unsupported) {
                return (
                  <button
                    type="button"
                    onClick={openChainModal}
                    aria-label="Switch to supported network"
                    className={`inline-flex items-center gap-2 ${s.container} rounded-lg font-semibold text-amber-200 bg-amber-500/10 border border-amber-500/40 hover:bg-amber-500/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950`}
                  >
                    <AlertTriangle size={s.iconSize} />
                    Wrong network
                  </button>
                );
              }

              // ── 3. Connected: Identicon + truncated address ──
              return (
                <button
                  type="button"
                  onClick={openAccountModal}
                  aria-label="Open account menu"
                  className={`inline-flex items-center gap-2 ${s.container} rounded-lg font-medium text-white bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950`}
                >
                  {account.address && (
                    <Identicon
                      address={account.address}
                      size={s.identicon}
                      className="rounded-full overflow-hidden flex-shrink-0"
                      ariaLabel=""
                    />
                  )}
                  <span className="font-mono text-xs sm:text-sm">
                    {account.displayName}
                  </span>
                  <ChevronDown size={size === 'lg' ? 16 : 14} className="text-zinc-500" />
                </button>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
