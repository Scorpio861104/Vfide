/**
 * Wallet Connection Button
 * 
 * Uses RainbowKit's ConnectButton for consistent wallet management.
 * This replaces the custom implementation to ensure single source of truth.
 * 
 * Enhanced with better accessibility and responsiveness.
 */

'use client';

import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function WalletButton() {
  return <ConnectButton />;
}

/**
 * Compact wallet button for smaller spaces
 * Enhanced with better click handling and accessibility
 */
export function WalletButtonCompact() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    aria-label="Connect your wallet"
                    className="flex items-center gap-2 px-3 py-1.5 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm rounded-lg transition-all cursor-pointer touch-manipulation"
                  >
                    Connect
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    aria-label="Switch to supported network"
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-all cursor-pointer touch-manipulation"
                  >
                    Wrong network
                  </button>
                );
              }

              return (
                <button
                  onClick={openAccountModal}
                  type="button"
                  aria-label="Open account menu"
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#1A1A1F] border border-[#2A2A2F] hover:border-blue-500/50 text-white text-sm rounded-lg transition-colors cursor-pointer touch-manipulation"
                >
                  {account.displayName}
                </button>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
