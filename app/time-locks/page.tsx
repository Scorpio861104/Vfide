'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

interface TimeLock {
  id: string;
  token: string;
  to: string;
  amount: string;
  createdAt: number;
  unlockAt: number;
  status: 'pending' | 'ready' | 'executed' | 'cancelled';
}

export default function TimeLocksPage() {
  const { address, isConnected } = useAccount();
  const [timeLocks, setTimeLocks] = useState<TimeLock[]>([]);
  const [_settings, _setSettings] = useState({
    tier1: { threshold: 0.1, delay: 0 },
    tier2: { threshold: 1, delay: 3600 },
    tier3: { threshold: 10, delay: 21600 },
    tier4: { threshold: 100, delay: 86400 },
  });

  useEffect(() => {
    if (address) {
      setTimeLocks([]);
    }
  }, [address]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  const getTimeRemaining = (lock: TimeLock) => {
    const remaining = lock.unlockAt - Date.now();
    if (remaining <= 0) return 'Ready';
    return formatTime(remaining);
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8 pt-20 pb-24 md:pb-8">
        <div className="text-center py-20">
          <h1 className="text-xl sm:text-2xl font-bold mb-4">Time Locks</h1>
          <p className="text-muted-foreground">Connect your wallet to manage time-locked transfers</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-20 pb-24 md:pb-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Time-Locked Transfers</h1>
        <p className="text-muted-foreground">Automatic security delays for large transfers</p>
      </div>

      {/* Tier Configuration */}
      <div className="bg-card rounded-xl p-4 border">
        <h3 className="font-medium mb-4">Security Tiers</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-muted rounded-lg p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">{"< 0.1 ETH"}</div>
            <div className="font-semibold text-green-500">Instant</div>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">0.1 - 1 ETH</div>
            <div className="font-semibold text-yellow-500">1 Hour</div>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">1 - 10 ETH</div>
            <div className="font-semibold text-orange-500">6 Hours</div>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">{"> 10 ETH"}</div>
            <div className="font-semibold text-red-500">24 Hours</div>
          </div>
        </div>
      </div>

      {/* Pending Transfers */}
      <div>
        <h3 className="font-medium mb-3">Pending Transfers</h3>
        <div className="space-y-3">
          {timeLocks.filter(l => l.status === 'pending' || l.status === 'ready').length === 0 ? (
            <div className="text-center py-8 text-muted-foreground bg-card rounded-xl border">
              No pending time-locked transfers
            </div>
          ) : (
            timeLocks
              .filter(l => l.status === 'pending' || l.status === 'ready')
              .map((lock) => (
                <div key={lock.id} className="bg-card rounded-xl p-4 border">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-medium">{lock.amount} {lock.token}</div>
                      <div className="text-sm text-muted-foreground">To: {lock.to}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${lock.status === 'ready' ? 'text-green-500' : 'text-yellow-500'}`}>
                        {getTimeRemaining(lock)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {lock.status === 'ready' ? 'Ready to execute' : 'Time remaining'}
                      </div>
                    </div>
                  </div>

                  {lock.status === 'pending' && (
                    <div className="h-2 bg-muted rounded-full overflow-hidden mt-3">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{
                          width: `${Math.max(0, 100 - ((lock.unlockAt - Date.now()) / (lock.unlockAt - lock.createdAt)) * 100)}%`,
                        }}
                      />
                    </div>
                  )}

                  <div className="flex gap-2 mt-3">
                    {lock.status === 'ready' ? (
                      <button className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg text-sm">
                        Execute Transfer
                      </button>
                    ) : (
                      <button className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm">
                        Accelerate with 2FA
                      </button>
                    )}
                    <button className="px-3 py-2 bg-red-500/10 text-red-500 rounded-lg text-sm">
                      Cancel
                    </button>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* Whitelist */}
      <div className="bg-card rounded-xl p-4 border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Whitelisted Addresses</h3>
          <button className="text-sm text-primary">+ Add Address</button>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Transfers to whitelisted addresses are instant (after 24h cooldown)
        </p>
        <div className="text-center py-4 text-muted-foreground text-sm">
          No addresses whitelisted yet
        </div>
      </div>
    </div>
  );
}
