'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { usePayroll } from '@/hooks/usePayroll';

export function DashboardTab() {
  const { address, isConnected } = useAccount();
  const payroll = usePayroll();
  const [activeView, setActiveView] = useState<'receiving' | 'sending'>('receiving');

  if (!isConnected || !address) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/3 p-6 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
        <p className="text-gray-400">Connect your wallet to view and manage your salary streams.</p>
      </div>
    );
  }

  const receivingStreams = Array.isArray(payroll.receivingStreams) ? payroll.receivingStreams : [];
  const sendingStreams = Array.isArray(payroll.sendingStreams) ? payroll.sendingStreams : [];
  const activeStreams = activeView === 'receiving' ? receivingStreams : sendingStreams;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 p-6">
        <h2 className="text-3xl font-bold text-white mb-2">Salary Streaming</h2>
        <p className="text-gray-300">Manage onchain payroll automation that settles Every Second.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/3 p-6">
          <h3 className="text-xl font-bold text-white mb-2">Get Paid</h3>
          <p className="text-gray-400">Track incoming salary streams that pay out Every Second.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/3 p-6">
          <h3 className="text-xl font-bold text-white mb-2">Pay Your Team</h3>
          <p className="text-gray-400">Create and manage outgoing payroll streams that settle Every Second.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setActiveView('receiving')}
          className={`rounded-xl px-4 py-2 font-semibold ${
            activeView === 'receiving' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-gray-300'
          }`}
        >
          Receiving
        </button>
        <button
          type="button"
          onClick={() => setActiveView('sending')}
          className={`rounded-xl px-4 py-2 font-semibold ${
            activeView === 'sending' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-gray-300'
          }`}
        >
          Sending
        </button>
        <button type="button" className="rounded-xl border border-cyan-500/30 px-4 py-2 font-semibold text-cyan-400">
          Create Stream
        </button>
      </div>

      {payroll.loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/3 p-6 text-gray-300">Loading payroll streams…</div>
      ) : activeStreams.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/3 p-6">
          <h3 className="text-2xl font-bold text-white mb-2">No Streams Found</h3>
          <p className="text-gray-400">
            {activeView === 'receiving'
              ? "You're not receiving any salary streams yet."
              : "You're not sending any salary streams yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeStreams.map((stream, index) => (
            <div key={stream.id.toString()} className="rounded-2xl border border-white/10 bg-white/3 p-4 text-white">
              Stream #{index + 1}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
