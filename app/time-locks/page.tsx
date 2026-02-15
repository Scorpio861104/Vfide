'use client';

import React, { useState, useEffect } from 'react';
import { isAddress } from 'viem';
import { useAccount } from 'wagmi';
import { getAuthHeaders } from '@/lib/auth/client';

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
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [whitelist, setWhitelist] = useState<string[]>([]);

  useEffect(() => {
    if (!address) {
      setTimeLocks([]);
      return;
    }

    let isMounted = true;

    const fetchTimeLocks = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const response = await fetch(`/api/time-locks?userAddress=${address}`, {
          headers: getAuthHeaders(),
        });
        if (!response.ok) throw new Error('Failed to load time locks');
        const data = await response.json();
        const locks = Array.isArray(data.timeLocks || data.locks) ? (data.timeLocks || data.locks) : [];
        const mapped = locks.map((lock: Record<string, unknown>) => {
          const createdAt = lock.createdAt ? new Date(lock.createdAt as string | number | Date).getTime() : Date.now();
          const unlockAt = lock.unlockAt ? new Date(lock.unlockAt as string | number | Date).getTime() : Date.now();
          const status: TimeLock['status'] = (lock.status as TimeLock['status']) || (unlockAt <= Date.now() ? 'ready' : 'pending');

          return {
            id: String(lock.id ?? `${lock.token ?? 'token'}-${createdAt}`),
            token: lock.token ?? 'VFIDE',
            to: lock.to ?? lock.recipient ?? 'Unknown',
            amount: String(lock.amount ?? '0'),
            createdAt,
            unlockAt,
            status,
          } as TimeLock;
        });

        if (isMounted) {
          setTimeLocks(mapped);
        }
      } catch {
        if (isMounted) {
          setTimeLocks([]);
          setLoadError('Unable to load time-locked transfers.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchTimeLocks();

    return () => {
      isMounted = false;
    };
  }, [address]);

  useEffect(() => {
    const stored = localStorage.getItem('vfide_time_lock_whitelist');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setWhitelist(parsed);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('vfide_time_lock_whitelist', JSON.stringify(whitelist));
  }, [whitelist]);

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

  const handleExecute = (id: string) => {
    setTimeLocks((prev) => prev.map((lock) => (lock.id === id ? { ...lock, status: 'executed' } : lock)));
  };

  const handleCancel = (id: string) => {
    setTimeLocks((prev) => prev.map((lock) => (lock.id === id ? { ...lock, status: 'cancelled' } : lock)));
  };

  const handleAccelerate = (id: string) => {
    setTimeLocks((prev) => prev.map((lock) => (lock.id === id ? { ...lock, unlockAt: Date.now(), status: 'ready' } : lock)));
  };

  const handleAddWhitelist = () => {
    const input = prompt('Enter address to whitelist (0x...)');
    if (!input) return;
    if (!isAddress(input)) return;
    setWhitelist((prev) => (prev.includes(input) ? prev : [...prev, input]));
  };

  const handleRemoveWhitelist = (addressToRemove: string) => {
    setWhitelist((prev) => prev.filter((addr) => addr !== addressToRemove));
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
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground bg-card rounded-xl border">
              Loading time-locked transfers...
            </div>
          ) : loadError ? (
            <div className="text-center py-8 text-red-500/80 bg-card rounded-xl border">
              {loadError}
            </div>
          ) : timeLocks.filter(l => l.status === 'pending' || l.status === 'ready').length === 0 ? (
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
                          width: `${Math.min(100, Math.max(0, ((Date.now() - lock.createdAt) / Math.max(1, lock.unlockAt - lock.createdAt)) * 100))}%`,
                        }}
                      />
                    </div>
                  )}

                  <div className="flex gap-2 mt-3">
                    {lock.status === 'ready' ? (
                      <button
                        className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg text-sm"
                        onClick={() => handleExecute(lock.id)}
                      >
                        Execute Transfer
                      </button>
                    ) : (
                      <button
                        className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
                        onClick={() => handleAccelerate(lock.id)}
                      >
                        Accelerate with 2FA
                      </button>
                    )}
                    <button
                      className="px-3 py-2 bg-red-500/10 text-red-500 rounded-lg text-sm"
                      onClick={() => handleCancel(lock.id)}
                    >
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
          <button className="text-sm text-primary" onClick={handleAddWhitelist}>+ Add Address</button>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Transfers to whitelisted addresses are instant (after 24h cooldown)
        </p>
        {whitelist.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No addresses whitelisted yet
          </div>
        ) : (
          <div className="space-y-2">
            {whitelist.map((addr) => (
              <div key={addr} className="flex items-center justify-between rounded-lg border border-white/10 bg-muted/40 px-3 py-2 text-sm">
                <span className="font-mono text-muted-foreground">{addr}</span>
                <button className="text-xs text-red-500" onClick={() => handleRemoveWhitelist(addr)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
