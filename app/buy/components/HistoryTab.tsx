'use client';

export function HistoryTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-2">Purchase History</h3>
        <p className="text-gray-400">Completed on-ramp sessions, provider references, and swap receipts will appear here after your first successful purchase.</p>
      </div>

      <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-gray-300">
        No completed buy or swap activity has been recorded in this session yet.
      </div>
    </div>
  );
}
