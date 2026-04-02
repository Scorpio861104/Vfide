'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function HistoryTab() {
  const history = [
    { type: 'disbursement', charity: 'Save the Children', amount: 5000, date: '2025-12-15', txHash: '0x1234...5678' },
    { type: 'donation', donor: '0xABC...123', amount: 1000, date: '2025-12-14', txHash: '0x2345...6789' },
    { type: 'fee_deposit', source: 'Transaction Fees', amount: 2500, date: '2025-12-13', txHash: '0x3456...7890' },
    { type: 'disbursement', charity: 'Ocean Cleanup', amount: 4000, date: '2025-12-10', txHash: '0x4567...8901' },
    { type: 'donation', donor: '0xDEF...456', amount: 500, date: '2025-12-08', txHash: '0x5678...9012' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-100">Transaction History</h2>

      <div className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-900">
                <th className="text-left text-zinc-400 text-sm font-medium px-6 py-4">Type</th>
                <th className="text-left text-zinc-400 text-sm font-medium px-6 py-4">Details</th>
                <th className="text-right text-zinc-400 text-sm font-medium px-6 py-4">Amount</th>
                <th className="text-left text-zinc-400 text-sm font-medium px-6 py-4">Date</th>
                <th className="text-left text-zinc-400 text-sm font-medium px-6 py-4">Tx</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3A3A3F]">
              {history.map((tx, idx) => (
                <tr key={idx} className="hover:bg-zinc-900/50">
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      tx.type === 'disbursement' ? 'bg-green-500/20 text-green-400' :
                      tx.type === 'donation' ? 'bg-pink-500/20 text-pink-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {tx.type.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-zinc-100">
                    {tx.type === 'disbursement' ? `To: ${tx.charity}` :
                     tx.type === 'donation' ? `From: ${tx.donor}` :
                     tx.source}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={tx.type === 'disbursement' ? 'text-red-400' : 'text-green-400'}>
                      {tx.type === 'disbursement' ? '-' : '+'}{tx.amount.toLocaleString()} VFIDE
                    </span>
                  </td>
                  <td className="px-6 py-4 text-zinc-400">{tx.date}</td>
                  <td className="px-6 py-4">
                    <a 
                      href={`https://basescan.org/tx/${tx.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline text-sm"
                    >
                      {tx.txHash}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
