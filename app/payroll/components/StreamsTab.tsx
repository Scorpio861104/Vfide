'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Zap, Loader2, PauseCircle, PlayCircle } from 'lucide-react';

interface Stream {
  id: number;
  sender_address: string;
  recipient_address: string;
  token: string;
  total_amount: string;
  rate_per_second: string;
  start_time: string;
  end_time: string;
  withdrawn: string;
  is_paused: boolean;
  status: string;
}

export function StreamsTab() {
  const { address } = useAccount();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'sending' | 'receiving'>('all');

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    fetch(`/api/streams?address=${address}&role=all`)
      .then((r) => r.json())
      .then((data) => setStreams((data.streams ?? []).filter((s: Stream) => s.status === 'active')))
      .finally(() => setLoading(false));
  }, [address]);

  const filtered = streams.filter((s) => {
    if (filter === 'sending') return s.sender_address.toLowerCase() === address?.toLowerCase();
    if (filter === 'receiving') return s.recipient_address.toLowerCase() === address?.toLowerCase();
    return true;
  });

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Zap size={40} className="text-gray-600 mb-4" />
        <p className="text-gray-400">Connect your wallet to view streams.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {(['all', 'sending', 'receiving'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
              filter === f ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-white/3 border border-white/10 text-gray-400 hover:border-white/20'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={22} className="text-cyan-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center bg-white/3 border border-white/10 rounded-2xl">
          <Zap size={32} className="text-gray-600 mb-3" />
          <p className="text-gray-400 text-sm">No active streams.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => {
            const isSender = s.sender_address.toLowerCase() === address?.toLowerCase();
            const end = new Date(s.end_time).getTime();
            const start = new Date(s.start_time).getTime();
            const now = Date.now();
            const progress = Math.min(Math.max(((now - start) / (end - start)) * 100, 0), 100);
            const ratePerDay = parseFloat(s.rate_per_second) * 86400;
            return (
              <div key={s.id} className="bg-white/3 border border-white/10 rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">{isSender ? 'Sending to' : 'Receiving from'}</p>
                    <p className="text-sm text-white font-mono">
                      {isSender ? s.recipient_address.slice(0, 14) + '…' : s.sender_address.slice(0, 14) + '…'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">{parseFloat(s.total_amount).toFixed(2)} {s.token}</p>
                    <p className="text-xs text-gray-500">{ratePerDay.toFixed(4)}/day</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 bg-white/5 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-xs text-gray-500 flex-shrink-0">{progress.toFixed(0)}%</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1 text-xs ${
                    s.is_paused ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {s.is_paused ? <PauseCircle size={10} /> : <PlayCircle size={10} />}
                    {s.is_paused ? 'Paused' : 'Streaming'}
                  </span>
                  <p className="text-xs text-gray-500">
                    Ends {new Date(s.end_time).toLocaleDateString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
