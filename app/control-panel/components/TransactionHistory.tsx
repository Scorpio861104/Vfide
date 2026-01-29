'use client';

export function TransactionHistory() {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
      <h2 className="text-2xl font-bold text-white mb-4">📜 Transaction History</h2>
      <p className="text-slate-400 mb-6">View recent administrative transactions and their status.</p>
      <div className="space-y-4">
        <div className="p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg">
          <p className="text-white">Transaction history will appear here...</p>
        </div>
      </div>
    </div>
  );
}
