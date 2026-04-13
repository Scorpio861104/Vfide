'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Clock, Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface Stream {
  id: number;
  sender_address: string;
  recipient_address: string;
  token: string;
  total_amount: string;
  start_time: string;
  end_time: string;
  withdrawn: string;
  status: string;
}

export function HistoryTab() {
  const { address } = useAccount();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    fetch(`/api/streams?address=${address}&role=all`)
      .then((r) => r.json())
      .then((data) => {
        const all: Stream[] = data.streams ?? [];
        setStreams(all.filter((s) => s.status !== 'active'));
      })
      .finally(() => setLoading(false));
  }, [address]);

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Clock size={40} className="text-gray-600 mb-4" />
        <p className="text-gray-400">Connect your wallet to view your payment history.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={16} className="text-cyan-400" />
          <h3 className="text-white font-semibold text-sm">Completed Streams</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="text-cyan-400 animate-spin" />
          </div>
        ) : streams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Clock size={32} className="text-gray-600 mb-3" />
            <p className="text-gray-400 text-sm">No completed streams yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {streams.map((s) => {
              const isSender = s.sender_address.toLowerCase() === address?.toLowerCase();
              const pct = s.total_amount !== '0' ? ((parseFloat(s.withdrawn) / parseFloat(s.total_amount)) * 100).toFixed(0) : '0';
              return (
                <div key={s.id} className="p-3 bg-white/3 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-gray-500">{isSender ? 'Sent to' : 'Received from'}</p>
                      <p className="text-sm text-white font-mono">
                        {isSender ? s.recipient_address.slice(0, 14) + '…' : s.sender_address.slice(0, 14) + '…'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">{parseFloat(s.total_amount).toFixed(2)} {s.token}</p>
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        {s.status === 'completed' ? (
                          <CheckCircle2 size={10} className="text-green-400" />
                        ) : (
                          <XCircle size={10} className="text-red-400" />
                        )}
                        <p className="text-xs text-gray-500 capitalize">{s.status}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-600">{new Date(s.start_time).toLocaleDateString()} – {new Date(s.end_time).toLocaleDateString()}</p>
                    <p className="text-xs text-gray-500">{pct}% withdrawn</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
