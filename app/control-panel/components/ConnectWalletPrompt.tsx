'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';

export function ConnectWalletPrompt() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="text-center">
        <div className="text-6xl mb-6">🔐</div>
        <h1 className="text-3xl font-bold text-white mb-4">Connect Your Wallet</h1>
        <p className="text-slate-400 mb-8 max-w-md">
          You need to connect your wallet to access the Owner Control Panel.
          <br />
          Make sure you're using the owner address.
        </p>
        <ConnectButton />
      </div>
    </div>
  );
}
