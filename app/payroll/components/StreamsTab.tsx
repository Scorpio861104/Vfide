'use client';

import { usePayroll } from '@/hooks/usePayroll';

export function StreamsTab() {
  const payroll = usePayroll();
  const totalStreams = [
    ...(Array.isArray(payroll.receivingStreams) ? payroll.receivingStreams : []),
    ...(Array.isArray(payroll.sendingStreams) ? payroll.sendingStreams : []),
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Streams</h3>
        <p className="text-gray-400">Review active and historical salary streams from one place.</p>
      </div>

      {totalStreams.length === 0 ? (
        <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
          <h4 className="text-lg font-bold text-white mb-2">No Streams Found</h4>
          <p className="text-gray-400">Create a stream to start automated payroll payouts.</p>
        </div>
      ) : null}
    </div>
  );
}
