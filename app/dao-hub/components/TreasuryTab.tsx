'use client';

export function TreasuryTab() {
  return (
    <div className="space-y-4">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-2">DAO Payment Queue</h3>
        <p className="text-gray-400">Pending grants, reimbursements, and compensation releases appear here for approval.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="text-gray-400 text-sm">Queued</div><div className="text-white text-2xl font-bold">3</div></div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="text-gray-400 text-sm">Awaiting multisig</div><div className="text-white text-2xl font-bold">1</div></div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="text-gray-400 text-sm">Released this week</div><div className="text-white text-2xl font-bold">7</div></div>
      </div>
    </div>
  );
}
