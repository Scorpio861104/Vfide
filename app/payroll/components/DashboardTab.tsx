'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Users, Loader2, Zap, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

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
  created_at: string;
}

export function DashboardTab() {
  const { address } = useAccount();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    fetch(`/api/streams?address=${address}&role=all`)
      .then((r) => r.json())
      .then((data) => setStreams(data.streams ?? []))
      .finally(() => setLoading(false));
  }, [address]);

  const activeStreams = streams.filter((s) => s.status === 'active' && !s.is_paused);
  const sending = streams.filter((s) => s.sender_address.toLowerCase() === address?.toLowerCase());
  const receiving = streams.filter((s) => s.recipient_address.toLowerCase() === address?.toLowerCase());
  const totalSending = sending.reduce((acc, s) => acc + parseFloat(s.total_amount), 0);
  const totalReceiving = receiving.reduce((acc, s) => acc + parseFloat(s.total_amount), 0);

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Users size={40} className="text-gray-600 mb-4" />
        <p className="text-gray-400">Connect your wallet to view your payroll dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Active Streams', value: loading ? '—' : activeStreams.length, icon: <Zap size={14} className="text-cyan-400" /> },
          { label: 'Total Streams', value: loading ? '—' : streams.length, icon: <Users size={14} className="text-purple-400" /> },
          { label: 'Total Sending', value: loading ? '—' : `${totalSending.toFixed(2)} VFIDE`, icon: <ArrowUpRight size={14} className="text-red-400" /> },
          { label: 'Total Receiving', value: loading ? '—' : `${totalReceiving.toFixed(2)} VFIDE`, icon: <ArrowDownLeft size={14} className="text-green-400" /> },
        ].map((s) => (
          <div key={s.label} className="bg-white/3 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">{s.icon}<p className="text-xs text-gray-400">{s.label}</p></div>
            <p className="text-lg font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={22} className="text-cyan-400 animate-spin" />
        </div>
      ) : activeStreams.length > 0 ? (
        <div className="bg-white/3 border border-white/10 rounded-2xl p-5">
          <p className="text-sm font-semibold text-white mb-3">Active Streams</p>
          <div className="space-y-3">
            {activeStreams.slice(0, 5).map((s) => {
              const isSender = s.sender_address.toLowerCase() === address?.toLowerCase();
              const end = new Date(s.end_time).getTime();
              const start = new Date(s.start_time).getTime();
              const now = Date.now();
              const progress = Math.min(((now - start) / (end - start)) * 100, 100);
              return (
                <div key={s.id} className="p-3 bg-white/3 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-400">
                      {isSender ? `→ ${s.recipient_address.slice(0, 10)}…` : `← ${s.sender_address.slice(0, 10)}…`}
                    </p>
                    <p className="text-xs text-white font-semibold">{parseFloat(s.total_amount).toFixed(2)} {s.token}</p>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1">
                    <div className="h-1 rounded-full bg-cyan-500" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-white/3 border border-white/10 rounded-2xl">
          <Zap size={32} className="text-gray-600 mb-3" />
          <p className="text-gray-400 text-sm">No active streams.</p>
          <p className="text-gray-500 text-xs mt-1">Use the Create tab to start a new payroll stream.</p>
        </div>
      )}
    </div>
  );
}
