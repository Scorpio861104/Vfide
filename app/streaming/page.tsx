'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { toast } from '@/lib/toast';

interface Stream {
  id: string;
  recipient: string;
  token: string;
  totalAmount: string;
  ratePerSecond: string;
  startTime: number;
  endTime: number;
  withdrawn: string;
  isPaused: boolean;
  status: 'active' | 'completed' | 'cancelled';
}

export default function StreamingPage() {
  const { address, isConnected } = useAccount();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [activeTab, setActiveTab] = useState<'outgoing' | 'incoming'>('outgoing');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('30'); // days
  const [token, setToken] = useState('ETH');

  // Live data source is not wired yet; keep list empty until contract reads are connected.
  useEffect(() => {
    if (!address) {
      setStreams([]);
      return;
    }
    setStreams([]);
  }, [address]);

  const handleCreateStream = useCallback(() => {
    if (!recipient || !amount || !duration) {
      toast.error('Please fill all fields');
      return;
    }

    const durationSeconds = parseInt(duration) * 24 * 60 * 60;
    const ratePerSecond = parseFloat(amount) / durationSeconds;

    const newStream: Stream = {
      id: Date.now().toString(),
      recipient,
      token,
      totalAmount: amount,
      ratePerSecond: ratePerSecond.toFixed(12),
      startTime: Date.now(),
      endTime: Date.now() + durationSeconds * 1000,
      withdrawn: '0',
      isPaused: false,
      status: 'active',
    };

    setStreams([newStream, ...streams]);
    setShowCreateModal(false);
    setRecipient('');
    setAmount('');
    toast.success('Stream created successfully');
  }, [recipient, amount, duration, token, streams]);

  const calculateProgress = (stream: Stream) => {
    const now = Date.now();
    const total = stream.endTime - stream.startTime;
    const elapsed = Math.min(now - stream.startTime, total);
    return (elapsed / total) * 100;
  };

  const calculateStreamed = (stream: Stream) => {
    const progress = calculateProgress(stream) / 100;
    return (parseFloat(stream.totalAmount) * progress).toFixed(6);
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8 pt-20 pb-24 md:pb-8">
        <div className="text-center py-20">
          <h1 className="text-xl sm:text-2xl font-bold mb-4">Streaming Payments</h1>
          <p className="text-muted-foreground">Connect your wallet to manage payment streams</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-20 pb-24 md:pb-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Streaming Payments</h1>
          <p className="text-muted-foreground text-sm">Real-time payment flows per second</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 self-start sm:self-auto"
        >
          + Create Stream
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 border">
          <div className="text-sm text-muted-foreground">Active Streams</div>
          <div className="text-2xl font-bold">{streams.filter(s => s.status === 'active').length}</div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="text-sm text-muted-foreground">Total Streaming</div>
          <div className="text-2xl font-bold">
            {streams.filter(s => s.status === 'active').reduce((sum, s) => sum + parseFloat(s.totalAmount), 0).toFixed(2)} ETH
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="text-sm text-muted-foreground">Completed</div>
          <div className="text-2xl font-bold">{streams.filter(s => s.status === 'completed').length}</div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="text-sm text-muted-foreground">Total Value</div>
          <div className="text-2xl font-bold">
            ${(streams.reduce((sum, s) => sum + parseFloat(s.totalAmount), 0) * 2500).toFixed(0)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {(['outgoing', 'incoming'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab} Streams
          </button>
        ))}
      </div>

      {/* Streams List */}
      <div className="space-y-4">
        {streams.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No live streams found. Connect Payroll/Subscription contracts to display on-chain streams.
          </div>
        ) : (
          streams.map((stream) => (
            <div key={stream.id} className="bg-card rounded-xl p-4 border">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-medium">{stream.recipient}</div>
                  <div className="text-sm text-muted-foreground">
                    {stream.totalAmount} {stream.token} over {Math.round((stream.endTime - stream.startTime) / (24 * 60 * 60 * 1000))} days
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  stream.status === 'active' 
                    ? 'bg-green-500/20 text-green-500'
                    : stream.status === 'completed'
                    ? 'bg-blue-500/20 text-blue-500'
                    : 'bg-red-500/20 text-red-500'
                }`}>
                  {stream.status}
                </span>
              </div>

              {/* Progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{calculateStreamed(stream)} {stream.token} streamed</span>
                  <span className="text-muted-foreground">{calculateProgress(stream).toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all"
                    style={{ width: `${calculateProgress(stream)}%` }}
                  />
                </div>
              </div>

              {/* Actions */}
              {stream.status === 'active' && (
                <div className="flex gap-2 mt-4">
                  <button className="flex-1 px-3 py-2 bg-muted rounded-lg text-sm hover:bg-muted/80">
                    {stream.isPaused ? 'Resume' : 'Pause'}
                  </button>
                  <button className="flex-1 px-3 py-2 bg-red-500/10 text-red-500 rounded-lg text-sm hover:bg-red-500/20">
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <>
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" onClick={() => setShowCreateModal(false)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md bg-card border rounded-2xl p-6 z-50 space-y-4">
            <h2 className="text-xl font-bold">Create Payment Stream</h2>

            <div>
              <label className="text-sm text-muted-foreground block mb-1">Recipient Address</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="0x... or ENS name"
                className="w-full p-3 bg-muted border border-border rounded-lg"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Amount</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full p-3 bg-muted border border-border rounded-lg"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Token</label>
                <select
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full p-3 bg-muted border border-border rounded-lg"
                >
                  <option>ETH</option>
                  <option>USDC</option>
                  <option>USDT</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground block mb-1">Duration (days)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full p-3 bg-muted border border-border rounded-lg"
              />
            </div>

            <div className="bg-muted rounded-lg p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rate per second:</span>
                <span>{amount && duration ? (parseFloat(amount) / (parseInt(duration) * 24 * 60 * 60)).toFixed(12) : '0'} {token}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-3 bg-muted rounded-lg hover:bg-muted/80"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateStream}
                className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Create Stream
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
