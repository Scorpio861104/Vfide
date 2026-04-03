'use client';

import { useAccount } from 'wagmi';

export function ActiveTab() {
  const { isConnected } = useAccount();

  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-white mb-3">Active Subscriptions</h2>
        {isConnected ? (
          <>
            <p className="text-white font-semibold mb-2">No Active Subscriptions</p>
            <p className="text-gray-400">
              Create a recurring payment for payroll, rent, retainers, or software renewals in a few clicks.
            </p>
          </>
        ) : (
          <p className="text-gray-300">
            Connect your wallet to view and manage your subscriptions.
          </p>
        )}
      </div>
    </div>
  );
}
