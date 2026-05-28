'use client';

import { VfideConnectButton } from '@/components/crypto/VfideConnectButton';

export function ConnectWalletPrompt() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="text-center">
        <div className="text-6xl mb-6">🔐</div>
        <h1 className="text-3xl font-bold text-white mb-4">Connect Your Wallet</h1>
        <p className="text-slate-400 mb-8 max-w-md">
          You need to connect your wallet to access the Owner Control Panel.
          <br />
          Make sure you&apos;re using the owner address.
        </p>
        <VfideConnectButton size="md" />
      </div>
    </div>
  );
}
