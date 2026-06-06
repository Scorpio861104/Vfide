'use client';

import '@rainbow-me/rainbowkit/styles.css';

/**
 * Wallet-only side-effect loader for RainbowKit styles.
 *
 * Importing RainbowKit CSS from the root app layout made Turbopack include
 * RainbowKit/wagmi/viem chunks in marketing pages during dev cold compiles.
 * Keep the CSS side effect behind the wallet-only provider graph instead.
 */
export function RainbowKitStyles() {
  return null;
}
