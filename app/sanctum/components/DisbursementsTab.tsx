'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function DisbursementsTab({ isConnected }: { isConnected: boolean }) {
  const disbursements = [
    { id: 1, charity: 'Save the Children', amount: 5000, status: 'executed', approvals: '3/3', date: '2025-12-15' },
    { id: 2, charity: 'Doctors Without Borders', amount: 3000, status: 'pending', approvals: '2/3', date: '2025-12-18' },
    { id: 3, charity: 'Ocean Cleanup', amount: 4000, status: 'executed', approvals: '3/3', date: '2025-12-10' },
    { id: 4, charity: 'Code.org', amount: 2500, status: 'executed', approvals: '3/3', date: '2025-12-05' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-zinc-100">Disbursement Proposals</h2>
        {isConnected && (
          <button className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg font-bold transition-colors">
            + New Proposal
          </button>
        )}
      </div>

      <div className="space-y-4">
        {disbursements.map((d) => (
          <div key={d.id} className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <div className="text-zinc-100 font-bold text-lg">{d.charity}</div>
                <div className="text-sm text-zinc-400">Proposal #{d.id} · {d.date}</div>
              </div>
              <div className="text-2xl font-bold text-pink-400">{d.amount.toLocaleString()} VFIDE</div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-zinc-100 font-bold">{d.approvals}</div>
                  <div className="text-xs text-zinc-400">Approvals</div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                  d.status === 'executed' ? 'bg-green-500/20 text-green-400' :
                  d.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {d.status.toUpperCase()}
                </span>
              </div>
            </div>
            {d.status === 'pending' && isConnected && (
              <div className="mt-4 pt-4 border-t border-zinc-700 flex gap-3">
                <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold">
                  Approve
                </button>
                <button className="px-4 py-2 bg-zinc-700 hover:bg-zinc-700 text-zinc-100 rounded-lg text-sm font-bold">
                  View Details
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
