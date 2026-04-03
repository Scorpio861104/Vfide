'use client';

import { useAccount } from 'wagmi';

export function CreateTab() {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-2">Connect Wallet</h3>
          <p className="text-gray-400">You need to connect your wallet to create proposals.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-2">Create Proposal</h3>
        <p className="text-gray-400">Draft governance actions for treasury, policy, or protocol updates.</p>
      </div>
    </div>
  );
}
