'use client';

export function HistoryTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-white mb-3">Payment History</h2>
        <p className="text-gray-400">
          Your completed and skipped subscription payments will appear here once billing starts.
        </p>
      </div>
    </div>
  );
}
