'use client';

// Extracted from page.tsx — verify imports

const DEFAULT_CHAIN_ID = 8453;
const TX_EXPLORER_BY_CHAIN: Record<number, string> = {
  1: 'https://etherscan.io',
  8453: 'https://basescan.org',
  11155111: 'https://sepolia.etherscan.io',
  84532: 'https://sepolia.basescan.org',
};

function getTxExplorerUrl(txHash: string, chainId: number = DEFAULT_CHAIN_ID): string {
  const explorerBase = TX_EXPLORER_BY_CHAIN[chainId] ?? TX_EXPLORER_BY_CHAIN[DEFAULT_CHAIN_ID];
  return `${explorerBase}/tx/${txHash}`;
}

export function HistoryTab() {
  const history = [
    { type: 'disbursement', charity: 'Save the Children', amount: 5000, date: '2025-12-15', txHash: '0x1234...5678', chainId: 8453 },
    { type: 'donation', donor: '0xABC...123', amount: 1000, date: '2025-12-14', txHash: '0x2345...6789', chainId: 8453 },
    { type: 'fee_deposit', source: 'Transaction Fees', amount: 2500, date: '2025-12-13', txHash: '0x3456...7890', chainId: 8453 },
    { type: 'disbursement', charity: 'Ocean Cleanup', amount: 4000, date: '2025-12-10', txHash: '0x4567...8901', chainId: 8453 },
    { type: 'donation', donor: '0xDEF...456', amount: 500, date: '2025-12-08', txHash: '0x5678...9012', chainId: 8453 },
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
                      href={getTxExplorerUrl(tx.txHash, tx.chainId)}
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
